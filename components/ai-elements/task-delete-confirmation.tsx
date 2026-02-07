"use client";

import { useState } from "react";
import { 
  Trash2Icon, 
  XIcon, 
  CheckIcon,
  Loader2Icon,
  AlertTriangleIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

interface TaskDetails {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  priority?: string;
}

interface TaskDeleteConfirmationProps {
  toolCallId: string;
  taskDetails: TaskDetails;
  message: string;
}

export function TaskDeleteConfirmation({
  toolCallId,
  taskDetails,
  message,
}: TaskDeleteConfirmationProps) {
  const [status, setStatus] = useState<"pending" | "deleting" | "deleted" | "cancelled" | "error">("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    setStatus("deleting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/tasks/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: taskDetails.id,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.message || "Failed to delete task");
      } else {
        setStatus("deleted");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const handleCancel = () => {
    setStatus("cancelled");
  };

  // Show deleted success state
  if (status === "deleted") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
              <CheckIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-700 dark:text-green-400">Task Deleted</h3>
              <p className="text-xs text-green-600/70">
                "{taskDetails.title}" has been permanently deleted
              </p>
            </div>
          </div>
        </div>
      </motion.div>
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
              <h3 className="font-semibold text-muted-foreground">Deletion Cancelled</h3>
              <p className="text-xs text-muted-foreground/70">
                "{taskDetails.title}" was not deleted
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
              <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to Delete Task</h3>
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
      <div className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 via-red-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-red-500/10 bg-linear-to-br from-red-500/5 via-red-500/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600 ring-1 ring-red-500/20">
              <AlertTriangleIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base text-red-700 dark:text-red-400">Confirm Deletion</h3>
              <p className="text-xs text-red-600/70 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-background/50 rounded-lg p-4 border border-border/50">
            <h4 className="font-medium text-sm mb-1">{taskDetails.title}</h4>
            {taskDetails.notes && (
              <p className="text-xs text-muted-foreground">{taskDetails.notes}</p>
            )}
            {taskDetails.due && (
              <p className="text-xs text-muted-foreground mt-2">
                Due: {new Date(taskDetails.due).toLocaleDateString()}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{message}</p>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={status === "deleting"}
              className="flex-1 h-11"
            >
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={status === "deleting"}
              className="flex-1 h-11 gap-2"
            >
              {status === "deleting" ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2Icon className="h-4 w-4" />
                  Delete Task
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
