"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MicIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  addEventListener(type: "result", listener: (ev: Event) => void): void;
  addEventListener(type: "error", listener: (ev: Event) => void): void;
  addEventListener(type: "end", listener: (ev: Event) => void): void;
  removeEventListener(type: "result", listener: (ev: Event) => void): void;
  removeEventListener(type: "error", listener: (ev: Event) => void): void;
  removeEventListener(type: "end", listener: (ev: Event) => void): void;
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

function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

function getSpeechRecognitionConstructor() {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function Voice({ className }: { className?: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>("");

  const canUseMic = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof AudioContext !== "undefined"
    );
  }, []);

  const stopAll = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      analyserRef.current = null;
      dataRef.current = null;

      // Close in background; ignore errors
      void ctx.close().catch(() => undefined);
    }

    setIsRecording(false);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const analyser = analyserRef.current;
    const data = dataRef.current;

    if (!canvas || !wrapper || !analyser || !data) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1;
    const nextCanvasWidth = Math.floor(width * dpr);
    const nextCanvasHeight = Math.floor(height * dpr);

    if (canvas.width !== nextCanvasWidth || canvas.height !== nextCanvasHeight) {
      canvas.width = nextCanvasWidth;
      canvas.height = nextCanvasHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(wrapper);
    const bg = styles.backgroundColor;
    const dot = styles.color;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    analyser.getByteTimeDomainData(data as unknown as Uint8Array<ArrayBuffer>);

    // Dotted waveform rendering
    const centerY = height / 2;
    const dotRadius = 2;
    const dotStepX = 8;
    const dotStepY = 8;

    const cols = Math.max(8, Math.floor(width / dotStepX));
    const maxDots = Math.max(1, Math.floor((height / 2 - dotRadius) / dotStepY));

    ctx.fillStyle = dot;

    for (let col = 0; col < cols; col += 1) {
      const x = Math.floor((col + 0.5) * dotStepX);
      const sampleIndex = Math.floor((col / cols) * (data.length - 1));
      const normalized = (data[sampleIndex]! - 128) / 128;
      const amplitude = Math.abs(normalized);

      const level = clamp(Math.round(amplitude * maxDots), 0, maxDots);

      // Baseline dot
      ctx.beginPath();
      ctx.arc(x, centerY, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      for (let j = 1; j <= level; j += 1) {
        const yUp = centerY - j * dotStepY;
        const yDown = centerY + j * dotStepY;

        ctx.beginPath();
        ctx.arc(x, yUp, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, yDown, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  const start = useCallback(async () => {
    setErrorText(null);

    if (!canUseMic) {
      setErrorText("Microphone APIs are not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);

      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.fftSize);

      // Start speech recognition (optional)
      if (isSpeechRecognitionSupported()) {
        const Ctor = getSpeechRecognitionConstructor();
        if (Ctor) {
          const recognition = new Ctor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          finalTranscriptRef.current = "";

          const handleResult = (event: Event) => {
            const speechEvent = event as SpeechRecognitionEvent;
            let interim = "";

            for (
              let i = speechEvent.resultIndex;
              i < speechEvent.results.length;
              i += 1
            ) {
              const result = speechEvent.results[i];
              const text = result[0]?.transcript ?? "";
              if (!text) continue;

              if (result.isFinal) {
                const needsSpace = finalTranscriptRef.current.length > 0;
                finalTranscriptRef.current += (needsSpace ? " " : "") + text;
              } else {
                interim += text;
              }
            }

            const combined = `${finalTranscriptRef.current}${interim ? ` ${interim}` : ""}`.trim();
            setTranscript(combined);
          };

          const handleError = (event: Event) => {
            const err = event as SpeechRecognitionErrorEvent;
            // Don’t hard-fail recording; just surface the info.
            setErrorText(`Speech recognition error: ${err.error}`);
          };

          const handleEnd = () => {
            // If the user is still recording, don’t auto-restart; just stop updating transcript.
          };

          recognition.addEventListener("result", handleResult);
          recognition.addEventListener("error", handleError);
          recognition.addEventListener("end", handleEnd);

          recognitionRef.current = recognition;

          try {
            recognition.start();
          } catch {
            // ignore: recognition may fail depending on permissions
          }
        }
      }

      setIsRecording(true);
      rafRef.current = requestAnimationFrame(draw);
    } catch (error) {
      stopAll();
      const message =
        error instanceof Error ? error.message : "Failed to access microphone.";
      setErrorText(message);
    }
  }, [canUseMic, draw, stopAll]);

  const toggle = useCallback(() => {
    if (isRecording) {
      stopAll();
    } else {
      void start();
    }
  }, [isRecording, start, stopAll]);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return (
    <div className={cn("mx-auto w-full max-w-3xl px-4 py-10", className)}>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Voice</h1>
          <p className="text-sm text-muted-foreground">
            Start recording to see a live waveform. If your browser supports it,
            speech-to-text will also appear below.
          </p>
        </div>

        <div
          ref={wrapperRef}
          className={cn(
            "relative overflow-hidden rounded-2xl",
            "bg-foreground text-background",
            "border border-border"
          )}
          style={{ height: 180 }}
        >
          <canvas ref={canvasRef} className="block" />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={toggle} type="button" className="gap-2">
            {isRecording ? (
              <>
                <SquareIcon className="size-4" /> Stop
              </>
            ) : (
              <>
                <MicIcon className="size-4" /> Record
              </>
            )}
          </Button>

          {!canUseMic && (
            <span className="text-sm text-muted-foreground">
              Microphone not available in this environment.
            </span>
          )}
        </div>

        {errorText && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            {errorText}
          </div>
        )}

        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm font-medium mb-2">Transcript</div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words min-h-12">
            {transcript || "(no transcript yet)"}
          </div>
        </div>
      </div>
    </div>
  );
}
