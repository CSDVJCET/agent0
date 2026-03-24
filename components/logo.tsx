/**
 * Logo component - displays the app logo
 * Can be used in header/nav or anywhere a logo is needed
 */

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  className?: string;
  showText?: boolean;
}

const sizeMap = {
  sm: { width: 32, height: 32, textSize: 'text-lg' },
  md: { width: 48, height: 48, textSize: 'text-2xl' },
  lg: { width: 64, height: 64, textSize: 'text-3xl' },
};

export function Logo({
  size = 'md',
  href = '/',
  className,
  showText = false,
}: LogoProps) {
  const dimensions = sizeMap[size];

  const logo = (
    <div className={cn('flex items-center gap-2', className)}>
      <div 
        className="relative overflow-hidden rounded-lg"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full"
        >
          <defs>
            <style>{`
              .cloud { fill: #ffffff; }
              @keyframes float1 {
                0%, 100% { transform: translate(0px, 0px) scale(1); }
                50% { transform: translate(-10px, -15px) scale(1.02); }
              }
              @keyframes float2 {
                0%, 100% { transform: translate(0px, 0px) scale(1); }
                50% { transform: translate(12px, -8px) scale(0.98); }
              }
              @keyframes float3 {
                0%, 100% { transform: translate(0px, 0px) scale(1); }
                50% { transform: translate(-8px, 12px) scale(1.03); }
              }
              .cloud1 {
                animation: float1 14s ease-in-out infinite;
                transform-origin: 400px 220px;
              }
              .cloud2 {
                animation: float2 11s ease-in-out infinite;
                transform-origin: 260px 400px;
              }
              .cloud3 {
                animation: float3 13s ease-in-out infinite;
                transform-origin: 560px 390px;
              }
            `}</style>
          </defs>
          <rect width="100%" height="100%" fill="#0ea5ff" />
          <g className="cloud cloud1">
            <circle cx="400" cy="180" r="75" />
            <circle cx="320" cy="220" r="55" />
            <circle cx="480" cy="210" r="60" />
            <circle cx="350" cy="260" r="35" />
            <circle cx="390" cy="275" r="40" />
            <circle cx="440" cy="265" r="45" />
            <circle cx="490" cy="245" r="30" />
            <circle cx="300" cy="245" r="30" />
          </g>
          <g className="cloud cloud2">
            <circle cx="260" cy="350" r="55" />
            <circle cx="200" cy="390" r="45" />
            <circle cx="320" cy="380" r="50" />
            <circle cx="230" cy="425" r="35" />
            <circle cx="280" cy="435" r="35" />
            <circle cx="320" cy="415" r="30" />
            <circle cx="180" cy="415" r="25" />
            <circle cx="260" cy="410" r="35" />
          </g>
          <g className="cloud cloud3">
            <circle cx="560" cy="360" r="50" />
            <circle cx="490" cy="390" r="45" />
            <circle cx="620" cy="380" r="45" />
            <circle cx="520" cy="420" r="35" />
            <circle cx="570" cy="425" r="30" />
            <circle cx="610" cy="415" r="30" />
            <circle cx="470" cy="410" r="25" />
            <circle cx="640" cy="405" r="25" />
            <circle cx="550" cy="405" r="30" />
          </g>
        </svg>
      </div>
      {showText && (
        <span className={cn('font-bold text-blue-500', dimensions.textSize)}>
          Agent0
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{logo}</Link>;
  }

  return logo;
}
