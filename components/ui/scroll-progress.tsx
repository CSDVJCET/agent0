'use client';

import { motion, type SpringOptions, useScroll, useSpring } from 'motion/react';
import { cn } from '@/lib/utils';
import { type RefObject } from 'react';

interface ScrollProgressProps {
  className?: string;
  springOptions?: SpringOptions;
  containerRef?: RefObject<HTMLDivElement | null>;
  orientation?: 'horizontal' | 'vertical';
}

const DEFAULT_SPRING_OPTIONS: SpringOptions = {
  stiffness: 200,
  damping: 50,
  restDelta: 0.001,
};

export function ScrollProgress({
  className,
  springOptions,
  containerRef,
  orientation = 'horizontal',
}: ScrollProgressProps) {
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  const scale = useSpring(scrollYProgress, {
    ...(springOptions ?? DEFAULT_SPRING_OPTIONS),
  });

  return (
    <motion.div
      className={cn(
        'absolute z-50 pointer-events-none',
        orientation === 'horizontal' ? 'inset-x-0 top-0 h-1 origin-left' : 'inset-y-0 left-0 w-1 origin-top',
        className
      )}
      style={{
        [orientation === 'horizontal' ? 'scaleX' : 'scaleY']: scale,
      }}
    />
  );
}
