"use client";

import { useState } from "react";
import { 
  ListTodoIcon, 
  CalendarIcon, 
  AlignLeftIcon, 
  CheckIcon, 
  Loader2Icon, 
  XIcon,
  AlertTriangleIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TaskDisplay } from "@/components/ai-elements/task-display";

interface TaskDraftProps {
  draftId: string;
  defaultValues: {
    title?: string;
    notes?: string;
    due?: string;
    priority?: "high" | "medium" | "low";
    taskListId?: string;
  };
}

interface CreatedTaskResult {
  taskId: string;
  title: string;
  notes?: string;
  due?: string;
  priority?: string;
  status: string;
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function TaskDraft({ draftId, defaultValues }: TaskDraftProps) {
  const [formData, setFormData] = useState({
    title: defaultValues.title || "",
    notes: defaultValues.notes || "",
    due: defaultValues.due 
      ? defaultValues.due.includes('T') 
        ? defaultValues.due.split('T')[0] 
        : defaultValues.due
      : "",
    priority: defaultValues.priority || "medium",
  });
  const [status, setStatus] = useState<"pending" | "creating" | "created" | "error">("pending");
  const [createdTask, setCreatedTask] = useState<CreatedTaskResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("creating");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          notes: formData.notes || undefined,
          due: formData.due || undefined,
          priority: formData.priority,
          taskListId: defaultValues.taskListId,
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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isValid = formData.title.trim().length > 0;

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

  if (status === "error") {
    return (
      <div className="w-full max-w-lg my-4 not-prose">
        <div className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
              <XIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to Create Task</h3>
              <p className="text-xs text-red-600/70 dark:text-red-500/70">{errorMessage}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStatus("pending")}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg my-4 not-prose">
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/50 bg-linear-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <ListTodoIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Create New Task</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Fill in the task details</p>
            </div>
          </div>
        </div>
        
        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title - Required */}
          <div className="space-y-2">
            <Label htmlFor={`title-${draftId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              Task Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`title-${draftId}`}
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="What needs to be done?"
              className={cn(
                "h-10 transition-all",
                !formData.title && "border-destructive/50 focus-visible:ring-destructive/20"
              )}
              required
              disabled={status === "creating"}
            />
          </div>

          {/* Due Date & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`due-${draftId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="w-3 h-3" />
                Due Date
              </Label>
              <Input
                id={`due-${draftId}`}
                type="date"
                value={formData.due}
                onChange={(e) => handleChange("due", e.target.value)}
                className="h-10 transition-all"
                disabled={status === "creating"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`priority-${draftId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <AlertTriangleIcon className="w-3 h-3" />
                Priority
              </Label>
              <select
                id={`priority-${draftId}`}
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

          {/* Notes - Optional */}
          <div className="space-y-2">
            <Label htmlFor={`notes-${draftId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <AlignLeftIcon className="w-3 h-3" />
              Notes
            </Label>
            <Textarea
              id={`notes-${draftId}`}
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add any additional details..."
              className="min-h-[90px] resize-none"
              disabled={status === "creating"}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button 
              type="submit"
              disabled={!isValid || status === "creating"}
              className="w-full h-11 gap-2 font-medium shadow-sm"
              size="lg"
            >
              {status === "creating" ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Creating Task...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
