"use client";

import { Music } from "@/components/music";

export function MCPageClient() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6">
      {/* ── Media Control Widget ─────────────────────────── */}
      <Music />

      {/* ── Instructions ────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 mt-2 max-w-sm">
        <p className="text-[11px] text-muted-foreground/40 text-center leading-relaxed">
          Play media in any tab (YouTube, Spotify, YT Music, etc.)
          <br />
          and control it from here using the Agent0 extension.
        </p>
      </div>
    </div>
  );
}
