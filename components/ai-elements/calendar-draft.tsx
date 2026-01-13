"use client";

import { useState } from "react";
import { CalendarIcon, ClockIcon, MapPinIcon, UsersIcon, AlignLeftIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  onConfirm: (data: {
    summary: string;
    startTime: string;
    endTime: string;
    attendees: string[];
    description: string;
    location: string;
  }) => void;
}

export function CalendarDraft({ draftId, defaultValues, onConfirm }: CalendarDraftProps) {
  const [formData, setFormData] = useState({
    summary: defaultValues.summary || "",
    startTime: defaultValues.startTime ? new Date(defaultValues.startTime).toISOString().slice(0, 16) : "",
    endTime: defaultValues.endTime ? new Date(defaultValues.endTime).toISOString().slice(0, 16) : "",
    attendees: defaultValues.attendees?.join(", ") || "",
    description: defaultValues.description || "",
    location: defaultValues.location || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const attendeesList = formData.attendees
      ? formData.attendees.split(",").map(a => a.trim()).filter(Boolean)
      : [];

    onConfirm({
      summary: formData.summary,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      attendees: attendeesList,
      description: formData.description,
      location: formData.location,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isValid = formData.summary && formData.startTime && formData.endTime;

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
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button 
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full h-11 gap-2 font-medium shadow-sm"
              size="lg"
            >
              {isSubmitting ? (
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
