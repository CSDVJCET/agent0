"use client";

import { useState } from "react";
import {
  GitPullRequestIcon,
  GitBranchIcon,
  FileTextIcon,
  CheckIcon,
  XIcon,
  Loader2Icon,
  SparklesIcon,
  ExternalLinkIcon,
  BrainIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "motion/react";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";

interface PRDetails {
  owner?: string;
  repo?: string;
  title: string;
  head: string;
  base: string;
  body?: string;
  draft?: boolean;
}

interface RepoOption {
  owner: string;
  name: string;
  fullName: string;
}

interface CreatedPRResult {
  url: string;
  number: number;
  title: string;
  owner: string;
  repo: string;
  state: string;
  draft: boolean;
}

interface GitHubPRConfirmationProps {
  toolCallId: string;
  prDetails: PRDetails;
  reasoning: string;
  availableRepos?: RepoOption[];
  availableBranches?: string[];
}

export function GitHubPRConfirmation({
  toolCallId,
  prDetails,
  reasoning,
  availableRepos = [],
  availableBranches = [],
}: GitHubPRConfirmationProps) {
  const [formData, setFormData] = useState({
    owner: prDetails.owner || "",
    repo: prDetails.repo || "",
    title: prDetails.title || "",
    head: prDetails.head || "",
    base: prDetails.base || "main",
    body: prDetails.body || "",
    draft: prDetails.draft || false,
  });

  const [status, setStatus] = useState<"pending" | "creating" | "created" | "rejected" | "error">("pending");
  const [createdPR, setCreatedPR] = useState<CreatedPRResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showHeadDropdown, setShowHeadDropdown] = useState(false);
  const [showBaseDropdown, setShowBaseDropdown] = useState(false);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRepoSelect = (repo: RepoOption) => {
    setFormData((prev) => ({ ...prev, owner: repo.owner, repo: repo.name }));
    setShowRepoDropdown(false);
  };

  const handleBranchSelect = (field: "head" | "base", branch: string) => {
    setFormData((prev) => ({ ...prev, [field]: branch }));
    if (field === "head") setShowHeadDropdown(false);
    if (field === "base") setShowBaseDropdown(false);
  };

  const handleConfirm = async () => {
    setStatus("creating");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/github/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: formData.owner,
          repo: formData.repo,
          title: formData.title,
          head: formData.head,
          base: formData.base,
          body: formData.body || undefined,
          draft: formData.draft,
        }),
      });

      const result = await response.json();
      if (result.error || !result.success) {
        setStatus("error");
        setErrorMessage(result.error || result.message || "Failed to create PR");
      } else {
        setStatus("created");
        setCreatedPR({ url: result.url, number: result.number, title: result.title, owner: result.owner, repo: result.repo, state: result.state, draft: result.draft });
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to create pull request");
    }
  };

  const handleReject = () => setStatus("rejected");
  const isValid = formData.owner && formData.repo && formData.title && formData.head && formData.base;

  // Success state
  if (status === "created" && createdPR) {
    return (
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-lg my-4 not-prose">
        <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 via-green-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="border-b border-green-500/10 bg-gradient-to-br from-green-500/5 to-transparent p-4">
            <div className="flex items-center gap-3">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="p-2 rounded-lg bg-green-500/10 text-green-600 ring-1 ring-green-500/20">
                <CheckIcon className="w-5 h-5" />
              </motion.div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-green-700 dark:text-green-400">Pull Request Created Successfully</h3>
                <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5">{createdPR.owner}/{createdPR.repo} #{createdPR.number}{createdPR.draft && " (Draft)"}</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <h4 className="font-semibold text-lg">{createdPR.title}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranchIcon className="h-4 w-4" />
              <span>{formData.head} → {formData.base}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4 gap-2" asChild>
              <a href={createdPR.url} target="_blank" rel="noopener noreferrer"><ExternalLinkIcon className="h-4 w-4" />Open on GitHub</a>
            </Button>
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
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">Pull Request Cancelled</h3>
              <p className="text-xs text-amber-600/70 dark:text-amber-500/70">The pull request was not created</p>
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
              <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to Create Pull Request</h3>
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

  const BranchDropdown = ({ field, value, label, required }: { field: "head" | "base"; value: string; label: string; required?: boolean }) => {
    const isOpen = field === "head" ? showHeadDropdown : showBaseDropdown;
    const setOpen = field === "head" ? setShowHeadDropdown : setShowBaseDropdown;

    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <GitBranchIcon className="w-3 h-3" />
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        {availableBranches.length > 0 ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(!isOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={status === "creating"}
            >
              <span className={value ? "text-foreground font-mono text-xs" : "text-muted-foreground"}>{value || `Select ${label.toLowerCase()}...`}</span>
              <ChevronsUpDownIcon className="h-4 w-4 text-muted-foreground" />
            </button>
            {isOpen && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                {availableBranches.map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => handleBranchSelect(field, branch)}
                    className="flex w-full items-center px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors font-mono"
                  >
                    <span>{branch}</span>
                    {value === branch && <CheckIcon className="ml-auto h-4 w-4 text-primary" />}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        ) : (
          <Input value={value} onChange={(e) => handleChange(field, e.target.value)} placeholder={`${label.toLowerCase()}`} className="h-10 font-mono text-xs" disabled={status === "creating"} />
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-lg my-4 not-prose">
      <ChainOfThought defaultOpen={false} className="mb-4">
        <ChainOfThoughtHeader>
          <span className="flex items-center gap-1.5"><SparklesIcon className="h-3.5 w-3.5" />PR Details Extracted</span>
        </ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <ChainOfThoughtStep icon={BrainIcon} label="Analyzing your request" status="complete">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{reasoning}</p>
          </ChainOfThoughtStep>
        </ChainOfThoughtContent>
      </ChainOfThought>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="border-b border-border/50 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"><GitPullRequestIcon className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Create Pull Request</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Review and confirm before creating</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Repository Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Repository <span className="text-destructive">*</span></Label>
            {availableRepos.length > 0 ? (
              <div className="relative">
                <button type="button" onClick={() => setShowRepoDropdown(!showRepoDropdown)} className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={status === "creating"}>
                  <span className={formData.owner && formData.repo ? "text-foreground" : "text-muted-foreground"}>
                    {formData.owner && formData.repo ? `${formData.owner}/${formData.repo}` : "Select a repository..."}
                  </span>
                  <ChevronsUpDownIcon className="h-4 w-4 text-muted-foreground" />
                </button>
                {showRepoDropdown && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                    {availableRepos.map((repo) => (
                      <button key={repo.fullName} type="button" onClick={() => handleRepoSelect(repo)} className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <span className="font-medium">{repo.fullName}</span>
                        {formData.owner === repo.owner && formData.repo === repo.name && <CheckIcon className="ml-auto h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Input value={formData.owner} onChange={(e) => handleChange("owner", e.target.value)} placeholder="owner" className="h-10" disabled={status === "creating"} />
                <Input value={formData.repo} onChange={(e) => handleChange("repo", e.target.value)} placeholder="repo-name" className="h-10" disabled={status === "creating"} />
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor={`title-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">PR Title <span className="text-destructive">*</span></Label>
            <Input id={`title-${toolCallId}`} value={formData.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="Brief description of the changes" className="h-10" disabled={status === "creating"} />
          </div>

          {/* Branch selectors */}
          <div className="grid grid-cols-2 gap-3">
            <BranchDropdown field="head" value={formData.head} label="Head Branch" required />
            <BranchDropdown field="base" value={formData.base} label="Base Branch" required />
          </div>

          {/* Branch direction indicator */}
          {formData.head && formData.base && (
            <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
              <span className="font-mono bg-muted px-2 py-0.5 rounded">{formData.head}</span>
              <span>→</span>
              <span className="font-mono bg-muted px-2 py-0.5 rounded">{formData.base}</span>
            </div>
          )}

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor={`body-${toolCallId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <FileTextIcon className="w-3 h-3" />Description
            </Label>
            <Textarea id={`body-${toolCallId}`} value={formData.body} onChange={(e) => handleChange("body", e.target.value)} placeholder="Detailed description of changes (Markdown supported)" className="min-h-[120px] resize-none" disabled={status === "creating"} />
          </div>

          {/* Draft checkbox */}
          <div className="flex items-center space-x-2">
            <input type="checkbox" id={`draft-${toolCallId}`} checked={formData.draft} onChange={(e) => handleChange("draft", e.target.checked)} disabled={status === "creating"} className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
            <Label htmlFor={`draft-${toolCallId}`} className="text-sm font-normal cursor-pointer">Create as draft pull request</Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleReject} disabled={status === "creating"} className="flex-1 h-11 gap-2">
              <XIcon className="h-4 w-4" />Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!isValid || status === "creating"} className="flex-1 h-11 gap-2">
              {status === "creating" ? (<><Loader2Icon className="h-4 w-4 animate-spin" />Creating...</>) : (<><CheckIcon className="h-4 w-4" />Create PR</>)}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
