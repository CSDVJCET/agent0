"use client";

import { format } from "date-fns";
import { 
  CheckCircle2Icon, 
  CircleIcon, 
  CalendarIcon, 
  AlertTriangleIcon,
  ListTodoIcon,
  Trash2Icon,
  Loader2Icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TaskDisplayProps {
  taskId: string;
  title: string;
  notes?: string;
  due?: string;
  priority?: "high" | "medium" | "low";
  status: "needsAction" | "completed";
  isNew?: boolean;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

const priorityConfig = {
  high: {
    label: "High",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
    iconClassName: "text-red-500",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    iconClassName: "text-yellow-500",
  },
  low: {
    label: "Low",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    iconClassName: "text-blue-500",
  },
};

export function TaskDisplay({ 
  taskId, 
  title, 
  notes, 
  due, 
  priority, 
  status: initialStatus,
  isNew = false,
  onComplete,
  onDelete
}: TaskDisplayProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  
  const isCompleted = status === "completed";
  const priorityInfo = priority ? priorityConfig[priority] : null;
  const dueDate = due ? new Date(due) : null;
  const isOverdue = dueDate && !isCompleted && dueDate < new Date();

  const handleToggleComplete = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          completed: !isCompleted,
        }),
      });

      const result = await response.json();
      if (!result.error) {
        setStatus(isCompleted ? "needsAction" : "completed");
        onComplete?.(taskId);
      }
    } catch (error) {
      console.error("Failed to toggle task completion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    
    try {
      const response = await fetch("/api/tasks/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      const result = await response.json();
      if (!result.error) {
        setIsDeleted(true);
        onDelete?.(taskId);
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDeleted) {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0.95, height: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg my-4 not-prose overflow-hidden"
      >
        <div className="rounded-xl border border-muted/50 bg-muted/20 p-4 text-center text-muted-foreground">
          Task deleted
        </div>
      </motion.div>
    );
  }

  const borderColor = isNew
    ? "border-green-500/20"
    : isCompleted
    ? "border-muted/50"
    : isOverdue
    ? "border-red-500/20"
    : "border-border/50";

  const bgGradient = isNew
    ? "from-green-500/5 via-green-500/3 to-transparent"
    : isCompleted
    ? "from-muted/20 via-muted/10 to-transparent"
    : isOverdue
    ? "from-red-500/5 via-red-500/3 to-transparent"
    : "from-primary/5 via-primary/3 to-transparent";

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 10, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
        scale: { duration: 0.3 }
      }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className={cn(
        "rounded-xl border backdrop-blur-sm shadow-lg overflow-hidden",
        borderColor,
        `bg-linear-to-br ${bgGradient}`
      )}>
        {/* Header */}
        <div className={cn(
          "border-b p-4",
          isNew ? "border-green-500/10" : isCompleted ? "border-muted/30" : "border-border/50"
        )}>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleComplete}
              disabled={isLoading}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                isCompleted 
                  ? "bg-green-500/10 text-green-600 ring-1 ring-green-500/20 hover:bg-green-500/20" 
                  : "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )}
            >
              {isLoading ? (
                <Loader2Icon className="w-5 h-5 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle2Icon className="w-5 h-5" />
              ) : (
                <CircleIcon className="w-5 h-5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-semibold text-base truncate",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {title}
              </h3>
              {isNew && (
                <p className="text-xs text-green-600/70 mt-0.5">Task created successfully</p>
              )}
            </div>
            {priorityInfo && (
              <span className={cn(
                "px-2 py-1 text-xs font-medium rounded-full border",
                priorityInfo.className
              )}>
                {priorityInfo.label}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className={cn(
                "h-4 w-4",
                isOverdue ? "text-red-500" : "text-muted-foreground"
              )} />
              <span className={cn(
                isOverdue ? "text-red-600 font-medium" : "text-muted-foreground",
                isCompleted && "line-through"
              )}>
                {isOverdue ? "Overdue: " : "Due: "}
                {/* Show time only if it's not 23:59 (default end of day) */}
                {dueDate.getHours() !== 23 || dueDate.getMinutes() !== 59
                  ? format(dueDate, "EEEE, MMMM d, yyyy 'at' h:mm a")
                  : format(dueDate, "EEEE, MMMM d, yyyy")
                }
              </span>
            </div>
          )}

          {notes && (
            <div className={cn(
              "text-sm text-muted-foreground",
              isCompleted && "line-through"
            )}>
              {notes}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleComplete}
              disabled={isLoading}
              className="flex-1 gap-2"
            >
              {isLoading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : isCompleted ? (
                <>
                  <CircleIcon className="h-4 w-4" />
                  Mark Incomplete
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="h-4 w-4" />
                  Mark Complete
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2 text-red-600 hover:bg-red-500/10 hover:text-red-700 hover:border-red-500/30"
            >
              {isDeleting ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2Icon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
