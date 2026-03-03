"use client";

import { useMediaControl } from "@/hooks/use-media-control";

export function Music({ className }: { className?: string }) {
  // DOM-based media detection & control (current tab only, no extension)
  const {
    hasMedia,
    isPlaying,
    title,
    progress,
    isRemote,
    extensionConnected,
    handlePlayPause,
    handleNext,
  } = useMediaControl();

  const fallbackThumb = "/assets/imgImage113.png";
  const displayTitle = title || (hasMedia ? "Media" : null);

  return (
    <div
      className={className || "relative w-[420px] h-[180px]"}
      data-name="Music"
    >
      {/* Media title */}
      {displayTitle && (
        <div className="absolute -top-7 left-0 right-0 text-xs text-center text-muted-foreground font-medium truncate px-2">
          {displayTitle}
        </div>
      )}
      {/* Card — clips everything inside to the rounded rectangle */}
      <div className="absolute inset-0 rounded-[28px] border-[3px] border-[#fdefe4] overflow-hidden shadow-[7px_9px_12px_0px_rgba(0,0,0,0.35)]">
        {/* Blurred background image */}
        <img
          alt=""
          className="absolute w-[106%] h-[130%] -top-[4%] -left-[3%] object-cover blur-[6px] scale-105"
          src={fallbackThumb}
        />
        {/* Inner shadow overlay */}
        <div className="absolute inset-0 shadow-[inset_0px_4px_8px_0px_rgba(0,0,0,0.3)]" />

        {/* Controls — sit on top of blurred bg, inside the card */}
        <div className="absolute inset-0 flex items-center px-7 gap-5">
          {/* Skip-forward button — no progress ring */}
          <button
            onClick={handleNext}
            className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[rgba(200,170,120,0.25)] backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.25)] cursor-pointer flex-shrink-0 transition-transform active:scale-95"
            aria-label="Next track"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(40,25,10,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>

          {/* Play / Pause button — with circular progress ring */}
          <button
            onClick={handlePlayPause}
            className="relative flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[rgba(200,165,110,0.45)] backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.25)] cursor-pointer flex-shrink-0 transition-transform active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {/* Circular progress ring */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 72 72"
              fill="none"
            >
              {/* Track */}
              <circle
                cx="36" cy="36" r="33"
                stroke="rgba(80,60,40,0.25)"
                strokeWidth="3"
              />
              {/* Progress arc */}
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
            {isPlaying ? (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(40,25,10,0.85)">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(40,25,10,0.85)">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
        </div>

        {/* Album art — right side, inside the card */}
        <div
          className="absolute top-[14px] bottom-[14px] right-[14px] rounded-[18px] border-[1.5px] border-[#d5edff] shadow-[5px_7px_8px_0px_rgba(0,0,0,0.3)] overflow-hidden bg-[rgba(217,217,217,0.1)]"
          style={{ aspectRatio: "1/1" }}
        >
          <div className="absolute inset-[-1.5px] pointer-events-none rounded-[inherit] shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
          <img
            alt="Album Cover"
            className="w-full h-full object-cover rounded-[17px]"
            src={fallbackThumb}
          />
        </div>
      </div>
    </div>
  );
}

