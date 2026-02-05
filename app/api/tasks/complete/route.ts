import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";
const DEFAULT_USER_ID = "default-user";

const completeTaskSchema = z.object({
  taskId: z.string(),
  taskListId: z.string().optional(),
  completed: z.boolean().optional().default(true), // true = complete, false = uncomplete
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = completeTaskSchema.parse(body);

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

    // Update status
    const task = {
      ...existingTask,
      status: parsed.completed ? "completed" : "needsAction",
      completed: parsed.completed ? new Date().toISOString() : null,
    };

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
    const action = parsed.completed ? "completed" : "reopened";

    return NextResponse.json({
      error: false,
      taskId: data.id,
      title: data.title,
      status: data.status,
      completedAt: data.completed,
      message: `Task "${data.title}" ${action} successfully!`,
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
