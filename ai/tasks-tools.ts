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
 * Google Tasks stores date and time in RFC 3339 format
 */
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

/**
 * Check if a time was explicitly mentioned in a date string
 */
function hasExplicitTime(dateString: string | undefined): boolean {
  if (!dateString) return false;
  // Check for time patterns like "4 pm", "16:00", "4:30pm", etc.
  return /\d{1,2}:\d{2}|(\d{1,2}\s*(am|pm|AM|PM))/i.test(dateString) ||
         /T\d{2}:\d{2}/.test(dateString);
}

/**
 * Parse due date - Google Tasks stores full datetime in RFC 3339 format
 */
function parseDueDateWithTime(isoString: string | undefined, notes: string | undefined): string | undefined {
  if (!isoString) return undefined;
  
  // Check if there's a time stored in notes metadata as fallback
  const noteTime = extractTime(notes);
  
  if (noteTime) {
    // Use time from notes if available
    const date = new Date(isoString);
    const dateOnly = date.toISOString().split('T')[0];
    return combineDateAndTime(dateOnly, noteTime);
  }
  
  // Return the full ISO string (includes time from Google Tasks)
  return isoString;
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
 * Extract time from notes (stored as [TIME: HH:mm])
 */
function extractTime(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const match = notes.match(/\[TIME:\s*(\d{2}:\d{2})\]/i);
  return match ? match[1] : undefined;
}

/**
 * Add priority to notes
 */
function addPriorityToNotes(notes: string | undefined, priority: string | undefined): string {
  const existingNotes = notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').replace(/\[TIME:\s*\d{2}:\d{2}\]\s*/gi, '').trim() || '';
  if (!priority) return existingNotes;
  return `[PRIORITY: ${priority}] ${existingNotes}`.trim();
}

/**
 * Add time to notes metadata
 */
function addTimeToNotes(notes: string | undefined, time: string | undefined): string {
  const existingNotes = notes || '';
  if (!time) return existingNotes;
  // Add time metadata at the end to preserve other metadata at the start
  return `${existingNotes} [TIME: ${time}]`.trim();
}

/**
 * Combine date and time into full ISO datetime
 * If time is specified, combine with date; otherwise return date-only ISO
 */
function combineDateAndTime(date: string, time?: string): string {
  if (time) {
    // Create date in local timezone and convert to ISO
    const localDate = new Date(`${date}T${time}:00`);
    return localDate.toISOString();
  }
  // Date only - use end of day
  const localDate = new Date(`${date}T23:59:59`);
  return localDate.toISOString();
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
  const cleanNotes = task.notes?.replace(/\[PRIORITY:\s*\w+\]\s*/gi, '').replace(/\[TIME:\s*\d{2}:\d{2}\]\s*/gi, '').trim() || undefined;
  
  return {
    id: task.id,
    title: task.title || "(No title)",
    notes: cleanNotes,
    status: task.status,
    due: parseDueDateWithTime(task.due, task.notes),
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
 * No additional text should be provided after successful creation - the UI shows the result.
 */
export const createTaskTool = tool({
  description: "Create a new task in Google Tasks. Use this when you have sufficient details (at minimum: title). For confirmation workflow, use scheduleTask instead. DO NOT provide additional text after calling this tool.",
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
      let dueDateTime: string | undefined;
      
      // Process due date/time
      if (due) {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(due)) {
          // Already has time component
          const date = new Date(due);
          dueDateTime = date.toISOString();
        } else {
          // Date only
          dueDateTime = due;
        }
      }

      const task: Record<string, unknown> = {
        title,
        status: TASK_STATUS.NEEDS_ACTION,
      };

      // Add priority to notes (keep time in notes as backup)
      let taskNotes = addPriorityToNotes(notes, priority);
      
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
- If user specifies a time (e.g., "at 4 pm", "by 3:30"), extract it as dueTime in HH:mm format (19:00 for 7pm)
- If user only provides date without time, set userMentionedTime to false so UI prompts for time
- CRITICAL: If user asks to "generate notes about X" or "generate a note about X", YOU MUST create detailed, comprehensive notes about topic X (3-5 sentences with helpful information, context, tips, or relevant details) and put them in the 'notes' field

Use this tool IMMEDIATELY when the user mentions creating a task, todo, or reminder.

IMPORTANT: After calling this tool, DO NOT provide any additional text description or confirmation message. The UI will handle all user communication. Simply call the tool and stop.`,
  inputSchema: z.object({
    title: z.string().describe("Task title - ALWAYS provide one. Infer from context. Never leave empty."),
    notes: z.string().optional().describe("CRITICAL: When user requests 'generate note about X', YOU MUST write 3-5 sentences of detailed, helpful information about X here. Include relevant tips, context, or useful details. For 'cinematic task' example: write about filmmaking, cinematography techniques, shot composition, lighting, etc. DO NOT leave empty if generation is requested!"),
    due: z.string().optional().describe("Due date in YYYY-MM-DD format. Parse 'tomorrow', 'next Monday', etc."),
    dueTime: z.string().optional().describe("Due time in HH:mm 24-hour format. Examples: '19:00' for 7pm, '16:00' for 4pm, '09:30' for 9:30am"),
    priority: z.enum(["high", "medium", "low"]).optional().describe("Priority level. Default to medium if not specified."),
    taskListId: z.string().optional().describe("Task list ID, defaults to @default"),
    reasoning: z.string().describe("Brief explanation of inferred details. If you generated notes, mention what topic you wrote about."),
    userMentionedTime: z.boolean().optional().default(false).describe("Set to true ONLY if user explicitly mentioned a specific time in their request"),
    generateNotes: z.boolean().optional().default(false).describe("Set to true if user requested note generation"),
  }),
  execute: async ({ title, notes, due, dueTime, priority, taskListId, reasoning, userMentionedTime, generateNotes }) => {
    const accessToken = await getAccessToken();
    
    // Check for conflicting tasks if we have a due date
    let conflictingTasks: { id: string; title: string; due?: string }[] = [];
    let conflictWarning: string | undefined;
    
    if (accessToken && due) {
      try {
        // Fetch existing tasks to check for conflicts
        const listId = taskListId || "@default";
        const dueDate = new Date(due);
        const startOfDay = new Date(dueDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dueDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const params = new URLSearchParams({
          maxResults: "50",
          showCompleted: "false",
          dueMin: startOfDay.toISOString(),
          dueMax: endOfDay.toISOString(),
        });

        const result = await tasksRequest<{ items: any[] }>(
          accessToken,
          `/lists/${encodeURIComponent(listId)}/tasks?${params.toString()}`
        );

        if (result.success && result.data?.items) {
          conflictingTasks = result.data.items
            .filter((t: any) => t.status !== "completed")
            .map((t: any) => ({
              id: t.id,
              title: t.title || "(No title)",
              due: t.due,
            }));
          
          if (conflictingTasks.length > 0) {
            conflictWarning = `You have ${conflictingTasks.length} other task(s) scheduled for this day. Consider adjusting the time to avoid overlap.`;
          }
        }
      } catch (err) {
        // Silently fail conflict check - not critical
        console.error("Failed to check task conflicts:", err);
      }
    }

    // Determine if we need time input from user
    // Only prompt if user has a date but didn't mention a specific time
    const needsTimeInput = due && !dueTime && !userMentionedTime;

    return {
      status: "pending_confirmation",
      taskDetails: {
        title,
        notes: notes || "",
        due: due || undefined,
        dueTime: dueTime || undefined,
        priority: priority || "medium",
        taskListId: taskListId || "@default",
        generateNotes: generateNotes || false,
      },
      reasoning,
      conflictingTasks: conflictingTasks.length > 0 ? conflictingTasks : undefined,
      conflictWarning,
      needsTimeInput,
      message: "Please review the task details and confirm to create the task.",
    };
  },
});

/**
 * Confirm and create a scheduled task after human approval
 * No additional text should be provided after calling this tool - the UI handles confirmation.
 */
export const confirmScheduledTaskTool = tool({
  description: "Create a task after user confirmation. Use this to finalize task creation after the user has reviewed and approved the details. DO NOT provide additional text after calling this tool.",
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
      let dueDateTime: string | undefined;
      
      // Process due date/time
      if (due) {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(due)) {
          // Already has time component
          const date = new Date(due);
          dueDateTime = date.toISOString();
        } else {
          // Date only
          dueDateTime = due;
        }
      }

      const task: Record<string, unknown> = {
        title,
        status: TASK_STATUS.NEEDS_ACTION,
      };

      // Add priority to notes (keep time in notes as backup)
      let taskNotes = addPriorityToNotes(notes, priority);
      
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
 * Update an existing task (with HITL confirmation)
 * No additional text needed - the UI shows before/after comparison.
 */
export const updateTaskTool = tool({
  description: "Update an existing task. Shows the proposed changes for user confirmation before applying. Use this when the user wants to modify task details, reschedule, or change priority. DO NOT provide additional text after calling this tool.",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to update"),
    taskListId: z.string().optional().describe("ID of the task list. Defaults to @default."),
    title: z.string().optional().describe("New title for the task"),
    notes: z.string().optional().describe("Updated notes/description"),
    due: z.string().optional().describe("New due date in YYYY-MM-DD format"),
    dueTime: z.string().optional().describe("New due time in HH:mm format"),
    priority: z.enum(["high", "medium", "low"]).optional().describe("Updated priority level"),
    confirmed: z.boolean().optional().default(false).describe("Whether the update has been confirmed by the user"),
  }),
  execute: async ({ taskId, taskListId, title, notes, due, dueTime, priority, confirmed }) => {
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

      const existingTask = parseTask(existingResult.data);
      
      // If not confirmed, return confirmation request with proposed changes
      if (!confirmed) {
        return {
          status: "pending_confirmation",
          action: "update",
          currentTask: existingTask,
          proposedChanges: {
            title: title !== undefined ? title : existingTask.title,
            notes: notes !== undefined ? notes : existingTask.notes,
            due: due !== undefined ? due : existingTask.due,
            dueTime: dueTime || undefined,
            priority: priority !== undefined ? priority : existingTask.priority,
          },
          message: `Update task "${existingTask.title}"? Please confirm the changes.`,
        };
      }

      // Build updated task object
      const task = { ...existingResult.data };

      if (title !== undefined) task.title = title;
      
      // Handle due date with optional time
      if (due !== undefined) {
        let dueDateTime = due;
        if (dueTime) {
          dueDateTime = `${due}T${dueTime}:00`;
        }
        task.due = formatTaskDueDate(dueDateTime);
      }
      
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
 * No additional text needed - the UI shows celebration and confirmation.
 */
export const completeTaskTool = tool({
  description: "Mark a task as completed. Use this when the user says they finished, completed, or done with a task. DO NOT provide additional text after calling this tool.",
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
 * No additional text needed - the UI handles the confirmation flow.
 */
export const deleteTaskTool = tool({
  description: "Delete a task from Google Tasks. This action cannot be undone. Use this when the user wants to remove or delete a task. DO NOT provide additional text after calling this tool.",
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
