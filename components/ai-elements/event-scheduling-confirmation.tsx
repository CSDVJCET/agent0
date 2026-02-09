"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  UsersIcon, 
  AlignLeftIcon, 
  CheckIcon, 
  XIcon,
  Loader2Icon,
  BrainIcon,
  SparklesIcon,
  ExternalLinkIcon,
  VideoIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "motion/react";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";

interface EventDetails {
  title: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  attendees?: string[];
  description?: string;
  durationMinutes?: number;
}

interface CreatedEventResult {
  summary: string;
  startTime: string;
  endTime: string;
  link?: string;
  eventId?: string;
}

interface EventSchedulingConfirmationProps {
  toolCallId: string;
  eventDetails: EventDetails;
  reasoning: string;
}

// Helper to format date as local datetime-local value
const formatLocalDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function EventSchedulingConfirmation({
  toolCallId,
  eventDetails,
  reasoning,
}: EventSchedulingConfirmationProps) {
  const [formData, setFormData] = useState({
    title: eventDetails.title || "",
    startDateTime: eventDetails.startDateTime 
      ? formatLocalDateTime(eventDetails.startDateTime)
      : "",
    endDateTime: eventDetails.endDateTime 
      ? formatLocalDateTime(eventDetails.endDateTime)
      : "",
    location: eventDetails.location || "",
    attendees: eventDetails.attendees?.join(", ") || "",
    description: eventDetails.description || "",
  });
  
  // Internal state management
  const [status, setStatus] = useState<"pending" | "creating" | "created" | "rejected" | "error">("pending");
  const [createdEvent, setCreatedEvent] = useState<CreatedEventResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateMeetLink = async () => {
    setIsGeneratingMeet(true);
    try {
      const response = await fetch("/api/calendar/generate-meet-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (result.error) {
        setErrorMessage(result.message || "Failed to generate Google Meet link");
      } else {
        // Update location field with the Meet link
        handleChange("location", result.meetLink);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate Google Meet link");
    } finally {
      setIsGeneratingMeet(false);
    }
  };

  const handleConfirm = async () => {
    setStatus("creating");
    setErrorMessage(null);
    
    const attendeesList = formData.attendees
      ? formData.attendees.split(",").map(a => a.trim()).filter(Boolean)
      : [];

    try {
      // Call the API directly to create the event
      const response = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          startDateTime: new Date(formData.startDateTime).toISOString(),
          endDateTime: new Date(formData.endDateTime).toISOString(),
          location: formData.location || undefined,
          attendees: attendeesList.length > 0 ? attendeesList : undefined,
          description: formData.description || undefined,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.message || "Failed to create event");
      } else {
        setStatus("created");
        setCreatedEvent({
          summary: result.summary || formData.title,
          startTime: result.startTime || formData.startDateTime,
          endTime: result.endTime || formData.endDateTime,
          link: result.link,
          eventId: result.eventId,
        });
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to create event");
    }
  };

  const handleReject = () => {
    setStatus("rejected");
  };

  const isValid = formData.title && formData.startDateTime && formData.endDateTime;

  // Show created event success state
  if (status === "created" && createdEvent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 via-green-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="border-b border-green-500/10 bg-gradient-to-br from-green-500/5 to-transparent p-4">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="p-2 rounded-lg bg-green-500/10 text-green-600 ring-1 ring-green-500/20"
              >
                <CheckIcon className="w-5 h-5" />
              </motion.div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-green-700 dark:text-green-400">Event Created Successfully</h3>
                <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5">Added to your Google Calendar</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <h4 className="font-semibold text-lg">{createdEvent.summary}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>{format(new Date(createdEvent.startTime), "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClockIcon className="h-4 w-4" />
              <span>
                {format(new Date(createdEvent.startTime), "h:mm a")} - {format(new Date(createdEvent.endTime), "h:mm a")}
              </span>
            </div>
            {createdEvent.link && (
              <Button variant="outline" size="sm" className="w-full mt-4 gap-2" asChild>
                <a href={createdEvent.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="h-4 w-4" />
                  Open in Google Calendar
                </a>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Show rejected state
  if (status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <XIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">Event Cancelled</h3>
              <p className="text-xs text-amber-600/70 dark:text-amber-500/70">The event was not created</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show error state
  if (status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
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
            <Button variant="outline" size="sm" onClick={() => setStatus("pending")}>
              Try Again
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-lg my-4 not-prose">
      {/* Chain of Thought - Agent Reasoning */}
      <ChainOfThought defaultOpen={false} className="mb-4">
        <ChainOfThoughtHeader>
          <span className="flex items-center gap-1.5">
            <SparklesIcon className="h-3.5 w-3.5" />
            Event Details Extracted
          </span>
        </ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <ChainOfThoughtStep 
            icon={BrainIcon} 
            label="Analyzing your request"
            status="complete"
          >
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{reasoning}</p>
          </ChainOfThoughtStep>
        </ChainOfThoughtContent>
      </ChainOfThought>

      {/* Event Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Review Event Details</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Confirm or edit the details before creating</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-5 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor={`title-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Event Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`title-${toolCallId}`}
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Event title"
              className="h-10"
              disabled={status === "creating"}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`start-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <ClockIcon className="w-3 h-3" />
                Start <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`start-${toolCallId}`}
                type="datetime-local"
                value={formData.startDateTime}
                onChange={(e) => handleChange("startDateTime", e.target.value)}
                className="h-10"
                disabled={status === "creating"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`end-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <ClockIcon className="w-3 h-3" />
                End <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`end-${toolCallId}`}
                type="datetime-local"
                value={formData.endDateTime}
                onChange={(e) => handleChange("endDateTime", e.target.value)}
                className="h-10"
                disabled={status === "creating"}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor={`location-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <MapPinIcon className="w-3 h-3" />
              Location
            </Label>
            <div className="flex gap-2">
              <Input
                id={`location-${toolCallId}`}
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="Office, Zoom link, or address"
                className="h-10 flex-1"
                disabled={status === "creating"}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateMeetLink}
                disabled={status === "creating" || isGeneratingMeet}
                className="h-10 w-10 shrink-0"
                title="Generate Google Meet link"
              >
                {isGeneratingMeet ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <VideoIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click the video icon to generate a Google Meet link
            </p>
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label htmlFor={`attendees-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <UsersIcon className="w-3 h-3" />
              Attendees
            </Label>
            <Input
              id={`attendees-${toolCallId}`}
              value={formData.attendees}
              onChange={(e) => handleChange("attendees", e.target.value)}
              placeholder="email@example.com, another@example.com"
              className="h-10"
              disabled={status === "creating"}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor={`description-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <AlignLeftIcon className="w-3 h-3" />
              Description
            </Label>
            <Textarea
              id={`description-${toolCallId}`}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Meeting notes, agenda..."
              className="min-h-[80px] resize-none"
              disabled={status === "creating"}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={status === "creating"}
              className="flex-1 h-11 gap-2"
            >
              <XIcon className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValid || status === "creating"}
              className="flex-1 h-11 gap-2"
            >
              {status === "creating" ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Create Event
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
