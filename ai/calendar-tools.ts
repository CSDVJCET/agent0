import { tool } from "ai";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

/**
 * Google Calendar Tools for Agent0
 * 
 * These tools allow the AI agent to interact with Google Calendar API directly.
 * Users invoke these tools using @calendar mentions in their prompts.
 * 
 * Available operations:
 * - createEvent: Create a new calendar event
 * - listEvents: List upcoming calendar events
 * - updateEvent: Modify an existing event
 * - deleteEvent: Remove an event
 * - findAvailability: Find free time slots
 */

// Google Calendar API base URL
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

// Default user ID for development (matches what we use in auth routes)
const DEFAULT_USER_ID = "default-user";

// Get access token from token store
async function getAccessToken(): Promise<string | null> {
  // Try to get token for default user
  return await getValidAccessToken(DEFAULT_USER_ID);
}

/**
 * Format date for Google Calendar API
 */
function formatEventDateTime(
  dateString: string,
  timeZone?: string
): { dateTime: string; timeZone?: string } | { date: string } {
  // Check if it's an all-day event (no time component)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return { date: dateString };
  }
  
  // For datetime strings, ensure ISO format
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return {
    dateTime: date.toISOString(),
    ...(timeZone && { timeZone }),
  };
}

/**
 * Make authenticated request to Google Calendar API
 */
async function calendarRequest<T>(
  accessToken: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${CALENDAR_API_BASE}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `API request failed: ${response.statusText}`,
      };
    }

    // Handle 204 No Content (e.g., for delete operations)
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Parse Google Calendar event to simplified format
 */
function parseEvent(event: any) {
  return {
    id: event.id,
    title: event.summary || "(No title)",
    description: event.description,
    location: event.location,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    attendees: event.attendees?.map((a: any) => ({
      email: a.email,
      displayName: a.displayName,
      responseStatus: a.responseStatus,
    })),
    organizer: event.organizer && {
      email: event.organizer.email,
      displayName: event.organizer.displayName,
    },
    link: event.htmlLink,
    status: event.status,
  };
}

/**
 * Draft a calendar event for user confirmation
 */
export const draftEventTool = tool({
  description: "Draft a calendar event for the user to review before creating it. Use this ONLY when critical information is missing (title OR date/time). If you have the title and date/time from the prompt, use createCalendarEvent directly instead.",
  inputSchema: z.object({
    summary: z.string().optional().describe("The title/name of the event from the prompt"),
    startTime: z.string().optional().describe("Start time in ISO 8601 format derived from the prompt"),
    endTime: z.string().optional().describe("End time in ISO 8601 format derived from the prompt"),
    attendees: z.array(z.string().email()).optional().describe("List of attendee email addresses from the prompt"),
    description: z.string().optional().describe("Detailed description from the prompt"),
    location: z.string().optional().describe("Location from the prompt"),
    timeZone: z.string().optional().describe("Timezone (e.g., 'America/New_York'). Use user's local timezone if not specified."),
  }),
  execute: async (params) => {
    return {
      ...params,
      draftId: crypto.randomUUID(),
      status: "draft",
      message: "Please review and complete the event details.",
    };
  },
});

/**
 * Create a new calendar event
 */
export const createEventTool = tool({
  description: "Create a new calendar event directly when you have the title and date/time. Use this when the user provides sufficient details (at minimum: title and start time). For confirmation workflow or missing critical info, use draftCalendarEvent instead.",
  inputSchema: z.object({
    summary: z.string().describe("The title/name of the event"),
    startTime: z.string().describe("Start time in ISO 8601 format (e.g., 2024-01-15T10:00:00-05:00)"),
    endTime: z.string().describe("End time in ISO 8601 format (e.g., 2024-01-15T11:00:00-05:00)"),
    attendees: z.array(z.string().email()).optional().describe("List of attendee email addresses"),
    description: z.string().optional().describe("Detailed description of the event"),
    location: z.string().optional().describe("Location of the event (physical address or virtual meeting link)"),
    timeZone: z.string().optional().describe("Timezone for the event (e.g., 'America/New_York'). Defaults to UTC."),
  }),
  execute: async ({ summary, startTime, endTime, attendees, description, location, timeZone }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Calendar is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const event: Record<string, unknown> = {
        summary,
        start: formatEventDateTime(startTime, timeZone),
        end: formatEventDateTime(endTime, timeZone),
      };

      if (description) event.description = description;
      if (location) event.location = location;
      if (attendees && attendees.length > 0) {
        event.attendees = attendees.map(email => ({ email }));
      }

      const result = await calendarRequest<any>(
        accessToken,
        "/calendars/primary/events",
        "POST",
        event
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to create calendar event",
        };
      }

      const created = parseEvent(result.data);
      return {
        error: false,
        eventId: created.id,
        summary: created.title,
        startTime: created.start,
        endTime: created.end,
        link: created.link,
        message: `Successfully created event "${created.title}"`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to create event",
      };
    }
  },
});

