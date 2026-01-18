import { z } from "zod";
import {
  getValidAccessToken,
  calendarRequest,
  formatEventDateTime,
  parseEventResponse,
} from "@/lib/google-calendar";

// Default user ID for development (in production, get from auth session)
const DEFAULT_USER_ID = "default-user";

// Request body schema for updating events
const updateEventSchema = z.object({
  summary: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  timeZone: z.string().optional(),
  calendarId: z.string().optional(),
});

// Request body schema for deleting events
const deleteEventSchema = z.object({
  calendarId: z.string().optional(),
  sendNotifications: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

/**
 * GET /api/calendar/events/[eventId] - Get a specific event
 */
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId") || "primary";

    // Get access token
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return Response.json(
        { error: "Not authenticated with Google Calendar. Please connect your Google account." },
        { status: 401 }
      );
    }

    const result = await calendarRequest<any>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    );

    if (!result.success) {
      return Response.json(
        { error: result.error || "Failed to fetch event" },
        { status: 500 }
      );
    }

    const event = parseEventResponse(result.data);

    return Response.json(event);
  } catch (error) {
    console.error("Calendar event GET error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/calendar/events/[eventId] - Update an existing event
 */
export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const { eventId } = await context.params;
    const body = await request.json();
    const params = updateEventSchema.parse(body);

    // Get access token
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return Response.json(
        { error: "Not authenticated with Google Calendar. Please connect your Google account." },
        { status: 401 }
      );
    }

    const calendarId = params.calendarId || "primary";

    // First, get the existing event to merge with updates
    const existingResult = await calendarRequest<any>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    );

    if (!existingResult.success) {
      return Response.json(
        { error: existingResult.error || "Failed to fetch existing event" },
        { status: 500 }
      );
    }

    // Build updated event object
    const event: Record<string, unknown> = {
      ...existingResult.data,
    };

    if (params.summary !== undefined) {
      event.summary = params.summary;
    }

    if (params.startTime !== undefined) {
      event.start = formatEventDateTime(params.startTime, params.timeZone);
    }

    if (params.endTime !== undefined) {
      event.end = formatEventDateTime(params.endTime, params.timeZone);
    }

    if (params.description !== undefined) {
      event.description = params.description;
    }

    if (params.location !== undefined) {
      event.location = params.location;
    }

    if (params.attendees !== undefined) {
      event.attendees = params.attendees.map(email => ({ email }));
    }

    const result = await calendarRequest<any>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      "PUT",
      event
    );

    if (!result.success) {
      return Response.json(
        { error: result.error || "Failed to update calendar event" },
        { status: 500 }
      );
    }

    const updatedEvent = parseEventResponse(result.data);

    return Response.json({
      eventId: updatedEvent.id,
      summary: updatedEvent.summary,
      start: updatedEvent.start,
      end: updatedEvent.end,
      htmlLink: updatedEvent.htmlLink,
    });
  } catch (error) {
    console.error("Calendar event PUT error:", error);
    
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

/**
 * DELETE /api/calendar/events/[eventId] - Delete an event
 */
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const { eventId } = await context.params;
    
    // Parse body for optional parameters
    let params = { calendarId: "primary", sendNotifications: true };
    try {
      const body = await request.json();
      const parsed = deleteEventSchema.parse(body);
      params = { ...params, ...parsed };
    } catch {
      // Body is optional for DELETE
    }

    // Get access token
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return Response.json(
        { error: "Not authenticated with Google Calendar. Please connect your Google account." },
        { status: 401 }
      );
    }

    const calendarId = params.calendarId || "primary";
    const queryParams = new URLSearchParams({
      sendNotifications: String(params.sendNotifications),
    });

    const result = await calendarRequest<void>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?${queryParams.toString()}`,
      "DELETE"
    );

    if (!result.success) {
      return Response.json(
        { error: result.error || "Failed to delete calendar event" },
        { status: 500 }
      );
    }

    return Response.json({ deleted: true, eventId });
  } catch (error) {
    console.error("Calendar event DELETE error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
