"use client";

import { motion } from "motion/react";

export type ChatEmptyStateProps = {
  title?: string;
  subtitle?: string;
};

export function ChatEmptyState({
  title = "How can I help you today?",
  subtitle = "Powered by Google Gemini • Search, Code Execution, URL Context & More",
}: ChatEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="text-center space-y-4"
    >
      <h1 className="text-5xl font-bold tracking-tight text-neutral-800 drop-shadow-sm">
        {title}
      </h1>
      <p className="text-neutral-600 font-medium text-lg max-w-lg mx-auto">
        {subtitle}
      </p>
    </motion.div>
  );
}
