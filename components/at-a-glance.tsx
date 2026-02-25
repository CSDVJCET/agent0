"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";

// ─── Analog Clock ────────────────────────────────────────────────────────────
function AnalogClock({ time }: { time: Date }) {
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  const size = 72;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 3;

  const handX = (deg: number, len: number) =>
    cx + len * Math.cos(((deg - 90) * Math.PI) / 180);
  const handY = (deg: number, len: number) =>
    cy + len * Math.sin(((deg - 90) * Math.PI) / 180);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      {/* Face */}
      <circle cx={cx} cy={cy} r={r} fill="white" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(180,180,180,0.6)"
        strokeWidth="1.5"
      />

      {/* Hour tick marks */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = i * 30;
        const rad = ((angle - 90) * Math.PI) / 180;
        const inner = i % 3 === 0 ? r - 9 : r - 6;
        return (
          <line
            key={i}
            x1={cx + inner * Math.cos(rad)}
            y1={cy + inner * Math.sin(rad)}
            x2={cx + (r - 2) * Math.cos(rad)}
            y2={cy + (r - 2) * Math.sin(rad)}
            stroke={i % 3 === 0 ? "#444" : "#aaa"}
            strokeWidth={i % 3 === 0 ? 2 : 1}
            strokeLinecap="round"
          />
        );
      })}

      {/* Number labels */}
      {(
        [
          { label: "12", angle: 0 },
          { label: "3", angle: 90 },
          { label: "6", angle: 180 },
          { label: "9", angle: 270 },
        ] as { label: string; angle: number }[]
      ).map(({ label, angle }) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const tr = r - 13;
        return (
          <text
            key={label}
            x={cx + tr * Math.cos(rad)}
            y={cy + tr * Math.sin(rad) + 3.5}
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="#333"
          >
            {label}
          </text>
        );
      })}

      {/* Hour hand */}
      <line
        x1={cx}
        y1={cy}
        x2={handX(hourDeg, r - 18)}
        y2={handY(hourDeg, r - 18)}
        stroke="#222"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Minute hand */}
      <line
        x1={cx}
        y1={cy}
        x2={handX(minuteDeg, r - 10)}
        y2={handY(minuteDeg, r - 10)}
        stroke="#222"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Second hand */}
      <line
        x1={cx}
        y1={cy}
        x2={handX(secondDeg, r - 6)}
        y2={handY(secondDeg, r - 6)}
        stroke="#e53e3e"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Centre dot */}
      <circle cx={cx} cy={cy} r="3" fill="#333" />
    </svg>
  );
}

// ─── Icon Placeholders ───────────────────────────────────────────────────────
function IconBox({
  children,
  size = 60,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 14,
        background: "rgba(255,255,255,0.25)",
        backdropFilter: "blur(8px)",
        border: "1.5px solid rgba(255,255,255,0.35)",
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    >
      {children}
    </span>
  );
}

// Gmail "M" icon placeholder
function GmailPlaceholder({ size = 60 }: { size?: number }) {
  return (
    <IconBox size={size}>
      <svg
        viewBox="0 0 24 24"
        width={size * 0.58}
        height={size * 0.58}
        fill="none"
      >
        <path
          d="M1.5 8.5V19a1 1 0 0 0 1 1H8V13h8v7h5.5a1 1 0 0 0 1-1V8.5L12 14 1.5 8.5Z"
          fill="#EA4335"
        />
        <path d="M1.5 8.5 12 14l10.5-5.5V6a1 1 0 0 0-1-1H2.5a1 1 0 0 0-1 1v2.5Z" fill="#4285F4" />
        <path d="M8 13v7h8v-7H8Z" fill="#34A853" />
        <path d="M1.5 8.5V6a1 1 0 0 1 1-1H6L1.5 8.5Z" fill="#FBBC05" />
        <path d="M22.5 8.5V6a1 1 0 0 0-1-1H18l4.5 3.5Z" fill="#EA4335" />
      </svg>
    </IconBox>
  );
}

