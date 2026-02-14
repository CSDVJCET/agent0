"use client";

import {
  GitBranchIcon,
  CheckIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { motion } from "motion/react";

interface GitHubBranchResultProps {
  branch: string;
  baseBranch: string;
  sha: string;
  owner: string;
  repo: string;
  message: string;
}

export function GitHubBranchResult({
  branch,
  baseBranch,
  sha,
  owner,
  repo,
  message,
}: GitHubBranchResultProps) {
  const branchUrl = `https://github.com/${owner}/${repo}/tree/${branch}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 via-green-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="border-b border-green-500/10 bg-gradient-to-br from-green-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="p-2 rounded-lg bg-green-500/10 text-green-600 ring-1 ring-green-500/20"
            >
              <CheckIcon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-base text-green-700 dark:text-green-400">
                Branch Created
              </h3>
              <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5">
                {owner}/{repo}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GitBranchIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-semibold">{branch}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>from</span>
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{baseBranch}</span>
            <span>at</span>
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{sha}</span>
          </div>
          <a
            href={branchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
          >
            <ExternalLinkIcon className="h-3 w-3" />
            View on GitHub
          </a>
        </div>
      </div>
    </motion.div>
  );
}
