import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";
const DEFAULT_USER_ID = "default-user";

const updateTaskSchema = z.object({
  taskId: z.string(),
  taskListId: z.string().optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
  due: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
});

function formatTaskDueDate(dateString: string): string {
  // Handle date-only format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return `${dateString}T23:59:59.000Z`;
  }
  
  // Handle datetime format with time component
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateString)) {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  
  return date.toISOString();
}

function extractPriority(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const match = notes.match(/\[PRIORITY:\s*(high|medium|low)\]/i);
  return match ? match[1].toLowerCase() : undefined;
}

function addPriorityToNotes(notes: string | undefined, priority: string | undefined): string {
  const existingNotes = notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').trim() || '';
  if (!priority) return existingNotes;
  return `[PRIORITY: ${priority}] ${existingNotes}`.trim();
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateTaskSchema.parse(body);

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first.",
      }, { status: 401 });
    }

    const listId = parsed.taskListId || "@default";
    const taskUrl = `${TASKS_API_BASE}/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(parsed.taskId)}`;

    // First, get the existing task
    const existingResponse = await fetch(taskUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!existingResponse.ok) {
      const errorData = await existingResponse.json().catch(() => ({}));
      return NextResponse.json({
        error: true,
        message: errorData.error?.message || "Failed to fetch existing task",
      }, { status: existingResponse.status });
    }

    const existingTask = await existingResponse.json();

    // Build updated task
    const task = { ...existingTask };
    if (parsed.title !== undefined) task.title = parsed.title;
    if (parsed.due !== undefined) task.due = formatTaskDueDate(parsed.due);
    
    if (parsed.notes !== undefined || parsed.priority !== undefined) {
      const existingPriority = extractPriority(task.notes);
      const newPriority = parsed.priority !== undefined ? parsed.priority : existingPriority;
      const existingNotes = task.notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').trim() || '';
      const newNotes = parsed.notes !== undefined ? parsed.notes : existingNotes;
      task.notes = addPriorityToNotes(newNotes, newPriority);
    }

    const response = await fetch(taskUrl, {
      method: "PUT",
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
      due: data.due, // Return full ISO datetime to preserve time
      priority: extractPriority(data.notes),
      status: data.status,
      message: `Task "${data.title}" updated successfully!`,
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
