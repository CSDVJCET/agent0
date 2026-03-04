'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export interface CarouselImage {
  url: string;
  title: string;
}

const FULL_WIDTH_PX = 120;
const COLLAPSED_WIDTH_PX = 35;
const GAP_PX = 2;
const MARGIN_PX = 2;

export function ThumbnailCarousel({ images }: { images: CarouselImage[] }) {
  const [index, setIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [xStyle, setXStyle] = useState(0);

  useEffect(() => {
    if (!isDragging && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth || 1;
      const targetX = -index * containerWidth;
      setXStyle(targetX);
    }
  }, [index, isDragging]);

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] rounded-lg bg-white/5 text-white/40 text-sm">
        No images yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main Carousel */}
      <div className="relative overflow-hidden rounded-lg" ref={containerRef}>
        <motion.div
          className="flex"
          drag="x"
          dragElastic={0.2}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(e, info) => {
            setIsDragging(false);
            const containerWidth = containerRef.current?.offsetWidth || 1;
            const offset = info.offset.x;
            const velocity = info.velocity.x;

            let newIndex = index;

            if (Math.abs(velocity) > 500) {
              newIndex = velocity > 0 ? index - 1 : index + 1;
            } else if (Math.abs(offset) > containerWidth * 0.3) {
              newIndex = offset > 0 ? index - 1 : index + 1;
            }

            newIndex = Math.max(0, Math.min(images.length - 1, newIndex));
            setIndex(newIndex);
          }}
          animate={{ x: xStyle }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {images.map((item) => (
            <div key={item.url} className="shrink-0 w-full h-[400px]">
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover rounded-lg select-none pointer-events-none"
                draggable={false}
              />
            </div>
          ))}
        </motion.div>

        {/* Prev Button */}
        <motion.button
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className={`absolute left-4 text-black top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform z-10
            ${index === 0 ? 'opacity-40 cursor-not-allowed' : 'bg-white hover:scale-110 hover:opacity-100 opacity-70'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>

        {/* Next Button */}
        <motion.button
          disabled={index === images.length - 1}
          onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))}
          className={`absolute text-black right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform z-10
            ${index === images.length - 1 ? 'opacity-40 cursor-not-allowed' : 'bg-white hover:scale-110 hover:opacity-100 opacity-70'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>

        {/* Title overlay */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-xs backdrop-blur-sm whitespace-nowrap max-w-[80%] truncate">
          {images[index]?.title}
        </div>
      </div>

      <Thumbnails images={images} index={index} setIndex={setIndex} />
    </div>
  );
}

function Thumbnails({
  images,
  index,
  setIndex,
}: {
  images: CarouselImage[];
  index: number;
  setIndex: (index: number) => void;
}) {
  const thumbnailsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (thumbnailsRef.current) {
      let scrollPosition = 0;
      for (let i = 0; i < index; i++) {
        scrollPosition += COLLAPSED_WIDTH_PX + GAP_PX;
      }
      scrollPosition += MARGIN_PX;
      const containerWidth = thumbnailsRef.current.offsetWidth;
      const centerOffset = containerWidth / 2 - FULL_WIDTH_PX / 2;
      scrollPosition -= centerOffset;

      thumbnailsRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [index]);

  return (
    <div
      ref={thumbnailsRef}
      className="overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="flex gap-1 h-20 pb-2" style={{ width: 'fit-content' }}>
        {images.map((item, i) => (
          <motion.button
            key={item.url}
            onClick={() => setIndex(i)}
            initial={false}
            animate={i === index ? 'active' : 'inactive'}
            variants={{
              active: { width: FULL_WIDTH_PX, marginLeft: MARGIN_PX, marginRight: MARGIN_PX },
              inactive: { width: COLLAPSED_WIDTH_PX, marginLeft: 0, marginRight: 0 },
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative shrink-0 h-full overflow-hidden rounded"
          >
            <img
              src={item.url}
              alt={item.title}
              className="w-full h-full object-cover pointer-events-none select-none"
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
