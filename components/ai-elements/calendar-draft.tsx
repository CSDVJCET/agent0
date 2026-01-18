"use client";

import { useState } from "react";
import { CalendarIcon, ClockIcon, MapPinIcon, UsersIcon, AlignLeftIcon, CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarEvent } from "@/components/ai-elements/calendar-event";

interface CalendarDraftProps {
  draftId: string;
  defaultValues: {
    summary?: string;
    startTime?: string;
    endTime?: string;
    attendees?: string[];
    description?: string;
    location?: string;
    timeZone?: string;
  };
}

interface CreatedEventResult {
  summary: string;
  startTime: string;
  endTime: string;
  link?: string;
  eventId?: string;
}

const formatLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function CalendarDraft({ draftId, defaultValues }: CalendarDraftProps) {
  const startDate = defaultValues.startTime ? new Date(defaultValues.startTime) : undefined;
  const endDate = defaultValues.endTime ? new Date(defaultValues.endTime) : undefined;
  const normalizedStart = startDate || (endDate ? new Date(endDate.getTime() - 60 * 60 * 1000) : undefined);
  const normalizedEnd = endDate || (startDate ? new Date(startDate.getTime() + 60 * 60 * 1000) : undefined);

  const [formData, setFormData] = useState({
    summary: defaultValues.summary || "",
    startTime: normalizedStart ? formatLocalDateTime(normalizedStart) : "",
    endTime: normalizedEnd ? formatLocalDateTime(normalizedEnd) : "",
    attendees: defaultValues.attendees?.join(", ") || "",
    description: defaultValues.description || "",
    location: defaultValues.location || "",
  });
  const [status, setStatus] = useState<"pending" | "creating" | "created" | "error">("pending");
  const [createdEvent, setCreatedEvent] = useState<CreatedEventResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("creating");
    setErrorMessage(null);
    
    const attendeesList = formData.attendees
      ? formData.attendees.split(",").map(a => a.trim()).filter(Boolean)
      : [];

    try {
      const response = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.summary,
          startDateTime: new Date(formData.startTime).toISOString(),
          endDateTime: new Date(formData.endTime).toISOString(),
          attendees: attendeesList.length > 0 ? attendeesList : undefined,
          description: formData.description || undefined,
          location: formData.location || undefined,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.message || "Failed to create event");
      } else {
        setStatus("created");
        setCreatedEvent({
          summary: result.summary || formData.summary,
          startTime: result.startTime || new Date(formData.startTime).toISOString(),
          endTime: result.endTime || new Date(formData.endTime).toISOString(),
          link: result.link,
          eventId: result.eventId,
        });
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to create event");
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isValid = formData.summary && formData.startTime && formData.endTime;

  if (status === "created" && createdEvent) {
    return (
      <CalendarEvent
        summary={createdEvent.summary}
        startTime={createdEvent.startTime}
        endTime={createdEvent.endTime}
        link={createdEvent.link}
        location={formData.location}
      />
    );
  }

  if (status === "error") {
    return (
      <div className="w-full max-w-lg my-4 not-prose">
        <div className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
              <XIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to Create Event</h3>
              <p className="text-xs text-red-600/70 dark:text-red-500/70">{errorMessage}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStatus("pending")}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg my-4 not-prose">
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/50 bg-linear-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Complete Event Details</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Fill in the required information to create your event</p>
            </div>
          </div>
        </div>
        
        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title - Required */}
          <div className="space-y-2">
            <Label htmlFor={`summary-${draftId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              Event Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`summary-${draftId}`}
              value={formData.summary}
              onChange={(e) => handleChange("summary", e.target.value)}
              placeholder="Team Meeting, Coffee Chat, etc."
              className={cn(
                "h-10 transition-all",
                !formData.summary && "border-destructive/50 focus-visible:ring-destructive/20"
              )}
              required
              disabled={status === "creating"}
            />
          </div>

          {/* Date & Time - Required */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`start-${draftId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <ClockIcon className="w-3 h-3" />
                Start <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`start-${draftId}`}
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => handleChange("startTime", e.target.value)}
                className={cn(
                  "h-10 transition-all",
                  !formData.startTime && "border-destructive/50 focus-visible:ring-destructive/20"
                )}
                required
                disabled={status === "creating"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`end-${draftId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <ClockIcon className="w-3 h-3" />
                End <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`end-${draftId}`}
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => handleChange("endTime", e.target.value)}
                className={cn(
                  "h-10 transition-all",
                  !formData.endTime && "border-destructive/50 focus-visible:ring-destructive/20"
                )}
                required
                disabled={status === "creating"}
              />
            </div>
          </div>

          {/* Location - Optional */}
          <div className="space-y-2">
            <Label htmlFor={`location-${draftId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <MapPinIcon className="w-3 h-3" />
              Location
            </Label>
            <Input
              id={`location-${draftId}`}
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Office, Zoom link, or address"
              className="h-10"
              disabled={status === "creating"}
            />
          </div>

          {/* Attendees - Optional */}
          <div className="space-y-2">
            <Label htmlFor={`attendees-${draftId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <UsersIcon className="w-3 h-3" />
              Attendees
            </Label>
            <Input
              id={`attendees-${draftId}`}
              value={formData.attendees}
              onChange={(e) => handleChange("attendees", e.target.value)}
              placeholder="email@example.com, another@example.com"
              className="h-10"
              disabled={status === "creating"}
            />
            <p className="text-[10px] text-muted-foreground">Separate multiple emails with commas</p>
          </div>

          {/* Description - Optional */}
          <div className="space-y-2">
            <Label htmlFor={`description-${draftId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <AlignLeftIcon className="w-3 h-3" />
              Description
            </Label>
            <Textarea
              id={`description-${draftId}`}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Add agenda, notes, or other details..."
              className="min-h-[90px] resize-none"
              disabled={status === "creating"}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button 
              type="submit"
              disabled={!isValid || status === "creating"}
              className="w-full h-11 gap-2 font-medium shadow-sm"
              size="lg"
            >
              {status === "creating" ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Creating Event...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Confirm & Create Event
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
