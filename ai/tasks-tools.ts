import { tool } from "ai";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

/**
 * Google Tasks Tools for Agent0
 * 
 * These tools allow the AI agent to interact with Google Tasks API directly.
 * Users invoke these tools using @tasks mentions in their prompts.
 * 
 * Available operations:
 * - createTask: Create a new task
 * - scheduleTask: Schedule task with HITL confirmation
 * - listTasks: List tasks in a task list
 * - updateTask: Modify an existing task
 * - deleteTask: Remove a task
 * - completeTask: Mark a task as completed
 * - getTaskLists: Get all task lists
 */

// Google Tasks API base URL
const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";

// Default user ID for development (matches what we use in auth routes)
const DEFAULT_USER_ID = "default-user";

// Task status constants
export const TASK_STATUS = {
  NEEDS_ACTION: "needsAction",
  COMPLETED: "completed",
} as const;

// Priority levels (stored in notes as metadata)
export const TASK_PRIORITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

// Get access token from token store
async function getAccessToken(): Promise<string | null> {
  return await getValidAccessToken(DEFAULT_USER_ID);
}

/**
 * Format date for Google Tasks API (RFC 3339 format)
 */
function formatTaskDueDate(dateString: string): string {
  // Check if it's a date-only string
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Google Tasks API expects RFC 3339 with time, use end of day
    return `${dateString}T23:59:59.000Z`;
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  
  return date.toISOString();
}

/**
 * Parse due date from ISO string to user-friendly format
 */
function parseDueDate(isoString: string | undefined): string | undefined {
  if (!isoString) return undefined;
  const date = new Date(isoString);
  return date.toISOString().split('T')[0];
}

/**
 * Extract priority from notes (stored as [PRIORITY: high/medium/low])
 */
function extractPriority(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const match = notes.match(/\[PRIORITY:\s*(high|medium|low)\]/i);
  return match ? match[1].toLowerCase() : undefined;
}

/**
 * Add priority to notes
 */
function addPriorityToNotes(notes: string | undefined, priority: string | undefined): string {
  const existingNotes = notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').trim() || '';
  if (!priority) return existingNotes;
  return `[PRIORITY: ${priority}] ${existingNotes}`.trim();
}

/**
 * Make authenticated request to Google Tasks API
 */
async function tasksRequest<T>(
  accessToken: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${TASKS_API_BASE}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `API request failed: ${response.statusText}`,
      };
    }

    // Handle 204 No Content (e.g., for delete operations)
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Parse Google Tasks task to simplified format
 */
function parseTask(task: any) {
  return {
    id: task.id,
    title: task.title || "(No title)",
    notes: task.notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').trim() || undefined,
    status: task.status,
    due: parseDueDate(task.due),
    completed: task.completed,
    priority: extractPriority(task.notes),
    parent: task.parent,
    position: task.position,
    updated: task.updated,
    selfLink: task.selfLink,
    isCompleted: task.status === TASK_STATUS.COMPLETED,
  };
}

/**
 * Parse task list to simplified format
 */
function parseTaskList(taskList: any) {
  return {
    id: taskList.id,
    title: taskList.title,
    updated: taskList.updated,
    selfLink: taskList.selfLink,
  };
}

/**
 * Get all task lists
 */
export const getTaskListsTool = tool({
  description: "Get all task lists for the user. Use this to discover available task lists before creating or listing tasks.",
  inputSchema: z.object({
    maxResults: z.number().optional().default(100).describe("Maximum number of task lists to return (1-100)"),
  }),
  execute: async ({ maxResults }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const params = new URLSearchParams({
        maxResults: String(maxResults || 100),
      });

      const result = await tasksRequest<{ items: any[] }>(
        accessToken,
        `/users/@me/lists?${params.toString()}`
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to get task lists",
        };
      }

      const taskLists = (result.data?.items || []).map(parseTaskList);
      
      return {
        error: false,
        listCount: taskLists.length,
        taskLists,
        message: taskLists.length > 0 
          ? `Found ${taskLists.length} task list(s)` 
          : "No task lists found",
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to get task lists",
      };
    }
  },
});

/**
 * Create a new task directly
 */
