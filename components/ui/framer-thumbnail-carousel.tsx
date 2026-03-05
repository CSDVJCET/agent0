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

  // Square image area sized to roughly fill 80vh after accounting for dialog chrome (30% bigger than 60vh)
  const imgSize = 'calc(80vh - 8rem)';

  const handleDownload = async (url: string, title?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = title || 'image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  if (!images || images.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-[1.5rem] bg-white/10 backdrop-blur-md border border-white/20 text-gray-600 text-sm shadow-inner"
        style={{ width: imgSize, height: imgSize }}
      >
        No images yet
      </div>
    );
  }

  return (
    <motion.div 
      className="flex flex-col gap-4" 
      style={{ width: imgSize }}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
    >
      {/* Main Carousel - Square */}
      <div className="relative overflow-hidden rounded-[1.5rem] w-full aspect-square bg-white/10 backdrop-blur-sm border border-white/40 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]">
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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl bg-white/40 text-black/70 border border-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-10 hover:bg-white/60 transition-colors"
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
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl bg-white/40 text-black/70 border border-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-10 hover:bg-white/60 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>

        {/* Download Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleDownload(images[index].url, images[index].title)}
          className="absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl bg-white/40 text-black/70 border border-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-10 hover:bg-white/60 transition-colors"
          title="Download image"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </motion.button>
      </div>

      <Thumbnails 
        images={images} 
        index={index} 
        setIndex={(newIndex) => {
          const newDirection = newIndex > index ? 1 : -1;
          setPage([page + (newIndex - index), newDirection]);
        }} 
      />
    </motion.div>
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
      <div className="flex items-center h-12" style={{ gap: GAP_PX, width: 'fit-content' }}>
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
              className="relative shrink-0 h-full overflow-hidden rounded-2xl ring-1 ring-white/30 shadow-sm"
            >
              <img
                src={item.url}
                alt={item.title || `Thumbnail ${i + 1}`}
                className="w-full h-full object-cover pointer-events-none select-none"
              />
              {isActive && (
                <motion.div 
                  layoutId="thumbnail-active"
                  className="absolute inset-0 rounded-2xl ring-2 ring-white ring-offset-2 ring-offset-black/5"
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
