"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  ListTodoIcon, 
  CheckCircle2Icon, 
  CircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  AlertTriangleIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { TaskDisplay } from "@/components/ai-elements/task-display";

interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  priority?: "high" | "medium" | "low";
  status: "needsAction" | "completed";
  isCompleted: boolean;
}

interface TaskListProps {
  tasks: Task[];
  taskCount: number;
  pendingCount: number;
  completedCount: number;
  message?: string;
}

export function TaskList({ 
  tasks, 
  taskCount, 
  pendingCount, 
  completedCount,
  message 
}: TaskListProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Deduplicate tasks to avoid key collisions
  const [localTasks, setLocalTasks] = useState(() => {
    const seen = new Set();
    return tasks.filter(task => {
      const id = task.id || `temp-${Math.random()}`; // Fallback if ID is missing
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  });

  const pendingTasks = localTasks.filter(t => !t.isCompleted);
  const completedTasks = localTasks.filter(t => t.isCompleted);

  const handleTaskComplete = (taskId: string) => {
    setLocalTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: t.status === "completed" ? "needsAction" : "completed", isCompleted: !t.isCompleted }
        : t
    ));
  };

  const handleTaskDelete = (taskId: string) => {
    setLocalTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // Group pending tasks by due date
  const groupedPendingTasks = pendingTasks.reduce((acc, task) => {
    const key = task.due || "no-due-date";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Sort groups by date
  const sortedGroups = Object.entries(groupedPendingTasks).sort(([a], [b]) => {
    if (a === "no-due-date") return 1;
    if (b === "no-due-date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const formatGroupDate = (dateStr: string): string => {
    if (dateStr === "no-due-date") return "No Due Date";
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return format(date, "EEEE, MMMM d");
  };

  if (taskCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 text-center">
          <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
            <ListTodoIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base">No Tasks Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your task list is empty. Create a new task to get started!
          </p>
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
        {/* Header */}
        <div className="border-b border-border/50 bg-linear-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                <ListTodoIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Your Tasks</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pendingCount} pending • {completedCount} completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium",
                pendingCount > 0 
                  ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                  : "bg-green-500/10 text-green-600 border border-green-500/20"
              )}>
                {pendingCount > 0 ? `${pendingCount} to do` : "All done!"}
              </span>
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="divide-y divide-border/30">
          {sortedGroups.map(([dateKey, groupTasks]) => (
            <div key={dateKey} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {formatGroupDate(dateKey)}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  ({groupTasks.length})
                </span>
              </div>
              <div className="space-y-2">
                {groupTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onComplete={handleTaskComplete}
                    onDelete={handleTaskDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Completed Tasks Section */}
        {completedTasks.length > 0 && (
          <div className="border-t border-border/50">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full p-4 flex items-center justify-between text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="w-4 h-4 text-green-500" />
                <span>Completed ({completedTasks.length})</span>
              </div>
              {showCompleted ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
            <AnimatePresence>
              {showCompleted && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {completedTasks.map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onComplete={handleTaskComplete}
                        onDelete={handleTaskDelete}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface TaskItemProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

function TaskItem({ task, onComplete, onDelete }: TaskItemProps) {
  const [isLoading, setIsLoading] = useState(false);

  const priorityColors = {
    high: "text-red-500",
    medium: "text-yellow-500",
    low: "text-blue-500",
  };

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          completed: !task.isCompleted,
        }),
      });

      const result = await response.json();
      if (!result.error) {
        onComplete(task.id);
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isOverdue = task.due && !task.isCompleted && new Date(task.due) < new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors",
        task.isCompleted ? "bg-muted/30" : "bg-background/50 hover:bg-muted/20",
        isOverdue && "border border-red-500/20 bg-red-500/5"
      )}
    >
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "mt-0.5 p-1 rounded-full transition-colors",
          task.isCompleted 
            ? "text-green-500 hover:text-green-600" 
            : "text-muted-foreground hover:text-primary"
        )}
      >
        {task.isCompleted ? (
          <CheckCircle2Icon className="w-5 h-5" />
        ) : (
          <CircleIcon className="w-5 h-5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={cn(
            "font-medium text-sm",
            task.isCompleted && "line-through text-muted-foreground"
          )}>
            {task.title}
          </span>
          {task.priority && (
            <AlertTriangleIcon className={cn("w-4 h-4 shrink-0", priorityColors[task.priority])} />
          )}
        </div>
        {task.notes && (
          <p className={cn(
            "text-xs text-muted-foreground mt-1 line-clamp-2",
            task.isCompleted && "line-through"
          )}>
            {task.notes}
          </p>
        )}
        {task.due && (
          <p className={cn(
            "text-xs mt-1",
            isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
          )}>
            {isOverdue ? "Overdue: " : "Due: "}
            {format(new Date(task.due), "MMM d")}
          </p>
        )}
      </div>
    </motion.div>
  );
}
