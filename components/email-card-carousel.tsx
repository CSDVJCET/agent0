import React, { useRef, useCallback } from "react";
import { animate } from "motion/react";
import { EmailCard } from "./email-card";

export function EmailCardCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  // Velocity tracking
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  // Hold a reference to any in-flight animation so we can cancel it on new drag
  const motionStop = useRef<(() => void) | null>(null);

  // Allow horizontal scrolling on mouse wheel — project + snap
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current || e.deltaY === 0) return;
    e.preventDefault();
    if (motionStop.current) { motionStop.current(); motionStop.current = null; }
    const container = scrollRef.current;
    const projected = container.scrollLeft + e.deltaY * 2;
    const target = findSnapTarget(container, projected);
    const controls = animate(container.scrollLeft, target, {
      type: "spring",
      stiffness: 260,
      damping: 32,
      mass: 0.8,
      onUpdate: (v) => { if (scrollRef.current) scrollRef.current.scrollLeft = v; },
    });
    motionStop.current = () => controls.stop();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    // Cancel any running animation
    if (motionStop.current) { motionStop.current(); motionStop.current = null; }
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    lastX.current = e.pageX;
    lastTime.current = performance.now();
    velocity.current = 0;
    scrollRef.current.style.cursor = "grabbing";
    // Disable native snap while dragging so we control it entirely
    scrollRef.current.style.scrollSnapType = "none";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      // velocity in px/s, positive = scrolling right
      velocity.current = ((lastX.current - e.pageX) / dt) * 1000;
    }
    lastX.current = e.pageX;
    lastTime.current = now;
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft.current - (x - startX.current);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!scrollRef.current) return;
    isDragging.current = false;
    scrollRef.current.style.cursor = "grab";
    scrollRef.current.style.scrollSnapType = "none";

    const container = scrollRef.current;
    const v = velocity.current; // px/s

    // Project where a natural deceleration would land, then snap to nearest card
    const DECEL = 1800; // px/s² — tune this to taste
    const coasting = (v * Math.abs(v)) / (2 * DECEL);
    const projected = container.scrollLeft + coasting;
    const target = findSnapTarget(container, projected);

    const controls = animate(container.scrollLeft, target, {
      type: "spring",
      velocity: v,
      stiffness: 260,
      damping: 32,
      mass: 0.8,
      onUpdate: (latest) => { if (scrollRef.current) scrollRef.current.scrollLeft = latest; },
    });
    motionStop.current = () => controls.stop();
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging.current) handleMouseUp();
  }, [handleMouseUp]);

  return (
    <div
      className="relative w-full pointer-events-auto my-4 select-none"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-4"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          cursor: "grab",
          scrollSnapType: "none",
          WebkitOverflowScrolling: "touch",
          userSelect: "none",
          WebkitUserSelect: "none",
          // First/last card always centred
          paddingLeft: "calc(50% - 253px)",
          paddingRight: "calc(50% - 253px)",
        }}
      >
        <div className="shrink-0" data-snap-card>
          <EmailCard />
        </div>
        <div className="shrink-0" data-snap-card>
          <EmailCard />
        </div>
        <div className="shrink-0" data-snap-card>
          <EmailCard />
        </div>
      </div>
    </div>
  );
}

/** Returns the scrollLeft value that centres the card nearest to `projectedScrollLeft`. */
function findSnapTarget(container: HTMLDivElement, projectedScrollLeft: number): number {
  const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-snap-card]"));
  if (!cards.length) return container.scrollLeft;
  const projectedCenter = projectedScrollLeft + container.clientWidth / 2;
  let closest = cards[0];
  let minDist = Infinity;
  for (const card of cards) {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const dist = Math.abs(cardCenter - projectedCenter);
    if (dist < minDist) { minDist = dist; closest = card; }
  }
  return closest.offsetLeft + closest.offsetWidth / 2 - container.clientWidth / 2;
}