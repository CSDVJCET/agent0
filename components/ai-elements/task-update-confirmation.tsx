"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  EditIcon, 
  XIcon, 
  CheckIcon,
  Loader2Icon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  AlertTriangleIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { TaskDisplay } from "@/components/ai-elements/task-display";

interface TaskDetails {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  priority?: string;
}

interface ProposedChanges {
  title?: string;
  notes?: string;
  due?: string;
  dueTime?: string;
  priority?: string;
}

interface TaskUpdateConfirmationProps {
  toolCallId: string;
  currentTask: TaskDetails;
  proposedChanges: ProposedChanges;
  message: string;
}

export function TaskUpdateConfirmation({
  toolCallId,
  currentTask,
  proposedChanges,
  message,
}: TaskUpdateConfirmationProps) {
  const [status, setStatus] = useState<"pending" | "updating" | "updated" | "cancelled" | "error">("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatedTask, setUpdatedTask] = useState<TaskDetails | null>(null);

  const handleConfirm = async () => {
    setStatus("updating");
    setErrorMessage(null);

    try {
      // Combine date and time if both provided
      let dueDateTime = proposedChanges.due;
      if (proposedChanges.due && proposedChanges.dueTime) {
        dueDateTime = `${proposedChanges.due}T${proposedChanges.dueTime}:00`;
      }

      const response = await fetch("/api/tasks/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: currentTask.id,
          title: proposedChanges.title,
          notes: proposedChanges.notes,
          due: dueDateTime,
          priority: proposedChanges.priority,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.message || "Failed to update task");
      } else {
        setStatus("updated");
        setUpdatedTask({
          id: result.taskId,
          title: result.title,
          notes: result.notes,
          due: result.due,
          priority: result.priority,
        });
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const handleCancel = () => {
    setStatus("cancelled");
  };

  // Helper to check if a field changed
  const hasChanged = (field: keyof ProposedChanges) => {
    const current = currentTask[field as keyof TaskDetails];
    const proposed = proposedChanges[field];
    return proposed !== undefined && proposed !== current;
  };

  // Show updated success state
  if (status === "updated" && updatedTask) {
    return (
      <TaskDisplay
        taskId={updatedTask.id}
        title={updatedTask.title}
        notes={updatedTask.notes}
        due={updatedTask.due}
        priority={updatedTask.priority as "high" | "medium" | "low" | undefined}
        status="needsAction"
        isNew={false}
      />
    );
  }

  // Show cancelled state
  if (status === "cancelled") {
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
              <h3 className="font-semibold text-muted-foreground">Update Cancelled</h3>
              <p className="text-xs text-muted-foreground/70">
                "{currentTask.title}" was not modified
              </p>
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
              <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to Update Task</h3>
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

  const priorityColors = {
    high: "text-red-500",
    medium: "text-yellow-500",
    low: "text-blue-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-blue-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-blue-500/10 bg-linear-to-br from-blue-500/5 via-blue-500/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20">
              <EditIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base text-blue-700 dark:text-blue-400">Confirm Task Update</h3>
              <p className="text-xs text-blue-600/70 mt-0.5">Review the changes before applying</p>
            </div>
          </div>
        </div>

        {/* Changes Preview */}
        <div className="p-5 space-y-4">
          {/* Title Change */}
          {hasChanged("title") && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">Title</span>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground line-through">{currentTask.title}</span>
                <ArrowRightIcon className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{proposedChanges.title}</span>
              </div>
            </div>
          )}

          {/* Due Date Change */}
          {hasChanged("due") && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" /> Due Date
              </span>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground line-through">
                  {currentTask.due ? format(new Date(currentTask.due), "MMM d, yyyy") : "No date"}
                </span>
                <ArrowRightIcon className="w-4 h-4 text-blue-500" />
                <span className="font-medium">
                  {proposedChanges.due ? format(new Date(proposedChanges.due), "MMM d, yyyy") : "No date"}
                  {proposedChanges.dueTime && ` at ${proposedChanges.dueTime}`}
                </span>
              </div>
            </div>
          )}

          {/* Priority Change */}
          {hasChanged("priority") && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                <AlertTriangleIcon className="w-3 h-3" /> Priority
              </span>
              <div className="flex items-center gap-2 text-sm">
                <span className={cn("line-through", currentTask.priority && priorityColors[currentTask.priority as keyof typeof priorityColors])}>
                  {currentTask.priority || "None"}
                </span>
                <ArrowRightIcon className="w-4 h-4 text-blue-500" />
                <span className={cn("font-medium capitalize", proposedChanges.priority && priorityColors[proposedChanges.priority as keyof typeof priorityColors])}>
                  {proposedChanges.priority || "None"}
                </span>
              </div>
            </div>
          )}

          {/* Notes Change */}
          {hasChanged("notes") && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">Notes</span>
              <div className="text-sm space-y-1">
                {currentTask.notes && (
                  <p className="text-muted-foreground line-through text-xs">{currentTask.notes}</p>
                )}
                {proposedChanges.notes && (
                  <p className="font-medium text-xs">{proposedChanges.notes}</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={status === "updating"}
              className="flex-1 h-11"
            >
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={status === "updating"}
              className="flex-1 h-11 gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {status === "updating" ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Apply Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
