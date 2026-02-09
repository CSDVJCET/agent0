"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  ListTodoIcon, 
  CalendarIcon, 
  AlignLeftIcon, 
  CheckIcon, 
  XIcon,
  Loader2Icon,
  AlertTriangleIcon,
  SparklesIcon,
  ClockIcon,
  AlertCircleIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "motion/react";
import { TaskDisplay } from "@/components/ai-elements/task-display";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";

interface ConflictingTask {
  id: string;
  title: string;
  due?: string;
}

interface TaskDetails {
  title: string;
  notes?: string;
  due?: string;
  dueTime?: string;
  priority?: "high" | "medium" | "low";
  taskListId?: string;
  generateNotes?: boolean;
}

interface CreatedTaskResult {
  taskId: string;
  title: string;
  notes?: string;
  due?: string;
  priority?: string;
  status: string;
}

interface TaskSchedulingConfirmationProps {
  toolCallId: string;
  taskDetails: TaskDetails;
  reasoning: string;
  conflictingTasks?: ConflictingTask[];
  conflictWarning?: string;
  needsTimeInput?: boolean;
}

export function TaskSchedulingConfirmation({
  toolCallId,
  taskDetails,
  reasoning,
  conflictingTasks,
  conflictWarning,
  needsTimeInput,
}: TaskSchedulingConfirmationProps) {
  // Convert 24-hour time to 12-hour with AM/PM
  const formatTime12Hour = (time24: string): string => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // Convert 12-hour time to 24-hour
  const formatTime24Hour = (time12: string): string => {
    if (!time12) return "";
    const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return time12; // Return as-is if format doesn't match
    
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  };

  // Parse existing time from due if present
  const parseTimeFromDue = (due: string | undefined): string => {
    if (!due) return "";
    if (due.includes('T')) {
      const timePart = due.split('T')[1];
      if (timePart) {
        return timePart.substring(0, 5); // HH:mm
      }
    }
    return "";
  };

  const [formData, setFormData] = useState({
    title: taskDetails.title || "",
    notes: taskDetails.notes || "",
    due: taskDetails.due 
      ? taskDetails.due.includes('T') 
        ? taskDetails.due.split('T')[0] 
        : taskDetails.due
      : "",
    dueTime: (() => {
      const time24 = taskDetails.dueTime || parseTimeFromDue(taskDetails.due) || "";
      return time24 ? formatTime12Hour(time24) : "";
    })(),
    priority: taskDetails.priority || "medium",
    generateNotes: taskDetails.generateNotes ?? false,
  });
  
  const [status, setStatus] = useState<"pending" | "creating" | "created" | "rejected" | "error">("pending");
  const [createdTask, setCreatedTask] = useState<CreatedTaskResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTimeWarning, setShowTimeWarning] = useState(needsTimeInput ?? false);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "dueTime" && value) {
      setShowTimeWarning(false);
    }
  };

  // Validate time logic (end time should be after start time on same date)
  const validateTime = (): { valid: boolean; message?: string } => {
    if (formData.due && formData.dueTime) {
      const [hours, minutes] = formData.dueTime.split(':').map(Number);
      // Warn if task is scheduled for very early morning (before 6 AM) or very late night (after 11 PM)
      if (hours < 6 || hours >= 23) {
        return { valid: true, message: `Note: Task scheduled for ${hours < 6 ? 'early morning' : 'late night'}` };
      }
    }
    return { valid: true };
  };

  const handleConfirm = async () => {
    // Check if time is needed but not provided
    if (needsTimeInput && !formData.dueTime) {
      setShowTimeWarning(true);
      setErrorMessage("Please specify a time for this task");
      return;
    }

    setStatus("creating");
    setErrorMessage(null);

    try {
      // Combine date and time if both are provided
      let dueDateTime = formData.due;
      if (formData.due && formData.dueTime) {
        // Convert 12-hour time to 24-hour format
        const time24 = formatTime24Hour(formData.dueTime);
        // Create a date object in local timezone and convert to ISO string (UTC)
        const localDate = new Date(`${formData.due}T${time24}:00`);
        dueDateTime = localDate.toISOString();
      } else if (formData.due) {
        // Date only - use end of day in local timezone
        const localDate = new Date(`${formData.due}T23:59:59`);
        dueDateTime = localDate.toISOString();
      }

      const response = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          notes: formData.notes || undefined,
          due: dueDateTime || undefined,
          priority: formData.priority,
          taskListId: taskDetails.taskListId,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.message || "Failed to create task");
      } else {
        setStatus("created");
        setCreatedTask({
          taskId: result.taskId,
          title: result.title || formData.title,
          notes: result.notes,
          due: result.due,
          priority: result.priority || formData.priority,
          status: result.status || "needsAction",
        });
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to create task");
    }
  };

  const handleReject = () => {
    setStatus("rejected");
  };

  const isValid = formData.title.trim().length > 0;

  // Show created task success state
  if (status === "created" && createdTask) {
    return (
      <TaskDisplay
        taskId={createdTask.taskId}
        title={createdTask.title}
        notes={createdTask.notes}
        due={createdTask.due}
        priority={createdTask.priority as "high" | "medium" | "low" | undefined}
        status={createdTask.status as "needsAction" | "completed"}
        isNew={true}
      />
    );
  }

  // Show rejected state
  if (status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-muted/50 bg-muted/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <XIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-muted-foreground">Task Creation Cancelled</h3>
              <p className="text-xs text-muted-foreground/70">The task was not created</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show error state
  if (status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
              <XIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to Create Task</h3>
              <p className="text-xs text-red-600/70">{errorMessage}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStatus("pending")}>
              Try Again
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        {/* AI Reasoning */}
        {reasoning && (
          <div className="border-b border-border/50 bg-linear-to-br from-violet-500/5 via-violet-500/3 to-transparent p-4">
            <ChainOfThought defaultOpen={false}>
              <ChainOfThoughtHeader>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-medium">AI Reasoning</span>
                </div>
              </ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                <ChainOfThoughtStep label="Inferred Details">{reasoning}</ChainOfThoughtStep>
              </ChainOfThoughtContent>
            </ChainOfThought>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-border/50 bg-linear-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <ListTodoIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Confirm Task Creation</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Review and edit the details before creating</p>
            </div>
          </div>
        </div>

        {/* Conflict Warning */}
        {conflictingTasks && conflictingTasks.length > 0 && (
          <div className="border-b border-yellow-500/20 bg-yellow-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircleIcon className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm text-yellow-700 dark:text-yellow-400">
                  Scheduling Conflict Detected
                </h4>
                <p className="text-xs text-yellow-600/80 mt-1">
                  {conflictWarning || `You have ${conflictingTasks.length} other task(s) scheduled around this time:`}
                </p>
                <ul className="mt-2 space-y-1">
                  {conflictingTasks.map(task => (
                    <li key={task.id} className="text-xs text-yellow-600/70 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-yellow-500" />
                      {task.title}
                      {task.due && ` (${format(new Date(task.due), "MMM d, h:mm a")})`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Time Required Warning */}
        {showTimeWarning && (
          <div className="border-b border-orange-500/20 bg-orange-500/5 p-4">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  Please specify a time for this task
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Form Content */}
        <div className="p-5 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor={`title-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              Task Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`title-${toolCallId}`}
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="What needs to be done?"
              className={cn(
                "h-10 transition-all",
                !formData.title && "border-destructive/50 focus-visible:ring-destructive/20"
              )}
              disabled={status === "creating"}
            />
          </div>

          {/* Due Date, Time & Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`due-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="w-3 h-3" />
                Due Date
              </Label>
              <Input
                id={`due-${toolCallId}`}
                type="date"
                value={formData.due}
                onChange={(e) => handleChange("due", e.target.value)}
                className="h-10 transition-all"
                disabled={status === "creating"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`dueTime-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <ClockIcon className="w-3 h-3" />
                Time {needsTimeInput && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id={`dueTime-${toolCallId}`}
                type="text"
                value={formData.dueTime}
                onChange={(e) => handleChange("dueTime", e.target.value)}
                placeholder="e.g., 5:00 PM"
                className={cn(
                  "h-10 transition-all",
                  showTimeWarning && !formData.dueTime && "border-orange-500/50 focus-visible:ring-orange-500/20"
                )}
                disabled={status === "creating"}
              />
              {formData.dueTime && (
                <p className="text-xs text-muted-foreground">
                  Format: 12-hour time (e.g., 9:30 AM, 5:00 PM)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`priority-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <AlertTriangleIcon className="w-3 h-3" />
                Priority
              </Label>
              <select
                id={`priority-${toolCallId}`}
                value={formData.priority}
                onChange={(e) => handleChange("priority", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={status === "creating"}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor={`notes-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <AlignLeftIcon className="w-3 h-3" />
              Notes
            </Label>
            <Textarea
              id={`notes-${toolCallId}`}
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add any additional details..."
              className="min-h-[80px] resize-none"
              disabled={status === "creating"}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={status === "creating"}
              className="flex-1 h-11"
            >
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValid || status === "creating"}
              className="flex-1 h-11 gap-2 font-medium shadow-sm"
            >
              {status === "creating" ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Confirm & Create
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
