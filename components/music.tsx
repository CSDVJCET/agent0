"use client";

import { useMediaControl } from "@/hooks/use-media-control";
import { useState, useEffect } from "react";

// ── Site metadata ──────────────────────────────────────────────
const SITE_META: Record<string, { label: string; color: string }> = {
  youtube:    { label: "YouTube",    color: "#FF0000" },
  ytmusic:    { label: "YT Music",   color: "#FF0000" },
  spotify:    { label: "Spotify",    color: "#1DB954" },
  soundcloud: { label: "SoundCloud", color: "#FF5500" },
  netflix:    { label: "Netflix",    color: "#E50914" },
  applemusic: { label: "Apple Music",color: "#FC3C44" },
  generic:    { label: "Media",      color: "#888" },
};

// ── Icon helpers ───────────────────────────────────────────────
function PrevIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="rgba(40,25,10,0.85)" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="5" x2="5" y2="19" />
      <polygon points="19 4 9 12 19 20 19 4" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="rgba(40,25,10,0.85)" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(40,25,10,0.85)">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(40,25,10,0.85)">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────
export function Music({ className }: { className?: string }) {
  const {
    hasMedia,
    isPlaying,
    title,
    progress,
    isRemote,
    extensionConnected,
    site,
    artworkUrl,
    handlePlayPause,
    handleNext,
  } = useMediaControl();

  const [imgError, setImgError] = useState(false);
  // Reset error flag when the artwork URL changes (new track)
  useEffect(() => { setImgError(false); }, [artworkUrl]);
  const fallbackThumb = "/assets/imgImage113.png";
  const displayArt = !imgError && artworkUrl ? artworkUrl : fallbackThumb;
  const siteMeta = SITE_META[site] || SITE_META.generic;
  const displayTitle = title || (hasMedia ? "Media" : null);

  // Reset error state when artworkUrl changes
  const handleImgError = () => setImgError(true);

  // ── Active media state ─────────────────────────────────────────
  return (
    <div className={className || "relative w-[420px] h-[180px]"} data-name="Music">
      {/* Above-card row: status when idle, track title when playing */}
      <div className="absolute -top-7 left-0 right-0 flex items-center justify-center gap-2 px-2">
        {!hasMedia ? (
          /* Status message — shown above card when no media is playing */
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: extensionConnected ? "#1DB954" : "#888",
                boxShadow: extensionConnected ? "0 0 4px #1DB954" : "none",
              }}
            />
            <span className="text-[11px] text-muted-foreground/60">
              {extensionConnected
                ? "Extension connected · waiting for media"
                : "Install the Agent0 extension to enable cross-tab control"}
            </span>
          </div>
        ) : (
          /* Track title + site badge + remote dot when media is active */
          <>
            {isRemote && site && site !== "generic" && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: siteMeta.color + "22",
                  color: siteMeta.color,
                  border: `1px solid ${siteMeta.color}44`,
                }}
              >
                {siteMeta.label}
              </span>
            )}
            {displayTitle && (
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[280px]">
                {displayTitle}
              </span>
            )}
            {isRemote && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                title="Controlling another tab"
                style={{ background: "#1DB954", boxShadow: "0 0 4px #1DB954" }}
              />
            )}
          </>
        )}
      </div>

      {/* Card */}
      <div className="absolute inset-0 rounded-[28px] border-[3px] border-[#fdefe4] overflow-hidden shadow-[7px_9px_12px_0px_rgba(0,0,0,0.35)]">
        {/* Blurred background */}
        <img
          alt=""
          className="absolute w-[106%] h-[130%] -top-[4%] -left-[3%] object-cover blur-[6px] scale-105"
          src={displayArt}
          onError={handleImgError}
        />
        <div className="absolute inset-0 shadow-[inset_0px_4px_8px_0px_rgba(0,0,0,0.3)]" />

        {/* Controls — next | play/pause */}
        <div className="absolute inset-0 flex items-center px-7 gap-5">
          {/* Next — same size as play/pause */}
          <button
            onClick={handleNext}
            className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[rgba(200,170,120,0.25)] backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.25)] cursor-pointer flex-shrink-0 transition-transform active:scale-95 hover:bg-[rgba(200,170,120,0.4)]"
            aria-label="Next track"
          >
            <NextIcon />
          </button>

          {/* Play / Pause — with circular progress ring */}
          <button
            onClick={handlePlayPause}
            className="relative flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[rgba(200,165,110,0.45)] backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.25)] cursor-pointer flex-shrink-0 transition-transform active:scale-95 hover:bg-[rgba(200,165,110,0.6)]"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 72 72"
              fill="none"
            >
              <circle cx="36" cy="36" r="33" stroke="rgba(80,60,40,0.25)" strokeWidth="3" />
              <circle
                cx="36" cy="36" r="33"
                stroke="rgba(80,60,40,0.75)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 33}`}
                strokeDashoffset={`${2 * Math.PI * 33 * (1 - progress)}`}
                style={{ transition: "stroke-dashoffset 0.25s linear" }}
              />
            </svg>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>

        {/* Album art — right side */}
        <div
          className="absolute top-[14px] bottom-[14px] right-[14px] rounded-[18px] border-[1.5px] border-[#d5edff] shadow-[5px_7px_8px_0px_rgba(0,0,0,0.3)] overflow-hidden bg-[rgba(217,217,217,0.1)]"
          style={{ aspectRatio: "1/1" }}
        >
          <div className="absolute inset-[-1.5px] pointer-events-none rounded-[inherit] shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Album Cover"
            className="w-full h-full object-cover rounded-[17px]"
            src={displayArt}
            onError={handleImgError}
          />
        </div>
      </div>
    </div>
  );
}


