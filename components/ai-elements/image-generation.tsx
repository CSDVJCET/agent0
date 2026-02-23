"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { ImageIcon, DownloadIcon, SparklesIcon, ZoomInIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Grain canvas – draws TV-static noise and animates every frame
// ─────────────────────────────────────────────────────────────────────────────
function GrainCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;

      // Alternate between two noise "frequencies" for a shifting effect
      const shift = (frame % 3) * 0.15;

      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random();
        // Cool desaturated static tint (blue-gray)
        const v = noise * 180;
        data[i] = v * (0.18 + shift * 0.04);      // R
        data[i + 1] = v * (0.20 + shift * 0.02);  // G
        data[i + 2] = v * (0.30 + shift * 0.06);  // B
        // Varying alpha so grains "appear/disappear" rapidly
        data[i + 3] = Math.random() * 140 + 30;
      }

      ctx.putImageData(imageData, 0, 0);
      frame++;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={384}
      className={cn("absolute inset-0 w-full h-full", className)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Orbital ring – decorative spinning arc around the spark icon
// ─────────────────────────────────────────────────────────────────────────────
function OrbitalRing({ size = 64, clockwise = true, duration = 3 }: { size?: number; clockwise?: boolean; duration?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="absolute"
      animate={{ rotate: clockwise ? 360 : -360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke="url(#orbitGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="40 136"
      />
      <defs>
        <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shimmer bar – horizontal light sweep across the loading skeleton
// ─────────────────────────────────────────────────────────────────────────────
function ShimmerBar() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="absolute top-0 bottom-0 w-1/3"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
        }}
        initial={{ left: "-34%" }}
        animate={{ left: "134%" }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          repeatDelay: 0.6,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating particles – small dots drifting upward during generation
// ─────────────────────────────────────────────────────────────────────────────
function FloatingParticles() {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: 10 + i * 11,
    delay: i * 0.35,
    size: i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1.5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            bottom: "12%",
          }}
          animate={{
            y: [0, -80, -160],
            opacity: [0, 0.7, 0],
            x: [0, (p.id % 2 === 0 ? 1 : -1) * 12],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Waveform bars – audio-style bars that bounce during generation
// ─────────────────────────────────────────────────────────────────────────────
function WaveformBars() {
  const bars = [0.4, 0.7, 1, 0.85, 0.55, 0.9, 0.65, 0.45, 0.75, 0.5];
  return (
    <div className="flex items-end gap-[3px] h-5">
      {bars.map((amp, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-white/40"
          animate={{ scaleY: [amp * 0.4, amp, amp * 0.6, amp * 0.9, amp * 0.4] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.09,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "bottom", height: `${amp * 100}%` }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanlines overlay
// ─────────────────────────────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)",
        backgroundSize: "100% 4px",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading state
// ─────────────────────────────────────────────────────────────────────────────
export function ImageGenerationLoading({ prompt }: { prompt?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl",
        "border border-white/10 bg-zinc-950",
        "aspect-4/3 max-w-xl"
      )}
    >
      {/* Animated grain */}
      <GrainCanvas />

      {/* Scanlines */}
      <Scanlines />

      {/* Shimmer sweep */}
      <ShimmerBar />

      {/* Floating particles */}
      <FloatingParticles />

      {/* Subtle vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
        {/* Orbital icon */}
        <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
          <OrbitalRing size={64} duration={2.8} />
          <OrbitalRing size={48} duration={4} clockwise={false} />
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <SparklesIcon className="size-5 text-white/80" />
          </motion.div>
        </div>

        {/* Progress strip */}
        <div className="w-36 h-px bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-linear-to-r from-white/60 to-white/20 rounded-full"
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Prompt preview */}
        <AnimatePresence>
          {prompt && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ delay: 0.25, duration: 0.35 }}
              className="text-xs text-white/40 text-center max-w-[280px] font-mono leading-relaxed line-clamp-2"
            >
              &ldquo;{prompt}&rdquo;
            </motion.p>
          )}
        </AnimatePresence>

        {/* Waveform loader */}
        <WaveformBars />

        {/* Label */}
        <motion.span
          animate={{ opacity: [0.25, 0.65, 0.25] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="text-[10px] uppercase tracking-widest text-white/25 font-mono"
        >
          Generating…
        </motion.span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tilt card hook – 3-D perspective tilt following cursor
// ─────────────────────────────────────────────────────────────────────────────
function useTilt(strength = 12) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    rotateY.set(dx * strength);
    rotateX.set(-dy * strength);
  }

  function onMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return { springX, springY, onMouseMove, onMouseLeave };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox – full-screen image overlay on click
// ─────────────────────────────────────────────────────────────────────────────
function Lightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            src={src}
            alt={alt}
            className="relative z-10 max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Result – reveal animation + download
// ─────────────────────────────────────────────────────────────────────────────
export function ImageGenerationResult({
  imageId,
  imageUrl,
  mediaType,
  prompt,
  model,
  error,
  message: errorMessage,
}: {
  imageId?: string;
  imageUrl?: string;
  mediaType?: string;
  prompt?: string;
  model?: string;
  error?: boolean;
  message?: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { springX, springY, onMouseMove, onMouseLeave } = useTilt(6);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-400"
      >
        {errorMessage || "Image generation failed."}
      </motion.div>
    );
  }

  if (!mediaType) return null;

  const src = imageUrl || (imageId ? `/api/images/${encodeURIComponent(imageId)}` : null);
  if (!src) return null;

  const extension =
    mediaType === "image/png"
      ? "png"
      : mediaType === "image/jpeg"
      ? "jpg"
      : mediaType === "image/webp"
      ? "webp"
      : "bin";

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const responseType = response.headers.get("content-type") || mediaType;
      if (!responseType.startsWith("image/")) throw new Error("Not an image.");
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: responseType });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `generated-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Failed to download generated image", err);
    }
  };

  return (
    <>
      <Lightbox
        src={src}
        alt={prompt ?? "Generated image"}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          rotateX: springX,
          rotateY: springY,
          transformPerspective: 900,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="relative w-full max-w-xl group rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-black/40 cursor-pointer"
        onClick={() => setLightboxOpen(true)}
      >
        {/* Generated image with subtle scale-in */}
        <motion.img
          src={src}
          alt={prompt ?? "Generated image"}
          className="w-full h-auto block"
          initial={{ scale: 1.04 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Gradient shimmer on load */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)",
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.2, delay: 0.4 }}
        />

        {/* Hover overlay with meta + download */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col justify-end p-4 gap-2"
        >
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              {prompt && (
                <p className="text-xs text-white/70 leading-relaxed line-clamp-2 font-medium">
                  {prompt}
                </p>
              )}
              {model && (
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
                  {model}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium",
                  "bg-white/10 hover:bg-white/20 text-white border border-white/15",
                  "transition-colors backdrop-blur-sm"
                )}
              >
                <ZoomInIcon className="size-3.5" />
              </motion.button>

              <motion.button
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                  "bg-white/10 hover:bg-white/20 text-white border border-white/15",
                  "transition-colors backdrop-blur-sm"
                )}
              >
                <DownloadIcon className="size-3.5" />
                Save
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Corner badge */}
        <motion.div
          className="absolute top-3 right-3"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3, ease: "backOut" }}
        >
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
              "bg-black/50 text-white/50 border border-white/10 backdrop-blur-sm",
              "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
          >
            <ImageIcon className="size-2.5" />
            AI Generated
          </span>
        </motion.div>

        {/* Sparkle burst on reveal */}
        <motion.div
          className="absolute top-3 left-3 pointer-events-none"
          initial={{ opacity: 1, scale: 0.5 }}
          animate={{ opacity: 0, scale: 2 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          <SparklesIcon className="size-5 text-white/60" />
        </motion.div>
      </motion.div>
    </>
  );
}
