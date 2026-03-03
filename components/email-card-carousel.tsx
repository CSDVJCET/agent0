import React, { useRef } from "react";
import { EmailCard } from "./email-card";

export function EmailCardCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Allow horizontal scrolling on mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current) {
      // e.deltaY gives vertical scroll amount; let's apply it horizontally
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollRef.current.scrollBy({ left: e.deltaY, behavior: "smooth" });
      }
    }
  };

  return (
    <div 
      className="relative w-full pointer-events-auto"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)"
      }}
    >
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 pt-4 px-[10%] lg:px-[15%] 2xl:px-[20%]"
        onWheel={handleWheel}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="snap-center shrink-0 w-[450px]">
          <EmailCard />
        </div>
        <div className="snap-center shrink-0 w-[450px]">
          <EmailCard />
        </div>
        <div className="snap-center shrink-0 w-[450px]">
          <EmailCard />
        </div>
      </div>
    </div>
  );
}