/**
 * List upcoming calendar events
 */
export const listEventsTool = tool({
  description: "List upcoming calendar events within a specified time range. Use this when the user asks about their schedule, upcoming meetings, or what's on their calendar.",
  inputSchema: z.object({
    timeMin: z.string().optional().describe("Start of the time range in ISO 8601 format. Defaults to now."),
    timeMax: z.string().optional().describe("End of the time range in ISO 8601 format. Defaults to 7 days from now."),
    maxResults: z.number().optional().default(10).describe("Maximum number of events to return (1-100)"),
    query: z.string().optional().describe("Free text search query to filter events"),
  }),
  execute: async ({ timeMin, timeMax, maxResults, query }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Calendar is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const params = new URLSearchParams({
        orderBy: "startTime",
        singleEvents: "true",
        timeMin: timeMin || new Date().toISOString(),
        maxResults: String(maxResults || 10),
      });

      if (timeMax) {
        params.set("timeMax", timeMax);
      } else {
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        params.set("timeMax", weekFromNow.toISOString());
      }

      if (query) {
        params.set("q", query);
      }

      const result = await calendarRequest<{ items: any[] }>(
        accessToken,
        `/calendars/primary/events?${params.toString()}`
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to list calendar events",
        };
      }

      const events = (result.data?.items || []).map(parseEvent);
      
      return {
        error: false,
        eventCount: events.length,
        events,
        message: events.length > 0 
          ? `Found ${events.length} event(s)` 
          : "No events found in the specified time range",
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to list events",
      };
    }
  },
});

/**
 * Update an existing calendar event
 */
export const updateEventTool = tool({
  description: "Update an existing calendar event. Use this when the user wants to modify, reschedule, or change details of an existing event.",
  inputSchema: z.object({
    eventId: z.string().describe("The ID of the event to update"),
    summary: z.string().optional().describe("New title for the event"),
    startTime: z.string().optional().describe("New start time in ISO 8601 format"),
    endTime: z.string().optional().describe("New end time in ISO 8601 format"),
    attendees: z.array(z.string().email()).optional().describe("Updated list of attendee email addresses"),
    description: z.string().optional().describe("Updated description"),
    location: z.string().optional().describe("Updated location"),
    timeZone: z.string().optional().describe("Timezone for the event"),
  }),
  execute: async ({ eventId, summary, startTime, endTime, attendees, description, location, timeZone }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Calendar is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      // First, get the existing event
      const existingResult = await calendarRequest<any>(
        accessToken,
        `/calendars/primary/events/${encodeURIComponent(eventId)}`
      );

      if (!existingResult.success) {
        return {
          error: true,
          message: existingResult.error || "Failed to fetch existing event",
        };
      }

      // Build updated event object
      const event = { ...existingResult.data };

      if (summary !== undefined) event.summary = summary;
      if (startTime !== undefined) event.start = formatEventDateTime(startTime, timeZone);
      if (endTime !== undefined) event.end = formatEventDateTime(endTime, timeZone);
      if (description !== undefined) event.description = description;
      if (location !== undefined) event.location = location;
      if (attendees !== undefined) event.attendees = attendees.map(email => ({ email }));

      const result = await calendarRequest<any>(
        accessToken,
        `/calendars/primary/events/${encodeURIComponent(eventId)}`,
        "PUT",
        event
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to update calendar event",
        };
      }

      const updated = parseEvent(result.data);
      return {
        error: false,
        eventId: updated.id,
        summary: updated.title,
        startTime: updated.start,
        endTime: updated.end,
        link: updated.link,
        message: `Successfully updated event "${updated.title}"`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to update event",
      };
    }
  },
});

/**
 * Delete a calendar event
 */
export const deleteEventTool = tool({
  description: "Delete/cancel a calendar event. Use this when the user wants to remove or cancel an event from their calendar.",
  inputSchema: z.object({
    eventId: z.string().describe("The ID of the event to delete"),
    sendNotifications: z.boolean().optional().default(true).describe("Whether to send cancellation notifications to attendees"),
  }),
  execute: async ({ eventId, sendNotifications }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Calendar is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const params = new URLSearchParams({
        sendNotifications: String(sendNotifications),
      });

      const result = await calendarRequest<void>(
        accessToken,
        `/calendars/primary/events/${encodeURIComponent(eventId)}?${params.toString()}`,
        "DELETE"
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to delete calendar event",
        };
      }

      return {
        error: false,
        deleted: true,
        eventId,
        message: `Successfully deleted event ${eventId}`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to delete event",
      };
    }
  },
});

