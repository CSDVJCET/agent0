"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function isTTSSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export interface UseTTSReturn {
  isSpeaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
}

export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!isTTSSupported()) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isTTSSupported()) return;
      if (!text.trim()) return;

      // Cancel any currently playing speech
      window.speechSynthesis.cancel();
      utteranceRef.current = null;

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        utteranceRef.current = null;
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        utteranceRef.current = null;
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    []
  );

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (isTTSSupported()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { isSpeaking, speak, stop };
}
