import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";
const DEFAULT_USER_ID = "default-user";

const querySchema = z.object({
  taskListId: z.string().optional(),
  showCompleted: z.string().optional(),
  showHidden: z.string().optional(),
  dueMin: z.string().optional(),
  dueMax: z.string().optional(),
  maxResults: z.string().optional(),
});

function extractPriority(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const match = notes.match(/\[PRIORITY:\s*(high|medium|low)\]/i);
  return match ? match[1].toLowerCase() : undefined;
}

function parseTask(task: any) {
  return {
    id: task.id,
    title: task.title || "(No title)",
    notes: task.notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').trim() || undefined,
    status: task.status,
    due: task.due?.split('T')[0],
    completed: task.completed,
    priority: extractPriority(task.notes),
    parent: task.parent,
    position: task.position,
    updated: task.updated,
    isCompleted: task.status === "completed",
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = querySchema.parse({
      taskListId: searchParams.get("taskListId") || undefined,
      showCompleted: searchParams.get("showCompleted") || undefined,
      showHidden: searchParams.get("showHidden") || undefined,
      dueMin: searchParams.get("dueMin") || undefined,
      dueMax: searchParams.get("dueMax") || undefined,
      maxResults: searchParams.get("maxResults") || undefined,
    });

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first.",
      }, { status: 401 });
    }

    const listId = params.taskListId || "@default";
    const queryParams = new URLSearchParams({
      maxResults: params.maxResults || "100",
    });

    if (params.showCompleted === "true") queryParams.set("showCompleted", "true");
    if (params.showHidden === "true") queryParams.set("showHidden", "true");
    if (params.dueMin) queryParams.set("dueMin", new Date(params.dueMin).toISOString());
    if (params.dueMax) queryParams.set("dueMax", new Date(params.dueMax).toISOString());

    const response = await fetch(
      `${TASKS_API_BASE}/lists/${encodeURIComponent(listId)}/tasks?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: true,
        message: errorData.error?.message || `API request failed: ${response.statusText}`,
      }, { status: response.status });
    }

    const data = await response.json();
    const tasks = (data.items || []).map(parseTask);
    const pendingTasks = tasks.filter((t: any) => !t.isCompleted);
    const completedTasks = tasks.filter((t: any) => t.isCompleted);

    return NextResponse.json({
      error: false,
      taskCount: tasks.length,
      pendingCount: pendingTasks.length,
      completedCount: completedTasks.length,
      tasks,
      message: tasks.length > 0 
        ? `Found ${tasks.length} task(s)` 
        : "No tasks found",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({
        error: true,
        message: "Invalid query parameters",
        details: err.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred",
    }, { status: 500 });
  }
}
