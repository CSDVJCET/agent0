"use client";

import { cn } from "@/lib/utils";
import { Star, Clock, Calendar, Film } from "lucide-react";
import Image from "next/image";

interface MovieCardProps {
  title: string;
  releaseYear: number | null;
  runtime: number | null;
  genres: string[];
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number | null;
  voteCount: number;
  tagline?: string | null;
  error?: boolean;
  message?: string;
}

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getRatingColor(rating: number): string {
  if (rating >= 7.5) return "text-green-400";
  if (rating >= 6) return "text-yellow-400";
  if (rating >= 4) return "text-orange-400";
  return "text-red-400";
}

export function MovieCard({
  title,
  releaseYear,
  runtime,
  genres,
  overview,
  posterUrl,
  backdropUrl,
  rating,
  voteCount,
  tagline,
  error,
  message,
}: MovieCardProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 my-2">
        <div className="flex items-center gap-2 mb-1">
          <Film className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Movie not found</span>
        </div>
        <p className="text-amber-600 dark:text-amber-400 text-sm">
          {message || "Could not fetch movie information."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden my-3 shadow-sm hover:shadow-md transition-shadow",
        "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-700/60"
      )}
    >
      {/* Backdrop header */}
      {backdropUrl && (
        <div className="relative w-full h-36 overflow-hidden">
          <Image
            src={backdropUrl}
            alt={`${title} backdrop`}
            fill
            className="object-cover object-top"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-900" />
        </div>
      )}

      <div className={cn("flex gap-4 p-4", backdropUrl && "-mt-12 relative z-10")}>
        {/* Poster */}
        {posterUrl && (
          <div className="shrink-0 w-28 h-[168px] rounded-lg overflow-hidden shadow-lg border border-slate-600/40">
            <Image
              src={posterUrl}
              alt={`${title} poster`}
              width={112}
              height={168}
              className="object-cover w-full h-full"
              unoptimized
            />
          </div>
        )}

        {/* Details */}
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          {/* Title */}
          <h3 className="font-bold text-lg text-white leading-tight truncate">
            {title}
            {releaseYear && (
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({releaseYear})
              </span>
            )}
          </h3>

          {/* Tagline */}
          {tagline && (
            <p className="text-xs italic text-slate-400 -mt-1 truncate">
              &ldquo;{tagline}&rdquo;
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {rating !== null && (
              <span className="flex items-center gap-1">
                <Star className={cn("h-3.5 w-3.5 fill-current", getRatingColor(rating))} />
                <span className={cn("font-semibold", getRatingColor(rating))}>
                  {rating}
                </span>
                <span className="text-slate-500">({voteCount.toLocaleString()})</span>
              </span>
            )}
            {runtime !== null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatRuntime(runtime)}
              </span>
            )}
            {releaseYear && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {releaseYear}
              </span>
            )}
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/40"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mt-1">
            {overview}
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading state
export function MovieCardLoading({ title }: { title?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden my-3 animate-pulse",
        "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-700/60"
      )}
    >
      <div className="flex gap-4 p-4">
        <div className="shrink-0 w-28 h-[168px] rounded-lg bg-slate-700/50" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-400">
              {title ? `Searching for "${title}"...` : "Searching for movie..."}
            </span>
          </div>
          <div className="h-4 w-3/4 bg-slate-700/50 rounded" />
          <div className="h-3 w-1/2 bg-slate-700/50 rounded" />
          <div className="h-3 w-full bg-slate-700/50 rounded mt-2" />
          <div className="h-3 w-5/6 bg-slate-700/50 rounded" />
        </div>
      </div>
    </div>
  );
}
