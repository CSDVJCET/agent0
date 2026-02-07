"use client";

import { format } from "date-fns";
import { 
  CheckCircle2Icon, 
  CalendarIcon,
  PartyPopperIcon
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface TaskCompleteDisplayProps {
  taskId: string;
  title: string;
  completedAt?: string;
}

export function TaskCompleteDisplay({ 
  taskId, 
  title, 
  completedAt 
}: TaskCompleteDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-green-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600 ring-1 ring-green-500/20">
              <CheckCircle2Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-green-700 dark:text-green-400 truncate">
                Task Completed!
              </h3>
              <p className="text-xs text-green-600/70 mt-0.5">Great job! Keep up the momentum</p>
            </div>
            <motion.div
              initial={{ rotate: -10, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <PartyPopperIcon className="w-6 h-6 text-green-500" />
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2Icon className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-through text-muted-foreground">
                {title}
              </h4>
              {completedAt && (
                <p className="text-xs text-green-600/70 mt-1 flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  Completed {format(new Date(completedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
