import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";
const DEFAULT_USER_ID = "default-user";

// Request schema
const createTaskSchema = z.object({
  title: z.string(),
  notes: z.string().optional(),
  due: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  taskListId: z.string().optional(),
  parent: z.string().optional(),
});

function formatTaskDueDate(dateString: string, time?: string): string {
  // If time is provided separately, combine it
  if (time) {
    const localDate = new Date(`${dateString}T${time}:00`);
    return localDate.toISOString();
  }
  
  // If already in ISO format with time, preserve it
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateString)) {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  // Date-only format - set to end of day
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const localDate = new Date(`${dateString}T23:59:59`);
    return localDate.toISOString();
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  
  return date.toISOString();
}

function addPriorityToNotes(notes: string | undefined, priority: string | undefined): string {
  const existingNotes = notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').replace(/\[TIME:\s*\d{2}:\d{2}\]\s*/gi, '').trim() || '';
  if (!priority) return existingNotes;
  return `[PRIORITY: ${priority}] ${existingNotes}`.trim();
}

function addTimeToNotes(notes: string | undefined, time: string | undefined): string {
  const existingNotes = notes || '';
  if (!time) return existingNotes;
  return `${existingNotes} [TIME: ${time}]`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createTaskSchema.parse(body);

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first.",
      }, { status: 401 });
    }

    let dueDateTime: string | undefined;
    
    // Process due date/time
    if (parsed.due) {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(parsed.due)) {
        // Already has time component
        const date = new Date(parsed.due);
        dueDateTime = date.toISOString();
      } else {
        // Date only
        dueDateTime = parsed.due;
      }
    }

    const task: Record<string, unknown> = {
      title: parsed.title,
      status: "needsAction",
    };

    // Add priority to notes (keep time in notes as backup)
    let taskNotes = addPriorityToNotes(parsed.notes, parsed.priority);
    
    // If we have a datetime, extract time and store in notes as backup
    if (dueDateTime && /T\d{2}:\d{2}/.test(dueDateTime)) {
      const date = new Date(dueDateTime);
      const dueTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      taskNotes = addTimeToNotes(taskNotes, dueTime);
    }
    
    if (taskNotes) {
      task.notes = taskNotes;
    }

    if (dueDateTime) {
      task.due = formatTaskDueDate(dueDateTime);
    }

    const listId = parsed.taskListId || "@default";
    let url = `${TASKS_API_BASE}/lists/${encodeURIComponent(listId)}/tasks`;
    if (parsed.parent) {
      url += `?parent=${encodeURIComponent(parsed.parent)}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: true,
        message: errorData.error?.message || `API request failed: ${response.statusText}`,
      }, { status: response.status });
    }

    const data = await response.json();

    // Extract time from notes metadata
    const extractTime = (notes: string | undefined): string | undefined => {
      if (!notes) return undefined;
      const match = notes.match(/\[TIME:\s*(\d{2}:\d{2})\]/i);
      return match ? match[1] : undefined;
    };

    // Parse due date with time
    const parseDueWithTime = (isoString: string | undefined, notes: string | undefined): string | undefined => {
      if (!isoString) return undefined;
      
      // Check if there's a time stored in notes metadata as fallback
      const noteTime = extractTime(notes);
      
      if (noteTime) {
        // Use time from notes if available
        const date = new Date(isoString);
        const dateOnly = date.toISOString().split('T')[0];
        const localDate = new Date(`${dateOnly}T${noteTime}:00`);
        return localDate.toISOString();
      }
      
      // Return the full ISO string (includes time from Google Tasks)
      return isoString;
    };

    return NextResponse.json({
      error: false,
      taskId: data.id,
      title: data.title,
      notes: data.notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').replace(/\[TIME:\s*\d{2}:\d{2}\]\s*/gi, '').trim(),
      due: parseDueWithTime(data.due, data.notes),
      priority: parsed.priority,
      status: data.status,
      message: `Task "${data.title}" created successfully!`,
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
      message: err instanceof Error ? err.message : "Unknown error occurred",
    }, { status: 500 });
  }
}
