'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, PanInfo, Variants } from 'motion/react';

export interface CarouselImage {
  url: string;
  title: string;
}

const FULL_WIDTH_PX = 100;
const COLLAPSED_WIDTH_PX = 40;
const GAP_PX = 4;
const MARGIN_PX = 4;

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  }),
};

export function ThumbnailCarousel({ images }: { images: CarouselImage[] }) {
  const [[page, direction], setPage] = useState([0, 0]);

  const index = ((page % images.length) + images.length) % images.length;

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset }: PanInfo) => {
    const swipe = offset.x;

    if (swipe < -50) {
      paginate(1);
    } else if (swipe > 50) {
      paginate(-1);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center aspect-square w-full rounded-2xl bg-white/5 border border-white/10 text-white/40 text-sm">
        No images yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main Carousel - Square Aspect Ratio */}
      <div className="relative overflow-hidden rounded-2xl aspect-square w-full bg-black/20 ring-1 ring-white/10">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={page}
            src={images[index].url}
            alt={images[index].title || `Image ${index + 1}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            className="absolute top-0 left-0 w-full h-full object-cover select-none cursor-grab active:cursor-grabbing"
            draggable={false}
          />
        </AnimatePresence>

        {/* Prev Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => paginate(-1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md bg-black/40 text-white border border-white/20 shadow-lg z-10 hover:bg-black/60 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>

        {/* Next Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => paginate(1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md bg-black/40 text-white border border-white/20 shadow-lg z-10 hover:bg-black/60 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>

        {/* Title overlay */}
        {images[index].title && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={images[index].title}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-md border border-white/10 whitespace-nowrap max-w-[85%] truncate z-10"
          >
            {images[index].title}
          </motion.div>
        )}
      </div>

      <Thumbnails 
        images={images} 
        index={index} 
        setIndex={(newIndex) => {
          const newDirection = newIndex > index ? 1 : -1;
          setPage([page + (newIndex - index), newDirection]);
        }} 
      />
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
      className="overflow-x-auto overflow-y-hidden py-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="flex items-center h-20" style={{ gap: GAP_PX, width: 'fit-content' }}>
        {images.map((item, i) => {
          const isActive = i === index;
          return (
            <motion.button
              key={i}
              onClick={() => setIndex(i)}
              initial={false}
              animate={{
                width: isActive ? FULL_WIDTH_PX : COLLAPSED_WIDTH_PX,
                marginLeft: isActive ? MARGIN_PX : 0,
                marginRight: isActive ? MARGIN_PX : 0,
                scale: isActive ? 1 : 0.95,
                opacity: isActive ? 1 : 0.5,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative shrink-0 h-full overflow-hidden rounded-xl ring-1 ring-white/10"
            >
              <img
                src={item.url}
                alt={item.title || `Thumbnail ${i + 1}`}
                className="w-full h-full object-cover pointer-events-none select-none"
              />
              {isActive && (
                <motion.div 
                  layoutId="thumbnail-active"
                  className="absolute inset-0 rounded-xl ring-2 ring-white/80 ring-inset"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