// Teams "T" icon placeholder
function TeamsPlaceholder({ size = 60 }: { size?: number }) {
  return (
    <IconBox size={size}>
      <svg
        viewBox="0 0 24 24"
        width={size * 0.6}
        height={size * 0.6}
        fill="none"
      >
        <rect x="1" y="1" width="22" height="22" rx="5" fill="#5059C9" />
        <text
          x="12"
          y="17"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="white"
          fontFamily="sans-serif"
        >
          T
        </text>
      </svg>
    </IconBox>
  );
}

// Weather cloud icon placeholder
function WeatherPlaceholder({ size = 60 }: { size?: number }) {
  return (
    <IconBox size={size}>
      <svg
        viewBox="0 0 64 64"
        width={size * 0.65}
        height={size * 0.65}
        fill="none"
      >
        <rect x="0" y="0" width="64" height="64" rx="14" fill="#5AC8FA" />
        <path
          d="M46 38a8 8 0 0 0-7.5-8A12 12 0 0 0 15 32a8 8 0 0 0 0 16h31a7 7 0 0 0 0-10Z"
          fill="white"
        />
      </svg>
    </IconBox>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(date: Date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ─── Animation Variants ──────────────────────────────────────────────────────
const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const lineVariant = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

// ─── Typography helpers ───────────────────────────────────────────────────────
const muted = "text-white/60";
const vivid = "text-white";

// ─── Main Component ──────────────────────────────────────────────────────────
export function AtAGlance({
  location = "Your City",
  weatherCondition = "Cloudy",
  emailCount = 2,
  meetingCount = 2,
}: {
  location?: string;
  weatherCondition?: string;
  emailCount?: number;
  meetingCount?: number;
}) {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const day = DAYS[time.getDay()];
  const formattedTime = formatTime(time);

  const lineClass =
    "flex flex-wrap items-center gap-x-3 gap-y-2 font-bold leading-tight";
  const textBase =
    "text-4xl sm:text-5xl md:text-6xl lg:text-7xl";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center gap-4 px-6 text-center select-none"
    >
      {/* Line 1 – Happy [Day]! */}
      <motion.div variants={lineVariant} className={lineClass}>
        <span className={`${muted} ${textBase}`}>Happy</span>
        <span className={`${vivid} ${textBase}`}>{day}!</span>
      </motion.div>

      {/* Line 2 – It's [Clock] [Time] and [WeatherIcon] [Condition] */}
      <motion.div variants={lineVariant} className={lineClass}>
        <span className={`${muted} ${textBase}`}>It&apos;s</span>
        <AnalogClock time={time} />
        <span className={`${vivid} ${textBase}`}>{formattedTime}</span>
        <span className={`${muted} ${textBase}`}>and</span>
        <WeatherPlaceholder size={64} />
        <span className={`${vivid} ${textBase}`}>{weatherCondition}</span>
      </motion.div>

      {/* Line 3 – in [Location] */}
      <motion.div variants={lineVariant} className={lineClass}>
        <span className={`${muted} ${textBase}`}>in</span>
        <span className={`${vivid} ${textBase}`}>{location}</span>
      </motion.div>

      {/* Line 4 – You got [Gmail] [n] emails and have */}
      <motion.div variants={lineVariant} className={`${lineClass} mt-2`}>
        <span className={`${muted} ${textBase}`}>You got</span>
        <GmailPlaceholder size={64} />
        <span className={`${vivid} ${textBase}`}>{emailCount} emails</span>
        <span className={`${muted} ${textBase}`}>and have</span>
      </motion.div>

      {/* Line 5 – [Teams] [n] meetings today */}
      <motion.div variants={lineVariant} className={lineClass}>
        <TeamsPlaceholder size={64} />
        <span className={`${vivid} ${textBase}`}>{meetingCount} meetings</span>
        <span className={`${muted} ${textBase}`}>today</span>
      </motion.div>
    </motion.div>
  );
}
