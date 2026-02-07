import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/google-calendar";
import { v4 as uuidv4 } from "uuid";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const DEFAULT_USER_ID = "default-user";

/**
 * POST /api/calendar/generate-meet-link
 * 
 * Generates a Google Meet link for a calendar event.
 * Returns a temporary event with a Google Meet conference attached.
 * 
 * The Meet link can be used immediately even before creating the actual event.
 */
export async function POST(req: NextRequest) {
  try {
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Calendar is not connected. Please connect your Google account first.",
      }, { status: 401 });
    }

    // Generate a unique request ID for the conference
    const requestId = uuidv4();

    // Create a minimal temporary event with Google Meet conference
    // This event will be created in the calendar, but can be deleted later if not needed
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const eventPayload = {
      summary: "Temporary Event - Google Meet Link",
      description: "This is a temporary event created to generate a Google Meet link. You can delete this event or update it with your actual event details.",
      start: {
        dateTime: startTime.toISOString(),
      },
      end: {
        dateTime: endTime.toISOString(),
      },
      conferenceData: {
        createRequest: {
          requestId: requestId,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    // Create the event with conference data
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: true,
        message: errorData.error?.message || `Failed to generate Meet link: ${response.statusText}`,
      }, { status: response.status });
    }

    const data = await response.json();

    // Extract the Google Meet link from the response
    const meetLink = data.conferenceData?.entryPoints?.find(
      (entry: { entryPointType: string }) => entry.entryPointType === "video"
    )?.uri;

    const hangoutLink = data.hangoutLink; // Fallback to hangout link

    if (!meetLink && !hangoutLink) {
      return NextResponse.json({
        error: true,
        message: "Failed to generate Google Meet link. Conference data not found in response.",
      }, { status: 500 });
    }

    // Delete the temporary event immediately since we only needed the Meet link
    await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events/${data.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      error: false,
      meetLink: meetLink || hangoutLink,
      message: "Google Meet link generated successfully!",
    });
  } catch (err) {
    console.error("Error generating Meet link:", err);
    return NextResponse.json({
      error: true,
      message: err instanceof Error ? err.message : "Failed to generate Google Meet link",
    }, { status: 500 });
  }
}
