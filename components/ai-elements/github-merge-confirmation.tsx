"use client";

import { useState } from "react";
import {
  GitMergeIcon,
  GitBranchIcon,
  CheckIcon,
  XIcon,
  Loader2Icon,
  SparklesIcon,
  ExternalLinkIcon,
  BrainIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";

interface MergeDetails {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  head: string;
  base: string;
  mergeMethod: "merge" | "squash" | "rebase";
  commitMessage?: string;
  author?: string;
  url?: string;
}

interface MergedResult {
  merged: boolean;
  sha: string;
  message: string;
}

interface GitHubMergeConfirmationProps {
  toolCallId: string;
  mergeDetails: MergeDetails;
  reasoning: string;
}

const PROTECTED_BRANCHES = ["main", "master", "production", "release"];

export function GitHubMergeConfirmation({
  toolCallId,
  mergeDetails,
  reasoning,
}: GitHubMergeConfirmationProps) {
  const [formData, setFormData] = useState({
    mergeMethod: mergeDetails.mergeMethod || "squash",
    commitMessage: mergeDetails.commitMessage || "",
  });

  const [status, setStatus] = useState<"pending" | "merging" | "merged" | "rejected" | "error">("pending");
  const [mergedResult, setMergedResult] = useState<MergedResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProtected = PROTECTED_BRANCHES.includes(mergeDetails.base);

  const handleConfirm = async () => {
    setStatus("merging");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/github/merge-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: mergeDetails.owner,
          repo: mergeDetails.repo,
          pullNumber: mergeDetails.pullNumber,
          mergeMethod: formData.mergeMethod,
          commitMessage: formData.commitMessage || undefined,
        }),
      });

      const result = await response.json();
      if (result.error || !result.success) {
        setStatus("error");
        setErrorMessage(result.error || result.message || "Failed to merge PR");
      } else {
        setStatus("merged");
        setMergedResult({ merged: result.merged, sha: result.sha, message: result.message });
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to merge pull request");
    }
  };

  const handleReject = () => setStatus("rejected");

  // Success state
  if (status === "merged" && mergedResult) {
    return (
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-lg my-4 not-prose">
        <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-purple-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="border-b border-purple-500/10 bg-gradient-to-br from-purple-500/5 to-transparent p-4">
            <div className="flex items-center gap-3">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="p-2 rounded-lg bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/20">
                <GitMergeIcon className="w-5 h-5" />
              </motion.div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-purple-700 dark:text-purple-400">Pull Request Merged</h3>
                <p className="text-xs text-purple-600/70 dark:text-purple-500/70 mt-0.5">
                  {mergeDetails.owner}/{mergeDetails.repo} #{mergeDetails.pullNumber} • {mergedResult.sha?.slice(0, 7)}
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <h4 className="font-semibold text-lg">{mergeDetails.title}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranchIcon className="h-4 w-4" />
              <span className="font-mono text-xs">{mergeDetails.head}</span>
              <span>→</span>
              <span className="font-mono text-xs">{mergeDetails.base}</span>
            </div>
            {mergeDetails.url && (
              <Button variant="outline" size="sm" className="w-full mt-4 gap-2" asChild>
                <a href={mergeDetails.url} target="_blank" rel="noopener noreferrer"><ExternalLinkIcon className="h-4 w-4" />View on GitHub</a>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === "rejected") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg my-4 not-prose">
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600"><XIcon className="w-5 h-5" /></div>
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">Merge Cancelled</h3>
              <p className="text-xs text-amber-600/70 dark:text-amber-500/70">PR #{mergeDetails.pullNumber} was not merged</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === "error") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg my-4 not-prose">
        <div className="rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600"><XIcon className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to Merge</h3>
              <p className="text-xs text-red-600/70 dark:text-red-500/70">{errorMessage}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStatus("pending")}>Try Again</Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-lg my-4 not-prose">
      <ChainOfThought defaultOpen={false} className="mb-4">
        <ChainOfThoughtHeader>
          <span className="flex items-center gap-1.5"><SparklesIcon className="h-3.5 w-3.5" />Merge Details</span>
        </ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <ChainOfThoughtStep icon={BrainIcon} label="Analyzing your request" status="complete">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{reasoning}</p>
          </ChainOfThoughtStep>
        </ChainOfThoughtContent>
      </ChainOfThought>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="border-b border-border/50 bg-gradient-to-br from-purple-500/5 via-purple-500/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 ring-1 ring-purple-500/20"><GitMergeIcon className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Merge Pull Request #{mergeDetails.pullNumber}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{mergeDetails.owner}/{mergeDetails.repo}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* PR Info */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
            <h4 className="font-semibold text-sm">{mergeDetails.title}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <GitBranchIcon className="h-3.5 w-3.5" />
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{mergeDetails.head}</span>
              <span>→</span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{mergeDetails.base}</span>
            </div>
            {mergeDetails.author && (
              <p className="text-xs text-muted-foreground">by @{mergeDetails.author}</p>
            )}
          </div>

          {/* Protected branch warning */}
          {isProtected && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
              <AlertTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Merging into <span className="font-mono font-semibold">{mergeDetails.base}</span> — this is a protected branch. Please confirm this is intentional.
              </p>
            </div>
          )}

          {/* Merge Strategy */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Merge Strategy</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["merge", "squash", "rebase"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, mergeMethod: method }))}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    formData.mergeMethod === method
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                  disabled={status === "merging"}
                >
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Commit Message */}
          <div className="space-y-2">
            <Label htmlFor={`commit-msg-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Commit Message (optional)
            </Label>
            <Input
              id={`commit-msg-${toolCallId}`}
              value={formData.commitMessage}
              onChange={(e) => setFormData((prev) => ({ ...prev, commitMessage: e.target.value }))}
              placeholder={`Merge PR #${mergeDetails.pullNumber}`}
              className="h-10"
              disabled={status === "merging"}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleReject} disabled={status === "merging"} className="flex-1 h-11 gap-2">
              <XIcon className="h-4 w-4" />Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={status === "merging"} className="flex-1 h-11 gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              {status === "merging" ? (<><Loader2Icon className="h-4 w-4 animate-spin" />Merging...</>) : (<><GitMergeIcon className="h-4 w-4" />Merge PR</>)}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
