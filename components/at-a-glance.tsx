"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "motion/react";

// ─── Analog Clock ────────────────────────────────────────────────────────────
// Round to 3 decimal places to prevent floating-point serialization mismatches
// between SSR and client hydration.
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function AnalogClock({ time }: { time: Date | null }) {
  const size = 72;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  // Liquid glass container with clock face color matching the image
  const wrap: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    borderRadius: "50%",
    // Light grayish-blue background from image
    background: "rgba(176, 196, 222, 0.9)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    border: "2px solid rgba(255, 255, 255, 0.6)",
    boxShadow:
      "inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.15)",
    flexShrink: 0,
    verticalAlign: "middle",
    overflow: "hidden",
  };

  // Pre-compute position for numbers (12, 3, 6, 9)
  const numbers = [
    { label: "12", angle: 0 },
    { label: "3", angle: 90 },
    { label: "6", angle: 180 },
    { label: "9", angle: 270 },
  ].map(({ label, angle }) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    // Position numbers slightly inset
    const tr = r - 10;
    return {
      label,
      x: r3(cx + tr * Math.cos(rad)),
      y: r3(cy + tr * Math.sin(rad) + 4), // +4 for vertical centering approximation
    };
  });

  // Pre-compute dots for other hours
  const dots = [1, 2, 4, 5, 7, 8, 10, 11].map((hour) => {
    const angle = hour * 30;
    const rad = ((angle - 90) * Math.PI) / 180;
    const tr = r - 10;
    return {
      key: hour,
      cx: r3(cx + tr * Math.cos(rad)),
      cy: r3(cy + tr * Math.sin(rad)),
    };
  });

  // Render static face if time is null
  if (!time) {
    return (
      <span style={wrap}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
          {/* Glass sheen highlight top */}
          <path d={`M ${cx - r * 0.7} ${cy - r * 0.7} Q ${cx} ${cy - r * 0.95} ${cx + r * 0.7} ${cy - r * 0.7}`} stroke="rgba(255,255,255,0.4)" strokeWidth="2" fill="none" opacity="0.8" />
          
          {/* Hourly Red Dots */}
          {dots.map((d) => (
            <circle key={d.key} cx={d.cx} cy={d.cy} r="1.5" fill="#e55039" />
          ))}

          {/* Major Numbers */}
          {numbers.map(({ label, x, y }) => (
            <text key={label} x={x} y={y} textAnchor="middle" fontSize="10" fontWeight="900" fill="#1e272e" style={{ fontFamily: 'Arial, sans-serif' }}>{label}</text>
          ))}
          
          {/* Hands placeholder */}
           <line x1={cx} y1={cy} x2={cx + 10} y2={cy + 10} stroke="#2f3542" strokeWidth="3" strokeLinecap="round" />
           <circle cx={cx} cy={cy} r="2.5" fill="#2f3542" />
        </svg>
      </span>
    );
  }

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  // No seconds hand in the design reference

  const minuteDeg = minutes * 6;
  const hourDeg = hours * 30 + minutes * 0.5;

  const handX = (deg: number, len: number) =>
    r3(cx + len * Math.cos(((deg - 90) * Math.PI) / 180));
  const handY = (deg: number, len: number) =>
    r3(cy + len * Math.sin(((deg - 90) * Math.PI) / 180));

  return (
    <span style={wrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        {/* Glass sheen highlight top-left */}
        <ellipse cx={cx} cy={cy * 0.5} rx={r * 0.6} ry={r * 0.25} fill="rgba(255,255,255,0.25)" transform={`rotate(-15 ${cx} ${cy * 0.5})`} />

        {/* Hourly Red Dots */}
        {dots.map((d) => (
          <circle key={d.key} cx={d.cx} cy={d.cy} r="1.8" fill="#eb4d4b" />
        ))}

        {/* Major Numbers */}
        {numbers.map(({ label, x, y }) => (
          <text key={label} x={x} y={y} textAnchor="middle" fontSize="11" fontWeight="800" fill="#130f40" style={{ fontFamily: 'var(--font-sans), sans-serif' }}>{label}</text>
        ))}

        {/* Hour hand - Thick, Dark, Rounded */}
        <line
          x1={cx}
          y1={cy}
          x2={handX(hourDeg, r - 16)}
          y2={handY(hourDeg, r - 16)}
          stroke="#2f3542"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Minute hand - Thinner, Longer, Dark, Rounded */}
        <line
          x1={cx}
          y1={cy}
          x2={handX(minuteDeg, r - 8)}
          y2={handY(minuteDeg, r - 8)}
          stroke="#2f3542"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Centre dot */}
        <circle cx={cx} cy={cy} r="2.5" fill="#2f3542" />
      </svg>
    </span>
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

