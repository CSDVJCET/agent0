"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface MediaControlState {
  /** Whether any media element exists (local or remote) */
  hasMedia: boolean;
  /** Whether the active media is currently playing */
  isPlaying: boolean;
  /** "video" or "audio" */
  type: "video" | "audio";
  /** Best-effort title */
  title: string;
  /** Duration in seconds */
  duration: number;
  /** Current playback position in seconds */
  currentTime: number;
  /** 0–1 normalised progress */
  progress: number;
  /** Whether the media is from another tab via extension */
  isRemote: boolean;
  /** Whether the browser extension is detected */
  extensionConnected: boolean;
  /** Detected site: 'youtube' | 'ytmusic' | 'spotify' | 'soundcloud' | 'generic' etc. */
  site: string;
  /** Resolved artwork URL (YouTube thumbnail, etc.) or empty string */
  artworkUrl: string;
  /** Full URL of the tab playing media (used for artwork derivation) */
  pageUrl: string;
}

const INITIAL_STATE: MediaControlState = {
  hasMedia: false,
  isPlaying: false,
  type: "audio",
  title: "",
  duration: 0,
  currentTime: 0,
  progress: 0,
  isRemote: false,
  extensionConnected: false,
  site: "",
  artworkUrl: "",
  pageUrl: "",
};

