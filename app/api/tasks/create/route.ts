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

function formatTaskDueDate(dateString: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return `${dateString}T23:59:59.000Z`;
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  
  return date.toISOString();
}

function addPriorityToNotes(notes: string | undefined, priority: string | undefined): string {
  const existingNotes = notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').trim() || '';
  if (!priority) return existingNotes;
  return `[PRIORITY: ${priority}] ${existingNotes}`.trim();
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

    const task: Record<string, unknown> = {
      title: parsed.title,
      status: "needsAction",
    };

    if (parsed.notes || parsed.priority) {
      task.notes = addPriorityToNotes(parsed.notes, parsed.priority);
    }

    if (parsed.due) {
      task.due = formatTaskDueDate(parsed.due);
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

    return NextResponse.json({
      error: false,
      taskId: data.id,
      title: data.title,
      notes: data.notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').trim(),
      due: data.due?.split('T')[0],
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