/**
 * Find available time slots
 */
export const findAvailabilityTool = tool({
  description: "Find free/available time slots in the calendar. Use this when the user wants to find a good time for a meeting or check their availability.",
  inputSchema: z.object({
    timeMin: z.string().describe("Start of the time range to check in ISO 8601 format"),
    timeMax: z.string().describe("End of the time range to check in ISO 8601 format"),
    duration: z.number().describe("Required duration in minutes for the free slot"),
    attendees: z.array(z.string().email()).optional().describe("Email addresses of other attendees to check availability for"),
    workingHoursOnly: z.boolean().optional().default(true).describe("Only return slots during working hours (9 AM - 6 PM)"),
  }),
  execute: async ({ timeMin, timeMax, duration, attendees, workingHoursOnly }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Calendar is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      // Use freeBusy API to get busy times
      const freeBusyRequest = {
        timeMin: new Date(timeMin).toISOString(),
        timeMax: new Date(timeMax).toISOString(),
        items: [
          { id: "primary" },
          ...(attendees?.map(email => ({ id: email })) || []),
        ],
      };

      const result = await calendarRequest<{
        calendars: { [id: string]: { busy: Array<{ start: string; end: string }> } };
      }>(
        accessToken,
        "/freeBusy",
        "POST",
        freeBusyRequest
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to check availability",
        };
      }

      // Merge all busy periods
      const allBusyPeriods: Array<{ start: Date; end: Date }> = [];
      
      if (result.data?.calendars) {
        for (const calendar of Object.values(result.data.calendars)) {
          for (const period of calendar.busy || []) {
            allBusyPeriods.push({
              start: new Date(period.start),
              end: new Date(period.end),
            });
          }
        }
      }

      // Sort and merge overlapping busy periods
      allBusyPeriods.sort((a, b) => a.start.getTime() - b.start.getTime());
      
      const mergedBusy: Array<{ start: Date; end: Date }> = [];
      for (const period of allBusyPeriods) {
        const last = mergedBusy[mergedBusy.length - 1];
        if (last && period.start <= last.end) {
          last.end = new Date(Math.max(last.end.getTime(), period.end.getTime()));
        } else {
          mergedBusy.push({ ...period });
        }
      }

      // Find free slots
      const freeSlots: Array<{ start: string; end: string; durationMinutes: number }> = [];
      const startTime = new Date(timeMin);
      const endTime = new Date(timeMax);
      const durationMs = duration * 60 * 1000;

      const workingHoursStart = 9;
      const workingHoursEnd = 18;

      const isWithinWorkingHours = (date: Date): boolean => {
        if (!workingHoursOnly) return true;
        const hours = date.getHours();
        const day = date.getDay();
        if (day === 0 || day === 6) return false;
        return hours >= workingHoursStart && hours < workingHoursEnd;
      };

      let currentTime = startTime;

      for (const busy of mergedBusy) {
        if (currentTime < busy.start) {
          let slotStart = new Date(currentTime);
          const gapEnd = new Date(Math.min(busy.start.getTime(), endTime.getTime()));

          while (slotStart.getTime() + durationMs <= gapEnd.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + durationMs);
            
            if (isWithinWorkingHours(slotStart) && isWithinWorkingHours(slotEnd)) {
              freeSlots.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
                durationMinutes: duration,
              });
            }

            slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
          }
        }

        currentTime = new Date(Math.max(currentTime.getTime(), busy.end.getTime()));
      }

      // Check for free time after all busy periods
      if (currentTime < endTime) {
        let slotStart = new Date(currentTime);

        while (slotStart.getTime() + durationMs <= endTime.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + durationMs);
          
          if (isWithinWorkingHours(slotStart) && isWithinWorkingHours(slotEnd)) {
            freeSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              durationMinutes: duration,
            });
          }

          slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
        }
      }

      // Limit results
      const limitedSlots = freeSlots.slice(0, 20);

      return {
        error: false,
        slotCount: limitedSlots.length,
        freeSlots: limitedSlots,
        busyPeriods: mergedBusy.map(p => ({
          start: p.start.toISOString(),
          end: p.end.toISOString(),
        })),
        message: limitedSlots.length > 0
          ? `Found ${limitedSlots.length} available time slot(s)`
          : "No available time slots found in the specified range",
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to find availability",
      };
    }
  },
});

/**
 * Get event details by ID
 */
