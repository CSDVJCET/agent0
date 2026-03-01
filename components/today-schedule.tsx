"use client";

import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleEvent {
  title: string;
  time: string;
  active?: boolean;
}

const defaultEvents: ScheduleEvent[] = [
  { title: "Online Meeting", time: "9:00 am - 10:30am", active: true },
  { title: "Presentation", time: "11:00 am - 11:30am" },
  { title: "Gym", time: "12:00 pm - 1:30pm" },
  { title: "Interview", time: "2:00 pm - 3:00pm" },
];

interface TodayScheduleProps {
  events?: ScheduleEvent[];
  className?: string;
}

export function TodaySchedule({
  events = defaultEvents,
  className,
}: TodayScheduleProps) {
  return (
    <div
      className={cn(
        "relative w-[306px] h-72 rounded-[28px] overflow-hidden p-5 pb-7",
        className
      )}
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(40px) saturate(1.6)",
        WebkitBackdropFilter: "blur(40px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Header pill */}
      <div className="flex items-center gap-2.5 bg-white/85 backdrop-blur-sm rounded-[12px] px-3 py-2 w-fit mb-7 shadow-sm mx-auto">
        <CalendarDays
          className="w-[18px] h-[18px] shrink-0"
          style={{ color: "#322D31" }}
        />
        <span
          className="font-bold text-[20px] leading-none"
          style={{
            fontFamily: "'Alexandria', sans-serif",
            color: "#322D31",
          }}
        >
          Today&apos;s Schedule
        </span>
      </div>

      {/* Timeline + Events */}
      <div className="flex items-stretch gap-4 pl-1">
        {/* Vertical dashed timeline */}
        <div
          className="flex flex-col items-center"
          style={{ width: "20px", minWidth: "20px" }}
        >
          {events.map((event, i) => (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{ flex: 1, minHeight: "58px" }}
            >
              {/* Ring marker */}
              <div className="relative flex items-center justify-center mt-[10px] shrink-0">
                <div
                  className="w-[14px] h-[14px] rounded-full border-[2px]"
                  style={{
                    borderColor: event.active
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.4)",
                    backgroundColor: event.active
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(255,255,255,0.08)",
                  }}
                />
                {/* Centre dot for active */}
                {event.active && (
                  <div
                    className="absolute w-[6px] h-[6px] rounded-full"
                    style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
                  />
                )}
              </div>

              {/* Dashed connector */}
              {i < events.length - 1 && (
                <div
                  className="flex-1 mt-1"
                  style={{
                    width: "1px",
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 4px, transparent 4px, transparent 8px)",
                    minHeight: "16px",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Event cards */}
        <div className="flex flex-col gap-[7px] flex-1">
          {events.map((event, i) => (
            <div
              key={i}
              className="rounded-[12px] px-3 py-[10px]"
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(20px) saturate(1.4)",
                WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow:
                  "0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              <p
                className="text-white font-normal leading-tight"
                style={{
                  fontFamily: "'Alexandria', sans-serif",
                  fontSize: "15px",
                }}
              >
                {event.title}
              </p>

              <div className="flex items-center gap-[6px] mt-[5px]">
                <div
                  className="rounded-full shrink-0"
                  style={{
                    width: "2px",
                    height: "13px",
                    backgroundColor: event.active
                      ? "#ef5536"
                      : "rgba(255,255,255,0.45)",
                  }}
                />
                <p
                  style={{
                    fontFamily: "'Alexandria', sans-serif",
                    fontSize: "10px",
                    color: "#fdefe4",
                    lineHeight: 1,
                  }}
                >
                  {event.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