export const createTaskTool = tool({
  description: "Create a new task in Google Tasks. Use this when you have sufficient details (at minimum: title). For confirmation workflow, use scheduleTask instead.",
  inputSchema: z.object({
    title: z.string().describe("The title of the task"),
    notes: z.string().optional().describe("Additional notes or description for the task"),
    due: z.string().optional().describe("Due date in ISO 8601 format or YYYY-MM-DD format"),
    priority: z.enum(["high", "medium", "low"]).optional().describe("Priority level of the task"),
    taskListId: z.string().optional().describe("ID of the task list to add the task to. Defaults to @default (primary list)."),
    parent: z.string().optional().describe("Parent task ID to create this as a subtask"),
  }),
  execute: async ({ title, notes, due, priority, taskListId, parent }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const task: Record<string, unknown> = {
        title,
        status: TASK_STATUS.NEEDS_ACTION,
      };

      // Add priority to notes
      if (notes || priority) {
        task.notes = addPriorityToNotes(notes, priority);
      }

      if (due) {
        task.due = formatTaskDueDate(due);
      }

      // Build URL with optional parent parameter
      const listId = taskListId || "@default";
      let url = `/lists/${encodeURIComponent(listId)}/tasks`;
      if (parent) {
        url += `?parent=${encodeURIComponent(parent)}`;
      }

      const result = await tasksRequest<any>(
        accessToken,
        url,
        "POST",
        task
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to create task",
        };
      }

      const created = parseTask(result.data);
      return {
        error: false,
        taskId: created.id,
        title: created.title,
        notes: created.notes,
        due: created.due,
        priority: created.priority,
        status: created.status,
        message: `Successfully created task "${created.title}"`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to create task",
      };
    }
  },
});

/**
 * Schedule task creation with human-in-the-loop confirmation
 */
export const scheduleTaskTool = tool({
  description: `Schedule a task by extracting ALL details from the user's request. NEVER ask for clarification - always infer missing details:
- If no title is given, infer from context (e.g., "review", "complete", "prepare")
- If no priority is given, default to medium
- Always generate the form immediately, the user can edit before confirming

Use this tool IMMEDIATELY when the user mentions creating a task, todo, or reminder.`,
  inputSchema: z.object({
    title: z.string().describe("Task title - ALWAYS provide one. Infer from context. Never leave empty."),
    notes: z.string().optional().describe("Additional notes or description"),
    due: z.string().optional().describe("Due date in ISO 8601 format. Parse 'tomorrow', 'next Monday', etc."),
    priority: z.enum(["high", "medium", "low"]).optional().describe("Priority level. Default to medium if not specified."),
    taskListId: z.string().optional().describe("Task list ID, defaults to @default"),
    reasoning: z.string().describe("Brief explanation of inferred details"),
  }),
  execute: async ({ title, notes, due, priority, taskListId, reasoning }) => {
    return {
      status: "pending_confirmation",
      taskDetails: {
        title,
        notes: notes || "",
        due: due || undefined,
        priority: priority || "medium",
        taskListId: taskListId || "@default",
      },
      reasoning,
      message: "Please review the task details and confirm to create the task.",
    };
  },
});

/**
 * Confirm and create a scheduled task after human approval
 */