/** Derive an artwork URL from the remote state if possible. */
function deriveArtworkUrl(site: string, pageUrl: string): string {
  if (site === "youtube" && pageUrl) {
    const match = pageUrl.match(/[?&]v=([^&]+)/);
    if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  if (site === "ytmusic" && pageUrl) {
    // YT Music uses the same video-id param
    const match = pageUrl.match(/[?&]v=([^&]+)/);
    if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  return "";
}

// Media event names we listen to on the active local element
const MEDIA_EVENTS = [
  "play",
  "pause",
  "timeupdate",
  "ended",
  "loadedmetadata",
  "durationchange",
  "seeked",
] as const;

/**
 * Derives a human-readable title from a local media element.
 */
function deriveTitle(el: HTMLMediaElement): string {
  if (el.title) return el.title;
  const label = el.getAttribute("aria-label");
  if (label) return label;
  const src = el.currentSrc || el.src;
  if (src) {
    try {
      const pathname = new URL(src, window.location.href).pathname;
      const filename = pathname.split("/").pop();
      if (filename && filename !== "/") return decodeURIComponent(filename);
    } catch {
      // invalid URL – fall through
    }
  }
  return el.tagName === "VIDEO" ? "Video" : "Audio";
}

/** Remote media state shape sent by the extension */
interface RemoteMediaState {
  hasMedia: boolean;
  isPlaying: boolean;
  type: "video" | "audio";
  title: string;
  site?: string;
  src?: string;
  pageUrl?: string;
  duration: number;
  currentTime: number;
}

/**
 * Hook that provides unified media control for:
 * 1. Local media — <audio>/<video> in the current page
 * 2. Remote media — playing in another tab, relayed via Agent0 extension
 *
 * Remote media takes priority when available (since the /mc page is
 * a dedicated control surface for cross-tab media).
 */
export function useMediaControl() {
  // ── local media refs ─────────────────────────────────────────
  const mediaListRef = useRef<HTMLMediaElement[]>([]);
  const activeElRef = useRef<HTMLMediaElement | null>(null);
  const activeIndexRef = useRef<number>(-1);

  // ── remote media ref ─────────────────────────────────────────
  const remoteStateRef = useRef<RemoteMediaState | null>(null);

  // ── UI state ─────────────────────────────────────────────────
  const [state, setState] = useState<MediaControlState>(INITIAL_STATE);

  // Track whether we have remote media (from another tab via extension)
  const [hasRemote, setHasRemote] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);

  // ── sync local media state into React ────────────────────────
  const syncLocalState = useCallback(() => {
    // If remote media is active, don't overwrite with local state
    if (remoteStateRef.current?.hasMedia && remoteStateRef.current?.isPlaying) {
      return;
    }
    const el = activeElRef.current;
    if (!el) {
      // Only reset if no remote media either
      if (!remoteStateRef.current?.hasMedia) {
        setState((prev) => ({
          ...INITIAL_STATE,
          extensionConnected: prev.extensionConnected,
        }));
      }
      return;
    }
    const duration = Number.isFinite(el.duration) ? el.duration : 0;
    const currentTime = Number.isFinite(el.currentTime) ? el.currentTime : 0;
    setState((prev) => ({
      hasMedia: true,
      isPlaying: !el.paused,
      type: el.tagName === "VIDEO" ? "video" : "audio",
      title: deriveTitle(el),
      duration,
      currentTime,
      progress: duration > 0 ? currentTime / duration : 0,
      isRemote: false,
      extensionConnected: prev.extensionConnected,
      site: "",
      artworkUrl: "",
      pageUrl: "",
    }));
  }, []);

  // ── local media listeners ────────────────────────────────────
  const detachListeners = useCallback(() => {
    const el = activeElRef.current;
    if (!el) return;
    for (const evt of MEDIA_EVENTS) {
      el.removeEventListener(evt, syncLocalState);
    }
  }, [syncLocalState]);

  const setActiveByIndex = useCallback(
    (index: number) => {
      detachListeners();
      const el = mediaListRef.current[index] ?? null;
      activeIndexRef.current = el ? index : -1;
      activeElRef.current = el;
      if (!el) {
        if (!remoteStateRef.current?.hasMedia) {
          setState((prev) => ({
            ...INITIAL_STATE,
            extensionConnected: prev.extensionConnected,
          }));
        }
        return;
      }
      for (const evt of MEDIA_EVENTS) {
        el.addEventListener(evt, syncLocalState);
      }
      syncLocalState();
    },
    [syncLocalState, detachListeners],
  );

  // ── DOM scanning for local media ──────────────────────────────
  const scanMedia = useCallback(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLMediaElement>("video, audio"),
    );
    mediaListRef.current = elements;

    if (elements.length === 0) {
      activeIndexRef.current = -1;
      activeElRef.current = null;
      if (!remoteStateRef.current?.hasMedia) {
        setState((prev) => ({
          ...INITIAL_STATE,
          extensionConnected: prev.extensionConnected,
        }));
      }
      return;
    }

    const playingIdx = elements.findIndex((el) => !el.paused);
    if (playingIdx !== -1) {
      setActiveByIndex(playingIdx);
      return;
    }

    const prevEl = activeElRef.current;
    if (prevEl && elements.includes(prevEl)) {
      setActiveByIndex(elements.indexOf(prevEl));
      return;
    }

    setActiveByIndex(0);
  }, [setActiveByIndex]);

  // ── extension message listener (remote media) ────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data) return;

      if (event.data.type === "AGENT0_MEDIA_UPDATE") {
        const data = event.data.data as RemoteMediaState | null;
        remoteStateRef.current = data;

        if (data && data.hasMedia) {
          setHasRemote(true);
          setExtensionConnected(true);
          const duration =
            data.duration && Number.isFinite(data.duration) ? data.duration : 0;
          const currentTime =
            data.currentTime && Number.isFinite(data.currentTime)
              ? data.currentTime
              : 0;
          const site = data.site || "generic";
          const pageUrl = data.pageUrl || "";
          setState({
            hasMedia: true,
            isPlaying: data.isPlaying,
            type: data.type || "audio",
            title: data.title || "Media",
            duration,
            currentTime,
            progress: duration > 0 ? currentTime / duration : 0,
            isRemote: true,
            extensionConnected: true,
            site,
            artworkUrl: deriveArtworkUrl(site, pageUrl),
            pageUrl,
          });
        } else {
          setHasRemote(false);
          remoteStateRef.current = null;
          // Fall back to local media if available
          syncLocalState();
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Request current media state from extension on mount
    window.postMessage({ type: "AGENT0_REQUEST_MEDIA_STATE" }, "*");

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [syncLocalState]);

  // ── mount: local DOM scan + observers ─────────────────────────
  useEffect(() => {
    const initialTimer = setTimeout(() => scanMedia(), 0);

    const observer = new MutationObserver((mutations) => {
      const hasMediaChange = mutations.some((m) => {
        for (const node of Array.from(m.addedNodes)) {
          if (
            node instanceof HTMLMediaElement ||
            (node instanceof Element && node.querySelector("video, audio"))
          )
            return true;
        }
        for (const node of Array.from(m.removedNodes)) {
          if (
            node instanceof HTMLMediaElement ||
            (node instanceof Element && node.querySelector("video, audio"))
          )
            return true;
        }
        return false;
      });
      if (hasMediaChange) scanMedia();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const onGlobalPlay = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLMediaElement)) return;
      const idx = mediaListRef.current.indexOf(target);
      if (idx !== -1 && idx !== activeIndexRef.current) {
        setActiveByIndex(idx);
      } else if (idx === -1) {
        scanMedia();
      }
    };

    document.addEventListener("play", onGlobalPlay, true);

    return () => {
      clearTimeout(initialTimer);
      observer.disconnect();
      document.removeEventListener("play", onGlobalPlay, true);
      detachListeners();
    };
  }, [scanMedia, setActiveByIndex, detachListeners]);

  // ── controls ──────────────────────────────────────────────────

  /**
   * Send a media control command.
   * If remote media is active, relay via extension.
   * Otherwise, control local DOM media directly.
   */
  const sendRemoteCommand = useCallback((command: string) => {
    window.postMessage({ type: "AGENT0_SEND_MEDIA_CONTROL", command }, "*");
  }, []);

  const handlePlayPause = useCallback(() => {
    // If remote media is present, always send via extension
    if (remoteStateRef.current?.hasMedia) {
      const cmd = remoteStateRef.current.isPlaying ? "pause" : "play";
      sendRemoteCommand(cmd);
      // Optimistic update
      setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
      return;
    }

    // Local media
    const el = activeElRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [sendRemoteCommand]);

  const handleNext = useCallback(() => {
    // If remote media is present, send next via extension
    if (remoteStateRef.current?.hasMedia) {
      sendRemoteCommand("next");
      return;
    }

    // Local media
    const list = mediaListRef.current;
    if (list.length === 0) return;

    if (list.length === 1) {
      const el = list[0];
      el.currentTime = 0;
      el.play().catch(() => {});
      return;
    }

    const current = activeElRef.current;
    if (current) current.pause();

    const nextIdx = (activeIndexRef.current + 1) % list.length;
    setActiveByIndex(nextIdx);

    const next = list[nextIdx];
    if (next) {
      next.currentTime = 0;
      next.play().catch(() => {});
    }
  }, [sendRemoteCommand, setActiveByIndex]);

  const handlePrev = useCallback(() => {
    // If remote media is present, send prev via extension
    if (remoteStateRef.current?.hasMedia) {
      sendRemoteCommand("prev");
      return;
    }

    // Local media — seek to start or go to previous in list
    const list = mediaListRef.current;
    if (list.length === 0) return;

    const el = activeElRef.current;
    // If we're more than 3 s in, just restart current track
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
      return;
    }

    if (list.length === 1) {
      if (el) el.currentTime = 0;
      return;
    }

    if (el) el.pause();
    const prevIdx =
      (activeIndexRef.current - 1 + list.length) % list.length;
    setActiveByIndex(prevIdx);
    const prev = list[prevIdx];
    if (prev) {
      prev.currentTime = 0;
      prev.play().catch(() => {});
    }
  }, [sendRemoteCommand, setActiveByIndex]);

  return {
    ...state,
    hasRemote,
    extensionConnected,
    handlePlayPause,
    handleNext,
    handlePrev,
  };
}
