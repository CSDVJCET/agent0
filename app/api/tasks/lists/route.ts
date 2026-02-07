import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/google-calendar";

const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";
const DEFAULT_USER_ID = "default-user";

function parseTaskList(taskList: any) {
  return {
    id: taskList.id,
    title: taskList.title,
    updated: taskList.updated,
    selfLink: taskList.selfLink,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const maxResults = searchParams.get("maxResults") || "100";

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first.",
      }, { status: 401 });
    }

    const response = await fetch(
      `${TASKS_API_BASE}/users/@me/lists?maxResults=${maxResults}`,
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
    const taskLists = (data.items || []).map(parseTaskList);

    return NextResponse.json({
      error: false,
      listCount: taskLists.length,
      taskLists,
      message: taskLists.length > 0 
        ? `Found ${taskLists.length} task list(s)` 
        : "No task lists found",
    });
  } catch (err) {
    return NextResponse.json({
      error: true,
      message: err instanceof Error ? err.message : "Unknown error occurred",
    }, { status: 500 });
  }
}