export const getEventTool = tool({
  description: "Get detailed information about a specific calendar event by its ID.",
  inputSchema: z.object({
    eventId: z.string().describe("The ID of the event to retrieve"),
  }),
  execute: async ({ eventId }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Calendar is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const result = await calendarRequest<any>(
        accessToken,
        `/calendars/primary/events/${encodeURIComponent(eventId)}`
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to get event details",
        };
      }

      return {
        error: false,
        event: parseEvent(result.data),
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to get event",
      };
    }
  },
});
/**
 * Schedule an event with human-in-the-loop confirmation
 * This is the main tool for event scheduling - extracts details and presents confirmation UI
 */
export const scheduleEventTool = tool({
  description: `Schedule a calendar event by extracting ALL details from the user's request. NEVER ask for clarification - always infer missing details:
- If no title is given, infer from context (e.g., "meeting", "call", "appointment")
- If no duration is given, default to 1 hour
- If no specific time is given but a date is, default to 9:00 AM
- Always generate the form immediately, the user can edit before confirming

Use this tool IMMEDIATELY when the user mentions scheduling, booking, or creating any calendar event.`,
  inputSchema: z.object({
    title: z.string().describe("Event title - ALWAYS provide one. Infer from context like 'meeting', 'standup', 'call', 'appointment'. Never leave empty."),
    startDateTime: z.string().describe("Start date and time in ISO 8601 format. Parse 'tomorrow', 'next Monday', etc. If only date given, use 9:00 AM."),
    endDateTime: z.string().optional().describe("End time. If not specified, defaults to 1 hour after start."),
    location: z.string().optional().describe("Location if mentioned"),
    attendees: z.array(z.string().email()).optional().describe("Attendee emails if mentioned"),
    description: z.string().optional().describe("Description if mentioned"),
    reasoning: z.string().describe("Brief explanation of inferred details"),
  }),
  execute: async ({ title, startDateTime, endDateTime, location, attendees, description, reasoning }) => {
    // Calculate end time if not provided (default 1 hour duration)
    const startDate = new Date(startDateTime);
    let endDate: Date;
    
    if (endDateTime) {
      endDate = new Date(endDateTime);
    } else {
      // Default to 1 hour duration
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }

    return {
      status: "pending_confirmation",
      eventDetails: {
        title,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        location: location || "",
        attendees: attendees || [],
        description: description || "",
        durationMinutes: Math.round((endDate.getTime() - startDate.getTime()) / (60 * 1000)),
      },
      reasoning,
      message: "Please review the event details and confirm to create the event.",
    };
  },
});

/**
 * Confirm and create a scheduled event after human approval
 */
export const confirmScheduledEventTool = tool({
  description: "Create a calendar event after user confirmation. Use this to finalize event creation after the user has reviewed and approved the details.",
  inputSchema: z.object({
    title: z.string().describe("Event title"),
    startDateTime: z.string().describe("Start date and time in ISO 8601 format"),
    endDateTime: z.string().describe("End date and time in ISO 8601 format"),
    location: z.string().optional().describe("Event location"),
    attendees: z.array(z.string().email()).optional().describe("Attendee email addresses"),
    description: z.string().optional().describe("Event description"),
  }),
  execute: async ({ title, startDateTime, endDateTime, location, attendees, description }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Calendar is not connected. Please connect your Google account first.",
      };
    }

    try {
      const event: Record<string, unknown> = {
        summary: title,
        start: formatEventDateTime(startDateTime),
        end: formatEventDateTime(endDateTime),
      };

      if (description) event.description = description;
      if (location) event.location = location;
      if (attendees && attendees.length > 0) {
        event.attendees = attendees.map(email => ({ email }));
      }

      const result = await calendarRequest<any>(
        accessToken,
        "/calendars/primary/events",
        "POST",
        event
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to create calendar event",
        };
      }

      const created = parseEvent(result.data);
      return {
        error: false,
        status: "created",
        eventId: created.id,
        summary: created.title,
        startTime: created.start,
        endTime: created.end,
        link: created.link,
        message: `Event "${created.title}" has been created successfully!`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to create event",
      };
    }
  },
});

/**
 * Export all calendar tools
 */
export const calendarTools = {
  scheduleCalendarEvent: scheduleEventTool,
  confirmScheduledEvent: confirmScheduledEventTool,
  createCalendarEvent: createEventTool,
  draftCalendarEvent: draftEventTool,
  listCalendarEvents: listEventsTool,
  updateCalendarEvent: updateEventTool,
  deleteCalendarEvent: deleteEventTool,
  findCalendarAvailability: findAvailabilityTool,
  getCalendarEvent: getEventTool,
};

export default calendarTools;

