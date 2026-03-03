"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";

// Grid configuration
const COLS = 25;
const ROWS = 24;
const DOT_SIZE = 10;
const DOT_GAP = 0;
const CELL = DOT_SIZE + DOT_GAP; // 10px per cell — dots touch

// Returns amplitude (0..1) for a given column — wave is always centered
function waveAmplitude(col: number, time: number, cols: number): number {
  const x = col / cols;
  const a1 = Math.sin(x * Math.PI * 2.2 + time * 1.8) * 0.4;
  const a2 = Math.sin(x * Math.PI * 3.5 - time * 1.2) * 0.25;
  const a3 = Math.sin(x * Math.PI * 1.3 + time * 0.7) * 0.2;
  const a4 = Math.sin(x * Math.PI * 5.0 - time * 2.5) * 0.1;
  return Math.abs(a1 + a2 + a3 + a4); // 0..~0.95
}

export function AudioWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const centerY = h / 2;
    const maxAmplitude = (ROWS / 2) * CELL * 0.88;
    const time = timeRef.current;

    // Pad offsets to center the grid
    const gridW = COLS * CELL;
    const gridH = ROWS * CELL;
    const offsetX = (w - gridW) / 2 + DOT_SIZE / 2;
    const offsetY = (h - gridH) / 2 + DOT_SIZE / 2;

    for (let col = 0; col < COLS; col++) {
      // Amplitude for this column, measured symmetrically from center
      const amp = waveAmplitude(col, time, COLS) * maxAmplitude;

      for (let row = 0; row < ROWS; row++) {
        const cx = offsetX + col * CELL + DOT_SIZE / 2;
        const cy = offsetY + row * CELL + DOT_SIZE / 2;
        const distFromCenter = Math.abs(cy - centerY);

        const inside = distFromCenter <= amp;

        ctx.beginPath();
        ctx.arc(cx, cy, DOT_SIZE / 2, 0, Math.PI * 2);
        if (inside) {
          // White dot — part of the active soundwave shape
          ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        } else {
          // Grey dot — inactive background grid
          ctx.fillStyle = "rgba(0, 0, 0, 0.70)";
        }
        ctx.fill();
      }
    }

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const containerW = COLS * CELL + DOT_GAP;
    const containerH = ROWS * CELL + DOT_GAP;
    canvas.width = containerW * dpr;
    canvas.height = containerH * dpr;
    canvas.style.width = `${containerW}px`;
    canvas.style.height = `${containerH}px`;

    setIsReady(true);

    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      timeRef.current += dt;
      draw();
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div
      className={cn(
        "relative w-[306px] h-72 mx-auto flex items-center justify-center select-none rounded-[28px] overflow-hidden p-4"
      )}
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(40px) saturate(1.6)",
        WebkitBackdropFilter: "blur(40px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="relative w-full h-full rounded-[20px] flex items-center justify-center overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className={cn(
            "transition-opacity duration-500",
            isReady ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    </div>
  );
}