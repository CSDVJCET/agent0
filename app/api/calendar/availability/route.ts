import { z } from "zod";
import {
  getValidAccessToken,
  calendarRequest,
} from "@/lib/google-calendar";

// Default user ID for development (in production, get from auth session)
const DEFAULT_USER_ID = "default-user";

// Request body schema for checking availability
const availabilitySchema = z.object({
  timeMin: z.string().min(1, "Start time is required"),
  timeMax: z.string().min(1, "End time is required"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  attendees: z.array(z.string().email()).optional(),
  timeZone: z.string().optional(),
  workingHoursOnly: z.boolean().optional().default(true),
});

interface FreeBusyResponse {
  calendars: {
    [calendarId: string]: {
      busy: Array<{ start: string; end: string }>;
    };
  };
}

interface TimeSlot {
  start: string;
  end: string;
  duration: number;
}

/**
 * POST /api/calendar/availability - Find free time slots
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const params = availabilitySchema.parse(body);

    // Get access token
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return Response.json(
        { error: "Not authenticated with Google Calendar. Please connect your Google account." },
        { status: 401 }
      );
    }

    const timeZone = params.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Build freeBusy request
    const freeBusyRequest = {
      timeMin: new Date(params.timeMin).toISOString(),
      timeMax: new Date(params.timeMax).toISOString(),
      timeZone,
      items: [
        { id: "primary" },
        ...(params.attendees?.map(email => ({ id: email })) || []),
      ],
    };

    const result = await calendarRequest<FreeBusyResponse>(
      accessToken,
      "/freeBusy",
      "POST",
      freeBusyRequest
    );

    if (!result.success) {
      return Response.json(
        { error: result.error || "Failed to check availability" },
        { status: 500 }
      );
    }

    // Merge all busy periods from all calendars
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
    const freeSlots: TimeSlot[] = [];
    const startTime = new Date(params.timeMin);
    const endTime = new Date(params.timeMax);
    const durationMs = params.duration * 60 * 1000;

    // Working hours configuration (9 AM - 6 PM)
    const workingHoursStart = 9;
    const workingHoursEnd = 18;

    // Helper to check if a time is within working hours
    const isWithinWorkingHours = (date: Date): boolean => {
      if (!params.workingHoursOnly) return true;
      const hours = date.getHours();
      const day = date.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (day === 0 || day === 6) return false;
      return hours >= workingHoursStart && hours < workingHoursEnd;
    };

    // Find gaps between busy periods
    let currentTime = startTime;

    for (const busy of mergedBusy) {
      // Check the gap before this busy period
      if (currentTime < busy.start) {
        // Find free time in this gap
        let slotStart = new Date(currentTime);
        const gapEnd = new Date(Math.min(busy.start.getTime(), endTime.getTime()));

        while (slotStart.getTime() + durationMs <= gapEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + durationMs);
          
          // Check if slot is within working hours
          if (isWithinWorkingHours(slotStart) && isWithinWorkingHours(slotEnd)) {
            freeSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              duration: params.duration,
            });
          }

          // Move to next potential slot (30-minute increments)
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
            duration: params.duration,
          });
        }

        slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000);
      }
    }

    // Limit results to prevent excessive response size
    const limitedSlots = freeSlots.slice(0, 20);

    return Response.json({
      freeSlots: limitedSlots,
      busyPeriods: mergedBusy.map(p => ({
        start: p.start.toISOString(),
        end: p.end.toISOString(),
      })),
      totalFreeSlots: freeSlots.length,
    });
  } catch (error) {
    console.error("Calendar availability POST error:", error);
    
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
