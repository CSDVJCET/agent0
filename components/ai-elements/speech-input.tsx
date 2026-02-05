"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { MicIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

type SpeechInputMode = "speech-recognition" | "media-recorder" | "none";

export type SpeechInputProps = ComponentProps<typeof Button> & {
  onTranscriptionChange?: (text: string) => void;
  /**
   * Callback for when audio is recorded using MediaRecorder fallback.
   * This is called in browsers that don't support the Web Speech API (Firefox, Safari).
   * The callback receives an audio Blob that should be sent to a transcription service.
   * Return the transcribed text, which will be passed to onTranscriptionChange.
   */
  onAudioRecorded?: (audioBlob: Blob) => Promise<string>;
  lang?: string;
};

const detectSpeechInputMode = (): SpeechInputMode => {
  if (typeof window === "undefined") {
    return "none";
  }

  if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
    return "speech-recognition";
  }

  if ("MediaRecorder" in window && "mediaDevices" in navigator) {
    return "media-recorder";
  }

  return "none";
};

export const SpeechInput = ({
  className,
  onTranscriptionChange,
  onAudioRecorded,
  lang = "en-US",
  ...props
}: SpeechInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<SpeechInputMode>("none");
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null
  );
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const accumulatedTranscriptRef = useRef<string>("");

  // Detect mode on mount
  useEffect(() => {
    setMode(detectSpeechInputMode());
  }, []);

  // Initialize Speech Recognition when mode is speech-recognition
  useEffect(() => {
    if (mode !== "speech-recognition") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechRecognition = new SpeechRecognition();

    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = lang;

    const handleStart = () => {
      setIsListening(true);
      accumulatedTranscriptRef.current = "";
    };

    const handleEnd = () => {
      setIsListening(false);
      
      // Send accumulated transcript if recognition stopped naturally (timeout, error, etc.)
      // Skip if already cleared by manual stop in toggleListening
      const finalText = accumulatedTranscriptRef.current.trim();
      if (finalText) {
        onTranscriptionChange?.(finalText);
        accumulatedTranscriptRef.current = "";
      }
    };

    const handleResult = (event: Event) => {
      const speechEvent = event as SpeechRecognitionEvent;
      let finalTranscript = "";

      for (
        let i = speechEvent.resultIndex;
        i < speechEvent.results.length;
        i += 1
      ) {
        const result = speechEvent.results[i];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript ?? "";
        }
      }

      // Accumulate transcripts instead of sending immediately
      if (finalTranscript) {
        const needsSpace = accumulatedTranscriptRef.current.length > 0;
        accumulatedTranscriptRef.current += (needsSpace ? " " : "") + finalTranscript;
      }
    };

    const handleError = (event: Event) => {
      const errorEvent = event as SpeechRecognitionErrorEvent;
      console.error("Speech recognition error:", errorEvent.error);
      setIsListening(false);
      accumulatedTranscriptRef.current = "";
    };

    speechRecognition.addEventListener("start", handleStart);
    speechRecognition.addEventListener("end", handleEnd);
    speechRecognition.addEventListener("result", handleResult);
    speechRecognition.addEventListener("error", handleError);

    recognitionRef.current = speechRecognition;
    setRecognition(speechRecognition);

    return () => {
      speechRecognition.removeEventListener("start", handleStart);
      speechRecognition.removeEventListener("end", handleEnd);
      speechRecognition.removeEventListener("result", handleResult);
      speechRecognition.removeEventListener("error", handleError);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [mode, onTranscriptionChange, lang]);

  // Start MediaRecorder recording
  const startMediaRecorder = useCallback(async () => {
    if (!onAudioRecorded) {
      console.warn(
        "SpeechInput: onAudioRecorded callback is required for MediaRecorder fallback"
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      accumulatedTranscriptRef.current = "";

      const handleDataAvailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      const handleStop = async () => {
        for (const track of stream.getTracks()) {
          track.stop();
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        if (audioBlob.size > 0) {
          setIsProcessing(true);
          try {
            const transcript = await onAudioRecorded(audioBlob);
            if (transcript) {
              onTranscriptionChange?.(transcript);
            }
          } catch (error) {
            console.error("Transcription error:", error);
          } finally {
            setIsProcessing(false);
          }
        }
      };

      const handleError = (event: Event) => {
        console.error("MediaRecorder error:", event);
        setIsListening(false);
        for (const track of stream.getTracks()) {
          track.stop();
        }
      };

      mediaRecorder.addEventListener("dataavailable", handleDataAvailable);
      mediaRecorder.addEventListener("stop", handleStop);
      mediaRecorder.addEventListener("error", handleError);

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start MediaRecorder:", error);
      setIsListening(false);
    }
  }, [onAudioRecorded, onTranscriptionChange]);

  // Stop MediaRecorder recording
  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (mode === "speech-recognition" && recognition) {
      if (isListening) {
        // Immediately update UI state, then stop recognition
        setIsListening(false);
        try {
          recognition.stop();
        } catch (error) {
          console.error("Error stopping speech recognition:", error);
        }
        
        // Send accumulated transcript immediately
        const finalText = accumulatedTranscriptRef.current.trim();
        if (finalText) {
          onTranscriptionChange?.(finalText);
        }
        accumulatedTranscriptRef.current = "";
      } else {
        // Prevent starting if already listening
        if (isListening) return;
        
        try {
          recognition.start();
          // State will be set by handleStart event
        } catch (error) {
          console.error("Error starting speech recognition:", error);
          setIsListening(false);
        }
      }
    } else if (mode === "media-recorder") {
      if (isListening) {
        stopMediaRecorder();
      } else {
        startMediaRecorder();
      }
    }
  }, [mode, recognition, isListening, startMediaRecorder, stopMediaRecorder, onTranscriptionChange]);

  // Determine if button should be disabled
  const isDisabled =
    mode === "none" ||
    (mode === "speech-recognition" && !recognition) ||
    (mode === "media-recorder" && !onAudioRecorded) ||
    isProcessing;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Animated pulse rings */}
      {isListening &&
        [0, 1, 2].map((index) => (
          <div
            className="absolute inset-0 rounded-full border-2 border-red-400/30 motion-safe:animate-ping"
            key={index}
            style={{
              animationDelay: `${index * 0.3}s`,
              animationDuration: "2s",
            }}
          />
        ))}

      {/* Main record button */}
      <Button
        aria-label={
          isProcessing
            ? "Processing audio"
            : isListening
              ? "Stop recording"
              : "Start voice input"
        }
        className={cn(
          "relative z-10 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isListening
            ? "bg-destructive text-white hover:bg-destructive/80 hover:text-white"
            : "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground",
          className
        )}
        disabled={isDisabled}
        onClick={toggleListening}
        type="button"
        {...props}
      >
        {isProcessing && <Spinner />}
        {!isProcessing && isListening && <SquareIcon className="size-4" />}
        {!(isProcessing || isListening) && <MicIcon className="size-4" />}
      </Button>
    </div>
  );
};