export const confirmScheduledTaskTool = tool({
  description: "Create a task after user confirmation. Use this to finalize task creation after the user has reviewed and approved the details.",
  inputSchema: z.object({
    title: z.string().describe("Task title"),
    notes: z.string().optional().describe("Task notes/description"),
    due: z.string().optional().describe("Due date in ISO 8601 format"),
    priority: z.enum(["high", "medium", "low"]).optional().describe("Priority level"),
    taskListId: z.string().optional().describe("Task list ID"),
  }),
  execute: async ({ title, notes, due, priority, taskListId }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first.",
      };
    }

    try {
      const task: Record<string, unknown> = {
        title,
        status: TASK_STATUS.NEEDS_ACTION,
      };

      if (notes || priority) {
        task.notes = addPriorityToNotes(notes, priority);
      }

      if (due) {
        task.due = formatTaskDueDate(due);
      }

      const listId = taskListId || "@default";
      const result = await tasksRequest<any>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks`,
        "POST",
        task
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to create task",
        };
      }

      const created = parseTask(result.data);
      return {
        error: false,
        status: "created",
        taskId: created.id,
        title: created.title,
        notes: created.notes,
        due: created.due,
        priority: created.priority,
        message: `Task "${created.title}" has been created successfully!`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to create task",
      };
    }
  },
});

/**
 * List tasks in a task list
 */
export const listTasksTool = tool({
  description: "List tasks in a Google Tasks list. Use this when the user asks about their tasks, to-dos, or what they need to complete.",
  inputSchema: z.object({
    taskListId: z.string().optional().describe("ID of the task list. Defaults to @default (primary list)."),
    showCompleted: z.boolean().optional().default(false).describe("Whether to include completed tasks"),
    showHidden: z.boolean().optional().default(false).describe("Whether to include hidden tasks"),
    dueMin: z.string().optional().describe("Filter by minimum due date (ISO 8601)"),
    dueMax: z.string().optional().describe("Filter by maximum due date (ISO 8601)"),
    maxResults: z.number().optional().default(100).describe("Maximum number of tasks to return (1-100)"),
  }),
  execute: async ({ taskListId, showCompleted, showHidden, dueMin, dueMax, maxResults }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const params = new URLSearchParams({
        maxResults: String(maxResults || 100),
      });

      if (showCompleted) params.set("showCompleted", "true");
      if (showHidden) params.set("showHidden", "true");
      if (dueMin) params.set("dueMin", formatTaskDueDate(dueMin));
      if (dueMax) params.set("dueMax", formatTaskDueDate(dueMax));

      const listId = taskListId || "@default";
      const result = await tasksRequest<{ items: any[] }>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks?${params.toString()}`
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to list tasks",
        };
      }

      const tasks = (result.data?.items || []).map(parseTask);
      const pendingTasks = tasks.filter(t => !t.isCompleted);
      const completedTasks = tasks.filter(t => t.isCompleted);
      
      return {
        error: false,
        taskCount: tasks.length,
        pendingCount: pendingTasks.length,
        completedCount: completedTasks.length,
        tasks,
        message: tasks.length > 0 
          ? `Found ${tasks.length} task(s): ${pendingTasks.length} pending, ${completedTasks.length} completed` 
          : "No tasks found",
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to list tasks",
      };
    }
  },
});

/**
 * Update an existing task
 */
export const updateTaskTool = tool({
  description: "Update an existing task. Use this when the user wants to modify task details, reschedule, or change priority.",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to update"),
    taskListId: z.string().optional().describe("ID of the task list. Defaults to @default."),
    title: z.string().optional().describe("New title for the task"),
    notes: z.string().optional().describe("Updated notes/description"),
    due: z.string().optional().describe("New due date in ISO 8601 format"),
    priority: z.enum(["high", "medium", "low"]).optional().describe("Updated priority level"),
  }),
  execute: async ({ taskId, taskListId, title, notes, due, priority }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const listId = taskListId || "@default";
      
      // First, get the existing task
      const existingResult = await tasksRequest<any>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`
      );

      if (!existingResult.success) {
        return {
          error: true,
          message: existingResult.error || "Failed to fetch existing task",
        };
      }

      // Build updated task object
      const task = { ...existingResult.data };

      if (title !== undefined) task.title = title;
      if (due !== undefined) task.due = formatTaskDueDate(due);
      
      // Handle notes and priority
      if (notes !== undefined || priority !== undefined) {
        const existingPriority = extractPriority(task.notes);
        const newPriority = priority !== undefined ? priority : existingPriority;
        const existingNotes = task.notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').trim() || '';
        const newNotes = notes !== undefined ? notes : existingNotes;
        task.notes = addPriorityToNotes(newNotes, newPriority);
      }

      const result = await tasksRequest<any>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
        "PUT",
        task
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to update task",
        };
      }

      const updated = parseTask(result.data);
      return {
        error: false,
        taskId: updated.id,
        title: updated.title,
        notes: updated.notes,
        due: updated.due,
        priority: updated.priority,
        status: updated.status,
        message: `Successfully updated task "${updated.title}"`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to update task",
      };
    }
  },
});

/**
 * Complete a task
 */
export const completeTaskTool = tool({
  description: "Mark a task as completed. Use this when the user says they finished, completed, or done with a task.",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to complete"),
    taskListId: z.string().optional().describe("ID of the task list. Defaults to @default."),
  }),
  execute: async ({ taskId, taskListId }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const listId = taskListId || "@default";
      
      // Get existing task first
      const existingResult = await tasksRequest<any>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`
      );

      if (!existingResult.success) {
        return {
          error: true,
          message: existingResult.error || "Failed to fetch task",
        };
      }

      // Update status to completed
      const task = {
        ...existingResult.data,
        status: TASK_STATUS.COMPLETED,
        completed: new Date().toISOString(),
      };

      const result = await tasksRequest<any>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
        "PUT",
        task
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to complete task",
        };
      }

      const completed = parseTask(result.data);
      return {
        error: false,
        taskId: completed.id,
        title: completed.title,
        status: completed.status,
        completedAt: completed.completed,
        message: `Task "${completed.title}" marked as completed!`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to complete task",
      };
    }
  },
});

