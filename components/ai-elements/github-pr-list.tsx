"use client";

import {
  GitPullRequestIcon,
  GitBranchIcon,
  ExternalLinkIcon,
  CircleDotIcon,
  CheckCircle2Icon,
  CircleXIcon,
  UserIcon,
} from "lucide-react";
import { motion } from "motion/react";

interface PullRequest {
  number: number;
  title: string;
  author: string;
  state: string;
  draft?: boolean;
  url: string;
  createdAt: string;
  head: string;
  base: string;
}

interface GitHubPRListProps {
  pullRequests: PullRequest[];
  count: number;
  owner: string;
  repo: string;
  message: string;
}

export function GitHubPRList({
  pullRequests,
  count,
  owner,
  repo,
}: GitHubPRListProps) {
  const getStateIcon = (state: string, draft?: boolean) => {
    if (draft) return <CircleDotIcon className="h-4 w-4 text-muted-foreground" />;
    if (state === "open") return <CircleDotIcon className="h-4 w-4 text-green-500" />;
    if (state === "closed") return <CircleXIcon className="h-4 w-4 text-red-500" />;
    return <CheckCircle2Icon className="h-4 w-4 text-purple-500" />;
  };

  const getStateColor = (state: string, draft?: boolean) => {
    if (draft) return "text-muted-foreground";
    if (state === "open") return "text-green-500";
    if (state === "closed") return "text-red-500";
    return "text-purple-500";
  };

  if (pullRequests.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg my-4 not-prose">
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg p-6 text-center">
          <GitPullRequestIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No pull requests found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{owner}/{repo}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg my-4 not-prose">
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="border-b border-border/50 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <GitPullRequestIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Pull Requests</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {count} PR{count !== 1 ? "s" : ""} in {owner}/{repo}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/30">
          {pullRequests.map((pr) => (
            <a
              key={pr.number}
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors group"
            >
              {getStateIcon(pr.state, pr.draft)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {pr.title}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">#{pr.number}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {pr.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranchIcon className="h-3 w-3" />
                    <span className="font-mono">{pr.head}</span>
                    <span>→</span>
                    <span className="font-mono">{pr.base}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium capitalize ${getStateColor(pr.state, pr.draft)}`}>
                    {pr.draft ? "Draft" : pr.state}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    {new Date(pr.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <ExternalLinkIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
