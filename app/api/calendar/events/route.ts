import { z } from "zod";
import {
  getValidAccessToken,
  calendarRequest,
  formatEventDateTime,
  parseEventResponse,
  type SimplifiedEvent,
} from "@/lib/google-calendar";

// Default user ID for development (in production, get from auth session)
const DEFAULT_USER_ID = "default-user";

// Request body schema for creating events
const createEventSchema = z.object({
  summary: z.string().min(1, "Event title is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  attendees: z.array(z.string().email()).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  timeZone: z.string().optional(),
  reminders: z.object({
    useDefault: z.boolean().optional(),
    overrides: z.array(z.object({
      method: z.enum(["email", "popup"]),
      minutes: z.number(),
    })).optional(),
  }).optional(),
  calendarId: z.string().optional(),
});

// Query params schema for listing events
const listEventsSchema = z.object({
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
  maxResults: z.string().optional(),
  query: z.string().optional(),
  calendarId: z.string().optional(),
});

/**
 * GET /api/calendar/events - List calendar events
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = listEventsSchema.parse({
      timeMin: searchParams.get("timeMin") || undefined,
      timeMax: searchParams.get("timeMax") || undefined,
      maxResults: searchParams.get("maxResults") || undefined,
      query: searchParams.get("query") || undefined,
      calendarId: searchParams.get("calendarId") || undefined,
    });

    // Get access token
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return Response.json(
        { error: "Not authenticated with Google Calendar. Please connect your Google account." },
        { status: 401 }
      );
    }

    // Build API query parameters
    const calendarId = params.calendarId || "primary";
    const queryParams = new URLSearchParams({
      orderBy: "startTime",
      singleEvents: "true",
      timeMin: params.timeMin || new Date().toISOString(),
    });

    if (params.timeMax) {
      queryParams.set("timeMax", params.timeMax);
    } else {
      // Default to 7 days from now
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      queryParams.set("timeMax", weekFromNow.toISOString());
    }

    if (params.maxResults) {
      queryParams.set("maxResults", params.maxResults);
    }

    if (params.query) {
      queryParams.set("q", params.query);
    }

    const result = await calendarRequest<{
      items: any[];
      nextPageToken?: string;
    }>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events?${queryParams.toString()}`
    );

    if (!result.success) {
      return Response.json(
        { error: result.error || "Failed to fetch calendar events" },
        { status: 500 }
      );
    }

    const events: SimplifiedEvent[] = (result.data?.items || []).map(parseEventResponse);

    return Response.json({
      events,
      nextPageToken: result.data?.nextPageToken,
    });
  } catch (error) {
    console.error("Calendar events GET error:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid parameters", details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events - Create a new calendar event
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const params = createEventSchema.parse(body);

    // Get access token
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return Response.json(
        { error: "Not authenticated with Google Calendar. Please connect your Google account." },
        { status: 401 }
      );
    }

    const calendarId = params.calendarId || "primary";

    // Build event object for Google Calendar API
    const event: Record<string, unknown> = {
      summary: params.summary,
      start: formatEventDateTime(params.startTime, params.timeZone),
      end: formatEventDateTime(params.endTime, params.timeZone),
    };

    if (params.description) {
      event.description = params.description;
    }

    if (params.location) {
      event.location = params.location;
    }

    if (params.attendees && params.attendees.length > 0) {
      event.attendees = params.attendees.map(email => ({ email }));
    }

    if (params.reminders) {
      event.reminders = params.reminders;
    }

    const result = await calendarRequest<any>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      "POST",
      event
    );

    if (!result.success) {
      return Response.json(
        { error: result.error || "Failed to create calendar event" },
        { status: 500 }
      );
    }

    const createdEvent = parseEventResponse(result.data);

    return Response.json({
      eventId: createdEvent.id,
      htmlLink: createdEvent.htmlLink,
      summary: createdEvent.summary,
      start: createdEvent.start,
      end: createdEvent.end,
    });
  } catch (error) {
    console.error("Calendar events POST error:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