/**
 * Uncomplete a task (mark as needs action)
 */
export const uncompleteTaskTool = tool({
  description: "Mark a completed task as not completed (needs action). Use this when the user wants to reopen a task.",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to uncomplete"),
    taskListId: z.string().optional().describe("ID of the task list. Defaults to @default."),
  }),
  execute: async ({ taskId, taskListId }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const listId = taskListId || "@default";
      
      // Get existing task first
      const existingResult = await tasksRequest<any>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`
      );

      if (!existingResult.success) {
        return {
          error: true,
          message: existingResult.error || "Failed to fetch task",
        };
      }

      // Update status to needs action
      const task = {
        ...existingResult.data,
        status: TASK_STATUS.NEEDS_ACTION,
        completed: null,
      };

      const result = await tasksRequest<any>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
        "PUT",
        task
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to uncomplete task",
        };
      }

      const updated = parseTask(result.data);
      return {
        error: false,
        taskId: updated.id,
        title: updated.title,
        status: updated.status,
        message: `Task "${updated.title}" marked as pending!`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to uncomplete task",
      };
    }
  },
});

/**
 * Delete a task (with HITL - returns confirmation request)
 */
export const deleteTaskTool = tool({
  description: "Delete a task from Google Tasks. This action cannot be undone. Use this when the user wants to remove or delete a task.",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to delete"),
    taskListId: z.string().optional().describe("ID of the task list. Defaults to @default."),
    confirmed: z.boolean().optional().default(false).describe("Whether the deletion has been confirmed by the user"),
  }),
  execute: async ({ taskId, taskListId, confirmed }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const listId = taskListId || "@default";

      // First get the task to show details
      const existingResult = await tasksRequest<any>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`
      );

      if (!existingResult.success) {
        return {
          error: true,
          message: existingResult.error || "Failed to fetch task",
        };
      }

      const taskToDelete = parseTask(existingResult.data);

      // If not confirmed, return confirmation request
      if (!confirmed) {
        return {
          status: "pending_confirmation",
          action: "delete",
          taskDetails: taskToDelete,
          message: `Are you sure you want to delete the task "${taskToDelete.title}"? This action cannot be undone.`,
        };
      }

      // If confirmed, proceed with deletion
      const result = await tasksRequest<void>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
        "DELETE"
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to delete task",
        };
      }

      return {
        error: false,
        deleted: true,
        taskId,
        title: taskToDelete.title,
        message: `Successfully deleted task "${taskToDelete.title}"`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to delete task",
      };
    }
  },
});

/**
 * Get task details
 */
export const getTaskTool = tool({
  description: "Get detailed information about a specific task by its ID.",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to retrieve"),
    taskListId: z.string().optional().describe("ID of the task list. Defaults to @default."),
  }),
  execute: async ({ taskId, taskListId }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Tasks is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const listId = taskListId || "@default";
      const result = await tasksRequest<any>(
        accessToken,
        `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to get task details",
        };
      }

      return {
        error: false,
        task: parseTask(result.data),
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to get task",
      };
    }
  },
});

/**
 * Export all tasks tools
 */
export const tasksTools = {
  scheduleTask: scheduleTaskTool,
  confirmScheduledTask: confirmScheduledTaskTool,
  createTask: createTaskTool,
  listTasks: listTasksTool,
  updateTask: updateTaskTool,
  deleteTask: deleteTaskTool,
  completeTask: completeTaskTool,
  uncompleteTask: uncompleteTaskTool,
  getTask: getTaskTool,
  getTaskLists: getTaskListsTool,
};

export default tasksTools;
