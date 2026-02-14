"use client";

import {
  MessageSquareIcon,
  CheckIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { motion } from "motion/react";

interface GitHubCommentResultProps {
  issueNumber: number;
  url: string;
  owner: string;
  repo: string;
  message: string;
}

export function GitHubCommentResult({
  issueNumber,
  url,
  owner,
  repo,
}: GitHubCommentResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-blue-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="p-2 rounded-lg bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20"
            >
              <MessageSquareIcon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-base text-blue-700 dark:text-blue-400">
                Comment Added
              </h3>
              <p className="text-xs text-blue-600/70 dark:text-blue-500/70 mt-0.5">
                {owner}/{repo} #{issueNumber}
              </p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              View
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
