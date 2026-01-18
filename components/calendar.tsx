"use client";

import { cn } from "@/lib/utils";
import {
  Calendar,
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// Type Definitions
// ============================================================================

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: Array<{ email: string; responseStatus?: string }>;
  link?: string;
}

interface CalendarEventListProps {
  events: CalendarEvent[];
  eventCount: number;
  message?: string;
  error?: boolean;
}

interface CalendarEventCreatedProps {
  eventId: string;
  summary: string;
  startTime: string;
  endTime: string;
  htmlLink?: string;
  message?: string;
  error?: boolean;
}

interface CalendarEventUpdatedProps {
  eventId: string;
  summary: string;
  startTime: string;
  endTime: string;
  htmlLink?: string;
  message?: string;
  error?: boolean;
}

interface CalendarEventDeletedProps {
  eventId: string;
  deleted: boolean;
  message?: string;
  error?: boolean;
}

interface CalendarAvailabilityProps {
  freeSlots: Array<{
    start: string;
    end: string;
    durationMinutes: number;
  }>;
  slotCount: number;
  busyPeriods?: Array<{ start: string; end: string }>;
  message?: string;
  error?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const sameDay = startDate.toDateString() === endDate.toDateString();
  
  if (sameDay) {
    return `${formatDateTime(start)} - ${formatTime(end)}`;
  }
  
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

function getResponseStatusIcon(status: string) {
  switch (status) {
    case "accepted":
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case "declined":
      return <XCircle className="h-3 w-3 text-red-500" />;
    case "tentative":
      return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    default:
      return <Clock className="h-3 w-3 text-gray-400" />;
  }
}

// ============================================================================
// Error Display Component
// ============================================================================

function CalendarError({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4 my-2">
      <div className="flex items-center gap-2">
        <CalendarX className="h-5 w-5 text-red-500" />
        <p className="text-red-600 dark:text-red-400 text-sm">
          {message || "Calendar operation failed"}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Calendar Event List Component
// ============================================================================

export function CalendarEventList({
  events,
  eventCount,
  message,
  error,
}: CalendarEventListProps) {
  if (error) {
    return <CalendarError message={message} />;
  }

  if (events.length === 0) {
    return (
      <div className={cn(
        "rounded-xl border bg-gradient-to-br from-gray-50 to-slate-100",
        "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
        "p-5 my-3"
      )}>
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <Calendar className="h-6 w-6" />
          <p className="text-sm">{message || "No upcoming events found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br from-violet-50 to-purple-100",
      "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
      "p-5 my-3 shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
          Upcoming Events ({eventCount})
        </h3>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              "rounded-lg bg-white/70 dark:bg-slate-800/50 p-3",
              "border border-violet-200/50 dark:border-slate-600/50"
            )}
          >
            {/* Event Title & Link */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                {event.title}
              </h4>
              {event.link && (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 dark:text-violet-400 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* Time */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-1">
              <Clock className="h-3 w-3" />
              <span>{formatDateRange(event.start, event.end)}</span>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-1">
                <MapPin className="h-3 w-3" />
                <span>{event.location}</span>
              </div>
            )}

            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-2">
                <Users className="h-3 w-3" />
                <div className="flex flex-wrap gap-1">
                  {event.attendees.slice(0, 3).map((attendee, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs"
                    >
                      {getResponseStatusIcon(attendee.responseStatus || "needsAction")}
                      {attendee.email.split("@")[0]}
                    </span>
                  ))}
                  {event.attendees.length > 3 && (
                    <span className="text-slate-500">
                      +{event.attendees.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Calendar Event Created Component
// ============================================================================

export function CalendarEventCreated({
  summary,
  startTime,
  endTime,
  htmlLink,
  message,
  error,
}: CalendarEventCreatedProps) {
  if (error) {
    return <CalendarError message={message} />;
  }

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br from-green-50 to-emerald-100",
      "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
      "p-5 my-3 shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
          Event Created
        </h3>
      </div>

      {/* Event Details */}
      <div className="rounded-lg bg-white/70 dark:bg-slate-800/50 p-3 border border-green-200/50 dark:border-slate-600/50">
        <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-2">
          {summary}
        </h4>
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{formatDateRange(startTime, endTime)}</span>
        </div>
        {htmlLink && (
          <a
            href={htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View in Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Calendar Event Updated Component
// ============================================================================

export function CalendarEventUpdated({
  summary,
  startTime,
  endTime,
  htmlLink,
  message,
  error,
}: CalendarEventUpdatedProps) {
  if (error) {
    return <CalendarError message={message} />;
  }

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br from-blue-50 to-sky-100",
      "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
      "p-5 my-3 shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
          Event Updated
        </h3>
      </div>

      {/* Event Details */}
      <div className="rounded-lg bg-white/70 dark:bg-slate-800/50 p-3 border border-blue-200/50 dark:border-slate-600/50">
        <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-2">
          {summary}
        </h4>
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{formatDateRange(startTime, endTime)}</span>
        </div>
        {htmlLink && (
          <a
            href={htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View in Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Calendar Event Deleted Component
// ============================================================================

export function CalendarEventDeleted({
  eventId,
  deleted,
  message,
  error,
}: CalendarEventDeletedProps) {
  if (error || !deleted) {
    return <CalendarError message={message || "Failed to delete event"} />;
  }

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br from-amber-50 to-orange-100",
      "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
      "p-5 my-3 shadow-sm"
    )}>
      <div className="flex items-center gap-2">
        <CalendarX className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            Event Deleted
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {message || `Event ${eventId} has been removed from your calendar`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Calendar Availability Component
// ============================================================================

export function CalendarAvailability({
  freeSlots,
  slotCount,
  message,
  error,
}: CalendarAvailabilityProps) {
  if (error) {
    return <CalendarError message={message} />;
  }

  if (freeSlots.length === 0) {
    return (
      <div className={cn(
        "rounded-xl border bg-gradient-to-br from-gray-50 to-slate-100",
        "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
        "p-5 my-3"
      )}>
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <CalendarClock className="h-6 w-6" />
          <p className="text-sm">{message || "No available time slots found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br from-teal-50 to-cyan-100",
      "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
      "p-5 my-3 shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
          Available Time Slots ({slotCount})
        </h3>
      </div>

      {/* Free Slots List */}
      <div className="grid gap-2 sm:grid-cols-2">
        {freeSlots.map((slot, idx) => (
          <div
            key={idx}
            className={cn(
              "rounded-lg bg-white/70 dark:bg-slate-800/50 p-3",
              "border border-teal-200/50 dark:border-slate-600/50"
            )}
          >
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Clock className="h-3 w-3 text-teal-500" />
              <span className="font-medium">
                {formatDateRange(slot.start, slot.end)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              {slot.durationMinutes} minutes
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