// Gmail icon using the actual SVG asset
function GmailPlaceholder({ size = 60 }: { size?: number }) {
  const imgSize = Math.round(size * 0.58);
  return (
    <IconBox size={size}>
      <Image src="/gmail.svg" alt="Gmail" width={imgSize} height={imgSize} style={{ objectFit: "contain" }} />
    </IconBox>
  );
}

// Teams icon using the actual SVG asset
function TeamsPlaceholder({ size = 60 }: { size?: number }) {
  const imgSize = Math.round(size * 0.6);
  return (
    <IconBox size={size}>
      <Image src="/teams.svg" alt="Teams" width={imgSize} height={imgSize} style={{ objectFit: "contain" }} />
    </IconBox>
  );
}

// ─── Weather helpers ─────────────────────────────────────────────────────────
/** Map a WMO weather code + time-of-day to one of the /public/weather/ images. */
function getWeatherImage(code: number, isNight: boolean, hour: number, isWindy: boolean): string {
  if (code >= 95) return "/weather/thunderstorm.png";
  if ((code >= 71 && code <= 77) || code >= 85) return "/weather/snowy.png";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "/weather/rainy.png";
  if (code >= 45 && code <= 48) return "/weather/cloudy.png";
  if (code >= 1 && code <= 3) return isWindy ? "/weather/windy.png" : "/weather/cloudy.png";
  // Code 0 – clear sky
  if (isWindy) return "/weather/windy.png";
  if (isNight) return "/weather/moon.png";
  if (hour >= 5 && hour <= 7) return "/weather/sunrise.png";
  if (hour >= 18 && hour <= 20) return "/weather/sunset.png";
  return "/weather/sunny.png";
}

/** Short human-readable label for a WMO weather code. */
function getWeatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzling";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showery";
  if (code <= 86) return "Snowing";
  return "Stormy";
}

// Weather icon using the actual PNG asset
function WeatherPlaceholder({ size = 60, src = "/weather/cloudy.png" }: { size?: number; src?: string }) {
  const radius = "1.03519rem";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: radius,
        background: "rgba(255,255,255,0.20)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1.5px solid rgba(255,255,255,0.35)",
        flexShrink: 0,
        overflow: "hidden",
        verticalAlign: "middle",
      }}
    >
      <Image
        src={src}
        alt="Weather"
        width={size}
        height={size}
        style={{ objectFit: "cover", width: "100%", height: "100%" }}
      />
    </span>
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
interface LiveWeather {
  temp: number;
  label: string;
  imageSrc: string;
  location: string;
}

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
  // Initialize as null so the server and first client render are identical,
  // avoiding the hydration mismatch caused by time-dependent SVG coordinates.
  const [time, setTime] = useState<Date | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeather | null>(null);

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch current location weather from Open-Meteo
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            ),
          ]);
          const wData = await weatherRes.json();
          const gData = await geoRes.json();

          const code: number = wData.current.weather_code;
          const isDay: boolean = wData.current.is_day === 1;
          const windSpeed: number = wData.current.wind_speed_10m ?? 0;
          const now = new Date();
          const hour = now.getHours();
          const isWindy = windSpeed > 40 && code <= 3;
          const imageSrc = getWeatherImage(code, !isDay, hour, isWindy);
          const city =
            gData.address?.city ??
            gData.address?.town ??
            gData.address?.village ??
            gData.address?.county ??
            location;

          setLiveWeather({
            temp: Math.round(wData.current.temperature_2m),
            label: getWeatherLabel(code),
            imageSrc,
            location: city,
          });
        } catch {
          // Network error – fall back to prop values
        }
      },
      () => {
        // Permission denied – fall back to prop values
      }
    );
  }, [location]);

  const day = time ? DAYS[time.getDay()] : "";
  const formattedTime = time ? formatTime(time) : "";

  const displayCondition = liveWeather?.label ?? weatherCondition;
  const displayLocation = liveWeather?.location ?? location;
  const weatherImageSrc = liveWeather?.imageSrc ?? "/weather/cloudy.png";

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
        <WeatherPlaceholder size={64} src={weatherImageSrc} />
        {liveWeather && (
          <span className={`${vivid} text-2xl sm:text-3xl font-semibold tabular-nums`}>
            {liveWeather.temp}°C
          </span>
        )}
        <span className={`${vivid} ${textBase}`}>{displayCondition}</span>
      </motion.div>

      {/* Line 3 – in [Location] */}
      <motion.div variants={lineVariant} className={lineClass}>
        <span className={`${muted} ${textBase}`}>in</span>
        <span className={`${vivid} ${textBase}`}>{displayLocation}</span>
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
