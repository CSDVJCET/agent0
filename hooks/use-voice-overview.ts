"use client";

import { useCallback, useRef, useState } from "react";

const OVERVIEW_LOCATION_KEY = "agent0-overview-location";

export interface UseVoiceOverviewReturn {
  isLoading: boolean;
  isPlaying: boolean;
  script: string | null;
  error: string | null;
  location: string;
  setLocation: (loc: string) => void;
  playOverview: () => Promise<void>;
  stopOverview: () => void;
}

export function useVoiceOverview(): UseVoiceOverviewReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialise location from localStorage (if available)
  const [location, setLocationState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(OVERVIEW_LOCATION_KEY) ?? "";
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const setLocation = useCallback((loc: string) => {
    setLocationState(loc);
    if (typeof window !== "undefined") {
      localStorage.setItem(OVERVIEW_LOCATION_KEY, loc);
    }
  }, []);

  const stopOverview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playOverview = useCallback(async () => {
    if (!location.trim()) return;
    if (isLoading) return;

    // Stop any currently playing audio
    stopOverview();
    setError(null);
    setScript(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/voice/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `Request failed: ${res.statusText}`);
      }

      const data = await res.json() as { audio: string; mimeType: string; script: string };

      setScript(data.script);

      // Decode base64 audio and create a Blob URL for playback
      const binaryStr = atob(data.audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setError("Audio playback failed.");
      };

      setIsLoading(false);
      setIsPlaying(true);
      await audio.play();
    } catch (err) {
      setIsLoading(false);
      setIsPlaying(false);
      setError(err instanceof Error ? err.message : "Failed to generate overview.");
    }
  }, [location, isLoading, stopOverview]);

  return { isLoading, isPlaying, script, error, location, setLocation, playOverview, stopOverview };
}
