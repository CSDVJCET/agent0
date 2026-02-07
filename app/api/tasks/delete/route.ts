import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";
const DEFAULT_USER_ID = "default-user";

const deleteTaskSchema = z.object({
  taskId: z.string(),
  taskListId: z.string().optional(),
});

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = deleteTaskSchema.parse(body);

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first.",
      }, { status: 401 });
    }

    const listId = parsed.taskListId || "@default";
    const taskUrl = `${TASKS_API_BASE}/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(parsed.taskId)}`;

    // First get the task to return its title
    const existingResponse = await fetch(taskUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let taskTitle = parsed.taskId;
    if (existingResponse.ok) {
      const existingTask = await existingResponse.json();
      taskTitle = existingTask.title || parsed.taskId;
    }

    const response = await fetch(taskUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: true,
        message: errorData.error?.message || `API request failed: ${response.statusText}`,
      }, { status: response.status });
    }

    return NextResponse.json({
      error: false,
      deleted: true,
      taskId: parsed.taskId,
      title: taskTitle,
      message: `Task "${taskTitle}" deleted successfully!`,
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
