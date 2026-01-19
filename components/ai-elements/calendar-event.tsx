"use client";

import { format } from "date-fns";
import { CalendarIcon, MapPinIcon, ClockIcon, ExternalLinkIcon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

interface CalendarEventProps {
  summary: string;
  startTime: string;
  endTime: string;
  location?: string;
  link?: string;
}

export function CalendarEvent({ summary, startTime, endTime, location, link }: CalendarEventProps) {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
        scale: { duration: 0.3 }
      }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-green-500/20 bg-linear-to-br from-green-500/5 via-green-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-green-500/10 bg-linear-to-br from-green-500/5 via-green-500/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="p-2 rounded-lg bg-green-500/10 text-green-600 ring-1 ring-green-500/20"
            >
              <CheckCircle2Icon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-base text-green-700">Event Created Successfully</h3>
              <p className="text-xs text-green-600/70 mt-0.5">Added to your Google Calendar</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="space-y-4"
          >
            {/* Event Title */}
            <div>
              <h4 className="font-semibold text-lg leading-tight text-foreground">{summary}</h4>
            </div>

            {/* Event Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                  <CalendarIcon className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium">{format(startDate, "EEEE, MMMM d, yyyy")}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                  <ClockIcon className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium">
                  {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                </span>
              </div>

              {location && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                    <MapPinIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium truncate flex-1">{location}</span>
                </div>
              )}
            </div>

            {/* Action Button */}
            {link && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="pt-2"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 gap-2 font-medium border-green-500/20 hover:bg-green-500/10 hover:text-green-700 hover:border-green-500/30 transition-all duration-200"
                  asChild
                >
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon className="h-4 w-4" />
                    Open in Google Calendar
                  </a>
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
