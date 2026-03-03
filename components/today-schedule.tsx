"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { CalendarDays, Loader2, CalendarX, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT = "#EF5536";
const GREY_LINE = "rgba(255,255,255,0.45)";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  htmlLink: string;
  status: string;
}

interface ScheduleEvent {
  title: string;
  subtitle?: string;
  time: string;
  startIso: string;
  active?: boolean;
  isMeeting?: boolean;
  joinUrl?: string;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase()
    .replace(" ", "");
}

function getMeetingUrl(event: CalendarEvent): string | undefined {
  const combined = (event.location || "") + " " + (event.description || "");
  const meetPatterns = [
    /https?:\/\/meet\.google\.com\/[^\s"<>]+/,
    /https?:\/\/[a-z0-9.-]+\.zoom\.us\/[^\s"<>]+/,
    /https?:\/\/teams\.microsoft\.com\/[^\s"<>]+/,
    /https?:\/\/[^\s"<>]+/,
  ];
  for (const pattern of meetPatterns) {
    const match = combined.match(pattern);
    if (match) return match[0];
  }
  return undefined;
}

function isCurrentlyActive(start: string, end: string): boolean {
  const now = new Date();
  return new Date(start) <= now && now <= new Date(end);
}

function getSubtitle(event: CalendarEvent): string | undefined {
  const loc = event.location || "";
  // Strip URLs from location to get a human-readable venue/platform name
  const clean = loc.replace(/https?:\/\/\S+/g, "").trim();
  return clean || undefined;
}

function toScheduleEvent(event: CalendarEvent): ScheduleEvent {
  const timeStr = `${formatTime(event.start)} – ${formatTime(event.end)}`;
  const joinUrl = getMeetingUrl(event);
  return {
    title: event.summary,
    subtitle: getSubtitle(event),
    time: timeStr,
    startIso: event.start,
    active: isCurrentlyActive(event.start, event.end),
    isMeeting: !!joinUrl,
    joinUrl,
  };
}

/** Returns the index of the event that should get the accent (red) line:
 *  - the currently active event, OR
 *  - the next upcoming event if none are active */
function getAccentIndex(events: ScheduleEvent[]): number {
  const now = new Date();
  const activeIdx = events.findIndex((e) => e.active);
  if (activeIdx !== -1) return activeIdx;
  // Find next upcoming
  return events.findIndex((e) => new Date(e.startIso) > now);
}

// ─── Animation variants ────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 28 },
  },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.18 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -18 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 340, damping: 26 },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24, delay: 0.06 },
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────

function JoinButton({ href }: { href: string | undefined }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label="Join meeting"
      initial={{ opacity: 0, scale: 0.82, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.82, y: 4 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className="shrink-0 flex items-center gap-[5px] rounded-full px-3 py-[5px] font-semibold"
      style={{
        background: "#2563EB",
        color: "#fff",
        fontSize: "12px",
        fontFamily: "'Alexandria', sans-serif",
        lineHeight: 1,
        boxShadow: "0 2px 8px rgba(37,99,235,0.45)",
        textDecoration: "none",
      }}
    >
      Join
      <ArrowUpRight className="w-[11px] h-[11px]" aria-hidden="true" />
    </motion.a>
  );
}

function EventCard({
  event,
  isAccent,
}: {
  event: ScheduleEvent;
  isAccent: boolean;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={itemVariants}
      layout
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      whileHover={shouldReduceMotion ? {} : { scale: 1.01, y: -0.5 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
      style={{
        background: hovered
          ? "rgba(255, 255, 255, 0.12)"
          : "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: hovered
          ? "0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 2px 6px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.03)",
        transition: "background 0.2s, box-shadow 0.2s, border 0.2s",
      }}
      role="listitem"
      aria-current={event.active ? "true" : undefined}
      tabIndex={0}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <p
          className="font-bold leading-tight"
          style={{
            fontFamily: "'Alexandria', sans-serif",
            fontSize: "14px",
            color: "#fff",
          }}
        >
          {event.title}
        </p>

        {/* Join button only for meetings, shown on hover */}
        <AnimatePresence>
          {event.isMeeting && hovered && (
            <JoinButton href={event.joinUrl} />
          )}
        </AnimatePresence>
      </div>

      {/* Subtitle + time row */}
      <div className="flex items-center gap-2">
        {/* Accent line */}
        <motion.div
          className="rounded-full shrink-0"
          animate={{ backgroundColor: isAccent ? ACCENT : GREY_LINE }}
          transition={{ duration: 0.4 }}
          style={{ width: "2px", height: "14px", borderRadius: "99px" }}
          aria-hidden="true"
        />
        <div className="flex flex-col">
          <p
            style={{
              fontFamily: "'Alexandria', sans-serif",
              fontSize: "11px",
              color: "#fff",
              opacity: isAccent ? 0.95 : 0.75,
              lineHeight: 1,
              fontWeight: 500,
            }}
          >
            {event.time}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function TimelineDot({ isAccent }: { isAccent: boolean }) {
  return (
    <div className="relative flex items-center justify-center mt-3.5 shrink-0">
      <motion.div
        className="w-3.5 h-3.5 rounded-full border-2"
        animate={{
          borderColor: isAccent ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.38)",
          backgroundColor: isAccent ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)",
        }}
        transition={{ duration: 0.3 }}
      />
      <AnimatePresence>
        {isAccent && (
          <motion.div
            className="absolute w-1.5 h-1.5 rounded-full bg-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 24 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

interface TodayScheduleProps {
  className?: string;
}

export function TodaySchedule({ className }: TodayScheduleProps) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [status, setStatus] = useState<
    "loading" | "unauthenticated" | "empty" | "ready"
  >("loading");

  useEffect(() => {
    async function fetchTodayEvents() {
      try {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const params = new URLSearchParams({
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          maxResults: "10",
        });

        const res = await fetch(`/api/calendar/events?${params}`);
        if (res.status === 401) { setStatus("unauthenticated"); return; }
        if (!res.ok) { setStatus("empty"); return; }

        const data = await res.json();
        const calEvents: CalendarEvent[] = data.events || [];
        if (calEvents.length === 0) { setStatus("empty"); return; }

        setEvents(calEvents.map(toScheduleEvent));
        setStatus("ready");
      } catch {
        setStatus("empty");
      }
    }
    fetchTodayEvents();
  }, []);

  const accentIndex = getAccentIndex(events);

  return (
    <motion.div
      className={cn("relative w-[306px] flex flex-col overflow-hidden", className)}
      style={{
        borderRadius: "2.25rem",
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(24px) saturate(1.8)",
        WebkitBackdropFilter: "blur(24px) saturate(1.8)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow:
          "0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(255, 255, 255, 0.1)",
        height: "450px",
        maxHeight: "70vh",
        margin: "0",
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="region"
      aria-label="Today's schedule"
    >
      {/* Subtle inner glow overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: "inherit",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, rgba(255,255,255,0.05) 100%)",
        }}
      />

      {/* Scrollable content */}
      <div className="relative z-10 flex flex-col h-full p-4 pb-4 overflow-y-auto scrollbar-none">
        {/* Header pill */}
        <motion.div
          variants={headerVariants}
          className="flex items-center gap-2 bg-white rounded-xl px-3.5 py-2 w-fit mb-4 shadow-md mx-auto shrink-0"
        >
          <CalendarDays
            className="w-4 h-4 shrink-0"
            style={{ color: "#1a1a1a" }}
            aria-hidden="true"
          />
          <span
            className="font-bold text-[16px] tracking-tight leading-none"
            style={{ fontFamily: "'Alexandria', sans-serif", color: "#1a1a1a" }}
          >
            Today&apos;s Schedule
          </span>
        </motion.div>

        {/* Loading */}
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 flex-1"
              aria-live="polite"
              aria-label="Loading schedule"
            >
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "rgba(255,255,255,0.75)" }}
                aria-hidden="true"
              />
              <p
                style={{
                  fontFamily: "'Alexandria', sans-serif",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                Loading schedule…
              </p>
            </motion.div>
          )}

          {/* Unauthenticated */}
          {status === "unauthenticated" && (
            <motion.div
              key="unauth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 flex-1 px-4 text-center"
              aria-live="polite"
            >
              <CalendarX
                className="w-8 h-8"
                style={{ color: "rgba(255,255,255,0.55)" }}
                aria-hidden="true"
              />
              <p
                style={{
                  fontFamily: "'Alexandria', sans-serif",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.55,
                }}
              >
                Connect Google Calendar to see your schedule
              </p>
            </motion.div>
          )}

          {/* Empty */}
          {status === "empty" && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 flex-1"
              aria-live="polite"
            >
              <CalendarDays
                className="w-8 h-8"
                style={{ color: "rgba(255,255,255,0.4)" }}
                aria-hidden="true"
              />
              <p
                style={{
                  fontFamily: "'Alexandria', sans-serif",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                No events today
              </p>
            </motion.div>
          )}

          {/* Event list */}
          {status === "ready" && (
            <motion.div
              key="events"
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="flex items-stretch gap-3 flex-1"
              role="list"
            >
              {/* Vertical timeline */}
              <div
                className="flex flex-col items-center shrink-0"
                style={{ width: "20px" }}
                aria-hidden="true"
              >
                {events.map((event, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center"
                      style={{ flex: 1, minHeight: "58px" }}
                    >
                      <TimelineDot isAccent={i === accentIndex} />
                      {i < events.length - 1 && (
                        <div
                          className="flex-1 mt-1"
                          style={{
                            width: "1px",
                            backgroundImage:
                              "repeating-linear-gradient(to bottom, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 4px, transparent 4px, transparent 10px)",
                            minHeight: "14px",
                          }}
                        />
                      )}
                    </div>
                ))}
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 flex-1">
                {events.map((event, i) => (
                  <EventCard
                    key={i}
                    event={event}
                    isAccent={i === accentIndex}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
