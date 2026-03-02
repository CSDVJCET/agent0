"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export function AudioWave() {
  // Wave heights for the center (approximate from image)
  const waves = [
    2, 3, 4, 3, 5, 8, 12, 16, 12, 8, 5, 3, 4, 3, 2, 1, 3, 4, 2, 1
  ];

  return (
    <div
      className={cn(
        "relative w-[306px] h-72 mx-auto flex items-center justify-center select-none rounded-[28px] overflow-hidden p-6"
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
        className="relative w-full h-full rounded-[20px] flex items-center justify-center bg-[#2e2e2e] overflow-hidden"
        style={{
          boxShadow: "inset 0 4px 15px rgba(0,0,0,0.6)"
        }}
      >
        <div className="flex gap-[4px] items-center z-10">
          {waves.map((h, i) => (
            <motion.div
              key={i}
              className="w-[6px] rounded-[3px] bg-white"
              initial={{ height: Math.max(8, h * 3) }}
              animate={{ 
                height: [Math.max(8, h * 3), Math.max(8, h * 6), Math.max(8, h * 3)] 
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
        
        {/* Overlay a dot pattern to make it look like a grid screen */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-60 mix-blend-overlay"
          style={{
            backgroundImage: "radial-gradient(circle at center, #000 1.5px, transparent 2px)",
            backgroundSize: "8px 8px"
          }}
        />
      </div>
    </div>
  );
}