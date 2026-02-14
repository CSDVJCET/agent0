"use client";

import {
  BookOpenIcon,
  StarIcon,
  LockIcon,
  GlobeIcon,
  ExternalLinkIcon,
  GitBranchIcon,
} from "lucide-react";
import { motion } from "motion/react";

interface Repository {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch?: string;
  stars: number;
  language: string | null;
  url: string;
  updatedAt: string | null;
  private: boolean;
}

interface GitHubRepoListProps {
  repositories: Repository[];
  count: number;
  message: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-green-500",
  Rust: "bg-orange-500",
  Go: "bg-cyan-500",
  Java: "bg-red-500",
  "C#": "bg-purple-500",
  "C++": "bg-pink-500",
  Ruby: "bg-red-600",
  Swift: "bg-orange-400",
  Kotlin: "bg-violet-500",
  PHP: "bg-indigo-400",
  HTML: "bg-orange-600",
  CSS: "bg-blue-400",
};

export function GitHubRepoList({
  repositories,
  count,
}: GitHubRepoListProps) {
  if (repositories.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg my-4 not-prose">
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg p-6 text-center">
          <BookOpenIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No repositories found</p>
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
              <BookOpenIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Repositories</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {count} repositor{count !== 1 ? "ies" : "y"}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/30">
          {repositories.map((repo) => (
            <a
              key={repo.fullName}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors group"
            >
              <div className="p-1.5 rounded-lg bg-muted/50 mt-0.5">
                {repo.private ? (
                  <LockIcon className="h-4 w-4 text-amber-500" />
                ) : (
                  <GlobeIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {repo.fullName}
                  </span>
                </div>
                {repo.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{repo.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${LANGUAGE_COLORS[repo.language] || "bg-gray-400"}`} />
                      {repo.language}
                    </span>
                  )}
                  {repo.stars > 0 && (
                    <span className="flex items-center gap-1">
                      <StarIcon className="h-3 w-3" />
                      {repo.stars}
                    </span>
                  )}
                  {repo.defaultBranch && (
                    <span className="flex items-center gap-1">
                      <GitBranchIcon className="h-3 w-3" />
                      {repo.defaultBranch}
                    </span>
                  )}
                  {repo.updatedAt && (
                    <span className="text-muted-foreground/60">
                      {new Date(repo.updatedAt).toLocaleDateString()}
                    </span>
                  )}
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
