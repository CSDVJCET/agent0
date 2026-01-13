import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const DEFAULT_USER_ID = "default-user";

// Request schema
const createEventSchema = z.object({
  title: z.string(),
  startDateTime: z.string(),
  endDateTime: z.string(),
  location: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  description: z.string().optional(),
});

function formatEventDateTime(
  dateString: string,
  timeZone?: string
): { dateTime: string; timeZone?: string } | { date: string } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return { date: dateString };
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return {
    dateTime: date.toISOString(),
    ...(timeZone && { timeZone }),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createEventSchema.parse(body);

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Calendar is not connected. Please connect your Google account first.",
      }, { status: 401 });
    }

    const event: Record<string, unknown> = {
      summary: parsed.title,
      start: formatEventDateTime(parsed.startDateTime),
      end: formatEventDateTime(parsed.endDateTime),
    };

    if (parsed.description) event.description = parsed.description;
    if (parsed.location) event.location = parsed.location;
    if (parsed.attendees && parsed.attendees.length > 0) {
      event.attendees = parsed.attendees.map(email => ({ email }));
    }

    const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: true,
        message: errorData.error?.message || `API request failed: ${response.statusText}`,
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      error: false,
      eventId: data.id,
      summary: data.summary || parsed.title,
      startTime: data.start?.dateTime || data.start?.date,
      endTime: data.end?.dateTime || data.end?.date,
      link: data.htmlLink,
      message: `Event "${data.summary}" created successfully!`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({
        error: true,
        message: "Invalid request body",
        details: err.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: true,
      message: err instanceof Error ? err.message : "Failed to create event",
    }, { status: 500 });
  }
}
