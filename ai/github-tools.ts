import { tool } from "ai";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

/**
 * GitHub Tools for Agent0 — Agentic GitHub Integration
 *
 * These tools allow the AI agent to interact with GitHub via the REST API.
 * Users invoke these tools using @github mentions in their prompts.
 *
 * The agent uses a multi-step agentic loop:
 * 1. ALWAYS fetch context first (listRepositories, listBranches, getRepository)
 * 2. Self-correct user input by matching against real data
 * 3. Present Gen UI confirmations for all mutating operations
 *
 * Available operations:
 * - listRepositories: Fetch user's repos (always call first for context)
 * - getRepository: Get details of a specific repo
 * - listBranches: List branches in a repo (for branch validation)
 * - listPullRequests: List pull requests with filtering
 * - scheduleIssueCreation: HITL issue creation with Gen UI
 * - schedulePRCreation: HITL PR creation with Gen UI
 * - scheduleMerge: HITL merge with Gen UI confirmation
 * - createIssue: Direct issue creation (used by Gen UI)
 * - createBranch: Create a new branch from a base ref
 * - createPullRequest: Direct PR creation (used by Gen UI)
 * - mergePullRequest: Direct merge (used by Gen UI after confirmation)
 * - commentOnPR: Add a comment to a pull request
 */

// ---------------------------------------------------------------------------
// Octokit singleton (lazy, auth'd from env)
// ---------------------------------------------------------------------------

let _octokit: Octokit | null = null;

type RepoContext = {
  owner: string;
  repo: string;
};

function getOctokit(): Octokit {
  if (_octokit) return _octokit;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is not set. " +
        "Please add a GitHub Personal Access Token to your .env file."
    );
  }

  _octokit = new Octokit({ auth: token });
  return _octokit;
}

// ---------------------------------------------------------------------------
// Shared validation helpers
// ---------------------------------------------------------------------------

const ownerRepoSchema = {
  owner: z
    .string()
    .optional()
    .describe("GitHub repository owner (user or organisation)"),
  repo: z
    .string()
    .optional()
    .describe("GitHub repository name (without the owner prefix)"),
};

/** Protected branch names that require explicit confirmation before merge */
const PROTECTED_BRANCHES = ["main", "master", "production", "release"];

function getDefaultRepoContext(): Partial<RepoContext> {
  const defaultOwner = process.env.GITHUB_DEFAULT_OWNER?.trim();
  const defaultRepo = process.env.GITHUB_DEFAULT_REPO?.trim();
  const repoFromCombined = process.env.GITHUB_REPOSITORY?.trim(); // owner/repo

  if (defaultOwner && defaultRepo) {
    return { owner: defaultOwner, repo: defaultRepo };
  }

  if (repoFromCombined && repoFromCombined.includes("/")) {
    const [owner, repo] = repoFromCombined.split("/");
    if (owner && repo) {
      return { owner, repo };
    }
  }

  return {};
}

function resolveRepoContext(owner?: string, repo?: string): RepoContext {
  const defaults = getDefaultRepoContext();
  const finalOwner = owner?.trim() || defaults.owner;
  const finalRepo = repo?.trim() || defaults.repo;

  if (!finalOwner || !finalRepo) {
    throw new Error(
      "Missing repository context. Provide owner/repo in the tool call or set GITHUB_DEFAULT_OWNER and GITHUB_DEFAULT_REPO (or GITHUB_REPOSITORY=owner/repo)."
    );
  }

  return { owner: finalOwner, repo: finalRepo };
}

function formatGitHubError(error: any, action: string): string {
  const status = error?.status;
  const message = error?.message || "Unknown GitHub API error";

  if (status === 401) {
    return `${action} failed: invalid/expired GitHub token. Update GITHUB_TOKEN.`;
  }

  if (status === 403) {
    return `${action} failed: token does not have sufficient permissions for this repository/action.`;
  }

  if (status === 404) {
    return `${action} failed: repository/resource not found OR token lacks access. Verify owner/repo and token scopes (Issues:write, Pull requests:write, Contents:write, Metadata:read).`;
  }

  if (typeof message === "string" && message.includes("Must have admin rights")) {
    return `${action} failed: this action requires elevated repository permission (admin/maintain/triage depending on repo policy).`;
  }

  return `${action} failed: ${message}`;
}

// ---------------------------------------------------------------------------
// 1. Create Issue
// ---------------------------------------------------------------------------

export const createIssue = tool({
  description:
    "Create a new issue in a GitHub repository. Returns the issue URL, number, and title.",
  inputSchema: z.object({
    ...ownerRepoSchema,
    title: z.string().min(1).describe("Title of the issue"),
    body: z
      .string()
      .optional()
      .describe("Markdown body / description of the issue"),
    labels: z
      .array(z.string())
      .optional()
      .describe("Labels to apply (e.g. ['bug', 'security'])"),
    assignees: z
      .array(z.string())
      .optional()
      .describe("GitHub usernames to assign"),
  }),
  execute: async ({ owner, repo, title, body, labels, assignees }) => {
    try {
      const { owner: repoOwner, repo: repoName } = resolveRepoContext(owner, repo);
      const octokit = getOctokit();
      const { data } = await octokit.issues.create({
        owner: repoOwner,
        repo: repoName,
        title,
        body: body ?? undefined,
        labels: labels ?? undefined,
        assignees: assignees ?? undefined,
      });

      return {
        success: true,
        url: data.html_url,
        number: data.number,
        title: data.title,
        owner: repoOwner,
        repo: repoName,
        message: `Issue #${data.number} created successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: formatGitHubError(error, "Create issue"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// 2. Create Branch
// ---------------------------------------------------------------------------

export const createBranch = tool({
  description:
    "Create a new branch in a GitHub repository from a base branch. Returns the new branch name and commit SHA.",
  inputSchema: z.object({
    ...ownerRepoSchema,
    baseBranch: z
      .string()
      .default("main")
      .describe("Base branch to branch from (default: main)"),
    newBranch: z.string().min(1).describe("Name for the new branch"),
  }),
  execute: async ({ owner, repo, baseBranch, newBranch }) => {
    try {
      const { owner: repoOwner, repo: repoName } = resolveRepoContext(owner, repo);
      const octokit = getOctokit();

      // Get the SHA of the base branch
      const { data: refData } = await octokit.git.getRef({
        owner: repoOwner,
        repo: repoName,
        ref: `heads/${baseBranch}`,
      });

      const sha = refData.object.sha;

      // Create the new branch ref
      await octokit.git.createRef({
        owner: repoOwner,
        repo: repoName,
        ref: `refs/heads/${newBranch}`,
        sha,
      });

      return {
        success: true,
        branch: newBranch,
        baseBranch,
        sha,
        owner: repoOwner,
        repo: repoName,
        message: `Branch '${newBranch}' created from '${baseBranch}' at ${sha.slice(0, 7)}`,
      };
    } catch (error: any) {
      if (error?.status === 422 && String(error?.message || "").toLowerCase().includes("reference already exists")) {
        return {
          success: false,
          error: `Create branch failed: branch '${newBranch}' already exists. Use a different branch name.`,
        };
      }

      return {
        success: false,
        error: formatGitHubError(error, "Create branch"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// 3. Create Pull Request
// ---------------------------------------------------------------------------

export const createPullRequest = tool({
  description:
    "Open a new pull request in a GitHub repository. Returns the PR URL and number.",
  inputSchema: z.object({
    ...ownerRepoSchema,
    title: z.string().min(1).describe("Title of the pull request"),
    head: z.string().min(1).describe("Branch containing the changes"),
    base: z
      .string()
      .default("main")
      .describe("Branch to merge into (default: main)"),
    body: z
      .string()
      .optional()
      .describe("Markdown description of the pull request"),
    draft: z
      .boolean()
      .default(false)
      .describe("Whether to create the PR as a draft"),
  }),
  execute: async ({ owner, repo, title, head, base, body, draft }) => {
    try {
      const { owner: repoOwner, repo: repoName } = resolveRepoContext(owner, repo);
      const octokit = getOctokit();
      const { data } = await octokit.pulls.create({
        owner: repoOwner,
        repo: repoName,
        title,
        head,
        base,
        body: body ?? undefined,
        draft,
      });

      return {
        success: true,
        url: data.html_url,
        number: data.number,
        title: data.title,
        state: data.state,
        draft: data.draft,
        owner: repoOwner,
        repo: repoName,
        message: `Pull request #${data.number} created successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: formatGitHubError(error, "Create pull request"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// 4. Merge Pull Request
// ---------------------------------------------------------------------------

export const mergePullRequest = tool({
  description:
    "Merge an existing pull request. Supports merge, squash, and rebase strategies. " +
    "Will warn before merging into protected branches (main, master, production, release).",
  inputSchema: z.object({
    ...ownerRepoSchema,
    pullNumber: z.number().int().positive().describe("Pull request number"),
    mergeMethod: z
      .enum(["merge", "squash", "rebase"])
      .default("merge")
      .describe("Merge strategy to use"),
    commitMessage: z
      .string()
      .optional()
      .describe("Custom commit message for the merge"),
    confirmed: z
      .boolean()
      .default(false)
      .describe(
        "Set to true to confirm merging into a protected branch. " +
          "If the target branch is protected and this is false the tool will return a confirmation prompt instead of merging."
      ),
  }),
  execute: async ({
    owner,
    repo,
    pullNumber,
    mergeMethod,
    commitMessage,
    confirmed,
  }) => {
    try {
      const { owner: repoOwner, repo: repoName } = resolveRepoContext(owner, repo);
      const octokit = getOctokit();

      // Fetch the PR first to validate it exists and check its target branch
      const { data: pr } = await octokit.pulls.get({
        owner: repoOwner,
        repo: repoName,
        pull_number: pullNumber,
      });

      if (pr.state !== "open") {
        return {
          success: false,
          error: `PR #${pullNumber} is already ${pr.state}`,
        };
      }

      // Guard against merging into protected branches without confirmation
      if (
        PROTECTED_BRANCHES.includes(pr.base.ref) &&
        !confirmed
      ) {
        return {
          success: false,
          requiresConfirmation: true,
          targetBranch: pr.base.ref,
          message:
            `⚠️ PR #${pullNumber} targets the protected branch '${pr.base.ref}'. ` +
            `Please confirm by re-running the merge with confirmed=true.`,
        };
      }

      const { data: mergeResult } = await octokit.pulls.merge({
        owner: repoOwner,
        repo: repoName,
        pull_number: pullNumber,
        merge_method: mergeMethod,
        commit_message: commitMessage ?? undefined,
      });

      return {
        success: true,
        merged: mergeResult.merged,
        sha: mergeResult.sha,
        owner: repoOwner,
        repo: repoName,
        message: mergeResult.message ?? `PR #${pullNumber} merged successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: formatGitHubError(error, "Merge pull request"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// 5. Comment on Pull Request
// ---------------------------------------------------------------------------

export const commentOnPR = tool({
  description:
    "Add a comment to a pull request (or issue). Returns the comment URL.",
  inputSchema: z.object({
    ...ownerRepoSchema,
    issueNumber: z
      .number()
      .int()
      .positive()
      .describe("Pull request (or issue) number"),
    body: z.string().min(1).describe("Comment body (Markdown supported)"),
  }),
  execute: async ({ owner, repo, issueNumber, body }) => {
    try {
      const { owner: repoOwner, repo: repoName } = resolveRepoContext(owner, repo);
      const octokit = getOctokit();
      const { data } = await octokit.issues.createComment({
        owner: repoOwner,
        repo: repoName,
        issue_number: issueNumber,
        body,
      });

      return {
        success: true,
        url: data.html_url,
        commentId: data.id,
        owner: repoOwner,
        repo: repoName,
        message: `Comment added to #${issueNumber}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: formatGitHubError(error, "Comment on pull request"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// 6. List Pull Requests
// ---------------------------------------------------------------------------

export const listPullRequests = tool({
  description:
    "List pull requests for a GitHub repository. Returns a structured list of PRs with number, title, author, state and URL.",
  inputSchema: z.object({
    ...ownerRepoSchema,
    state: z
      .enum(["open", "closed", "all"])
      .default("open")
      .describe("Filter by PR state"),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10)
      .describe("Number of results per page (max 100)"),
    sort: z
      .enum(["created", "updated", "popularity", "long-running"])
      .default("created")
      .describe("Sort order"),
    direction: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("Sort direction"),
  }),
  execute: async ({ owner, repo, state, perPage, sort, direction }) => {
    try {
      const { owner: repoOwner, repo: repoName } = resolveRepoContext(owner, repo);
      const octokit = getOctokit();
      const { data } = await octokit.pulls.list({
        owner: repoOwner,
        repo: repoName,
        state,
        per_page: perPage,
        sort,
        direction,
      });

      const pullRequests = data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login ?? "unknown",
        state: pr.state,
        draft: pr.draft,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        head: pr.head.ref,
        base: pr.base.ref,
      }));

      return {
        success: true,
        count: pullRequests.length,
        pullRequests,
        owner: repoOwner,
        repo: repoName,
        message: `Found ${pullRequests.length} pull request(s)`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: formatGitHubError(error, "List pull requests"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// 7. List Repositories
// ---------------------------------------------------------------------------

export const listRepositories = tool({
  description:
    "List user's repositories including owned and collaborated repos. Returns a list of repos with name, description, stars, and URL. " +
    "ALWAYS call this FIRST before any other GitHub operation when the user hasn't specified a repo. " +
    "Use type='all' to list ALL repos (both owned and collaborated). Use the most recently updated repo as the default context.",
  inputSchema: z.object({
    type: z
      .enum(["all", "owner", "public", "member"])
      .default("all")
      .describe("Type of repos to list: all (owned + collaborated), owner (only user's own repos), public, or member (collaborated/org repos only)"),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10)
      .describe("Number of results per page (max 100)"),
    sort: z
      .enum(["created", "updated", "pushed", "full_name"])
      .default("updated")
      .describe("Sort order"),
    direction: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("Sort direction"),
  }),
  execute: async ({ type, perPage, sort, direction }) => {
    try {
      const octokit = getOctokit();
      const { data } = await octokit.repos.listForAuthenticatedUser({
        type,
        per_page: perPage,
        sort,
        direction,
      });

      const repositories = data.map((repo) => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        defaultBranch: repo.default_branch,
        stars: repo.stargazers_count,
        language: repo.language,
        url: repo.html_url,
        updatedAt: repo.updated_at,
        private: repo.private,
      }));

      return {
        success: true,
        count: repositories.length,
        repositories,
        message: `Found ${repositories.length} repositor${repositories.length === 1 ? "y" : "ies"}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: formatGitHubError(error, "List repositories"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// 7b. List Collaborated Repositories
// ---------------------------------------------------------------------------

export const listCollaboratedRepositories = tool({
  description:
    "List repositories where the authenticated user is a collaborator but NOT the owner. " +
    "This includes organization repos and repos explicitly shared with the user. " +
    "Use this when the user asks to see repos they contribute to or collaborate on.",
  inputSchema: z.object({
    perPage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(30)
      .describe("Number of results per page (max 100)"),
    sort: z
      .enum(["created", "updated", "pushed", "full_name"])
      .default("updated")
      .describe("Sort order"),
    direction: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("Sort direction"),
  }),
  execute: async ({ perPage, sort, direction }) => {
    try {
      const octokit = getOctokit();

      // Get authenticated user login to filter out owned repos
      const { data: authUser } = await octokit.users.getAuthenticated();
      const authenticatedLogin = authUser.login;

      // type: "member" returns repos where user has push access but is not owner
      const { data } = await octokit.repos.listForAuthenticatedUser({
        type: "member",
        per_page: perPage,
        sort,
        direction,
      });

      const repositories = data
        .filter((repo) => repo.owner.login !== authenticatedLogin)
        .map((repo) => ({
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          defaultBranch: repo.default_branch,
          stars: repo.stargazers_count,
          language: repo.language,
          url: repo.html_url,
          updatedAt: repo.updated_at,
          private: repo.private,
          role: "collaborator",
        }));

      return {
        success: true,
        count: repositories.length,
        repositories,
        authenticatedAs: authenticatedLogin,
        message: `Found ${repositories.length} collaborated repositor${repositories.length === 1 ? "y" : "ies"}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: formatGitHubError(error, "List collaborated repositories"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// 8. Get Repository Details
// ---------------------------------------------------------------------------

export const getRepository = tool({
  description:
    "Get detailed information about a specific GitHub repository including default branch, open issues count, " +
    "and other metadata. Use this to validate repo context and get the default branch name.",
  inputSchema: z.object({
    ...ownerRepoSchema,
  }),
  execute: async ({ owner, repo }) => {
    try {
      const { owner: repoOwner, repo: repoName } = resolveRepoContext(owner, repo);
      const octokit = getOctokit();
      const { data } = await octokit.repos.get({
        owner: repoOwner,
        repo: repoName,
      });

      return {
        success: true,
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        defaultBranch: data.default_branch,
        language: data.language,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        url: data.html_url,
        private: data.private,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      return {
        success: false,
        error: formatGitHubError(error, "Get repository"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// 9. List Branches
// ---------------------------------------------------------------------------

export const listBranches = tool({
  description:
    "List all branches in a GitHub repository. CRITICAL: Always call this before creating a PR or merging " +
    "to validate that the branch names the user mentioned actually exist. If a user says 'worktree' but the " +
    "actual branch is 'work-tree' or 'feature/worktree', use the closest match. Return fuzzy match suggestions.",
  inputSchema: z.object({
    ...ownerRepoSchema,
    perPage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(100)
      .describe("Number of branches to fetch (max 100)"),
  }),
  execute: async ({ owner, repo, perPage }) => {
    try {
      const { owner: repoOwner, repo: repoName } = resolveRepoContext(owner, repo);
      const octokit = getOctokit();
      const { data } = await octokit.repos.listBranches({
        owner: repoOwner,
        repo: repoName,
        per_page: perPage,
      });

      const branches = data.map((branch) => ({
        name: branch.name,
        sha: branch.commit.sha.slice(0, 7),
        protected: branch.protected,
      }));

      return {
        success: true,
        count: branches.length,
        branches,
        owner: repoOwner,
        repo: repoName,
        message: `Found ${branches.length} branch${branches.length === 1 ? "" : "es"}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: formatGitHubError(error, "List branches"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// 10. Schedule Issue Creation (HITL - Human-in-the-Loop)
// ---------------------------------------------------------------------------

export const scheduleIssueCreation = tool({
  description:
    "Schedule an issue creation with human confirmation via Gen UI. " +
    "ALWAYS use this instead of createIssue directly. " +
    "Before calling this, you MUST have already called listRepositories to get repo context. " +
    "Pre-fill the owner/repo from the most recently used or updated repository. " +
    "The Gen UI allows the user to select a different repo from a dropdown.",
  inputSchema: z.object({
    owner: z
      .string()
      .describe("GitHub repository owner - MUST be pre-filled from listRepositories result"),
    repo: z
      .string()
      .describe("GitHub repository name - MUST be pre-filled from listRepositories result"),
    title: z.string().min(1).describe("Title of the issue (inferred from user request)"),
    body: z
      .string()
      .optional()
      .describe("Markdown body / description of the issue (generated if not provided)"),
    labels: z
      .array(z.string())
      .optional()
      .describe("Labels to apply, inferred from context (e.g. ['bug', 'enhancement'])"),
    assignees: z
      .array(z.string())
      .optional()
      .describe("GitHub usernames to assign (optional)"),
    reasoning: z
      .string()
      .describe("Explain what details were inferred and why, including which repo was selected and why"),
    availableRepos: z
      .array(z.object({
        owner: z.string(),
        name: z.string(),
        fullName: z.string(),
      }))
      .optional()
      .describe("List of available repositories for the user to select from in the Gen UI dropdown"),
  }),
  execute: async ({ owner, repo, title, body, labels, assignees, reasoning, availableRepos }) => {
    return {
      status: "pending_confirmation",
      issueDetails: {
        owner: owner || undefined,
        repo: repo || undefined,
        title,
        body: body || undefined,
        labels: labels || undefined,
        assignees: assignees || undefined,
      },
      reasoning,
      availableRepos: availableRepos || [],
    };
  },
});

// ---------------------------------------------------------------------------
// 11. Schedule PR Creation (HITL - Human-in-the-Loop)
// ---------------------------------------------------------------------------

export const schedulePRCreation = tool({
  description:
    "Schedule a pull request creation with human confirmation via Gen UI. " +
    "ALWAYS use this instead of createPullRequest directly. " +
    "Before calling this, you MUST have already called listRepositories AND listBranches. " +
    "Use the branch list to validate and correct the user's branch names. " +
    "If the user says 'worktree' but the branch is 'work-tree', use the correct name. " +
    "The Gen UI shows branch dropdowns populated with real branch names.",
  inputSchema: z.object({
    owner: z
      .string()
      .describe("GitHub repository owner - pre-filled from listRepositories"),
    repo: z
      .string()
      .describe("GitHub repository name - pre-filled from listRepositories"),
    title: z.string().min(1).describe("Title of the pull request (inferred from user request)"),
    head: z.string().min(1).describe("Branch containing the changes - MUST be validated against listBranches result"),
    base: z
      .string()
      .describe("Branch to merge into - MUST be validated against listBranches result (use repo defaultBranch)"),
    body: z
      .string()
      .optional()
      .describe("Markdown description of the pull request (generated if not provided)"),
    draft: z
      .boolean()
      .default(false)
      .describe("Whether to create the PR as a draft"),
    reasoning: z
      .string()
      .describe("Explain what details were inferred, any branch name corrections made, and why"),
    availableRepos: z
      .array(z.object({
        owner: z.string(),
        name: z.string(),
        fullName: z.string(),
      }))
      .optional()
      .describe("List of available repositories for dropdown"),
    availableBranches: z
      .array(z.string())
      .optional()
      .describe("List of actual branch names from the repo for the Gen UI dropdowns"),
  }),
  execute: async ({ owner, repo, title, head, base, body, draft, reasoning, availableRepos, availableBranches }) => {
    return {
      status: "pending_confirmation",
      prDetails: {
        owner: owner || undefined,
        repo: repo || undefined,
        title,
        head,
        base,
        body: body || undefined,
        draft,
      },
      reasoning,
      availableRepos: availableRepos || [],
      availableBranches: availableBranches || [],
    };
  },
});

// ---------------------------------------------------------------------------
// 12. Schedule Merge (HITL - Human-in-the-Loop)
// ---------------------------------------------------------------------------

export const scheduleMerge = tool({
  description:
    "Schedule a pull request merge with human confirmation via Gen UI. " +
    "ALWAYS use this instead of mergePullRequest directly. " +
    "Before calling this, you MUST have called listPullRequests to find the correct PR number. " +
    "If the user describes a PR by branch name or title, find the matching PR from the list. " +
    "Shows a confirmation UI with PR details and merge strategy options.",
  inputSchema: z.object({
    ...ownerRepoSchema,
    pullNumber: z.number().int().positive().describe("Pull request number (found via listPullRequests)"),
    title: z.string().describe("Title of the PR being merged"),
    head: z.string().describe("Source branch of the PR"),
    base: z.string().describe("Target branch of the PR"),
    mergeMethod: z
      .enum(["merge", "squash", "rebase"])
      .default("squash")
      .describe("Suggested merge strategy"),
    commitMessage: z
      .string()
      .optional()
      .describe("Custom commit message for the merge"),
    reasoning: z
      .string()
      .describe("Explain which PR was matched and why, any corrections made"),
    author: z.string().optional().describe("PR author username"),
    url: z.string().optional().describe("PR URL on GitHub"),
  }),
  execute: async ({ owner, repo, pullNumber, title, head, base, mergeMethod, commitMessage, reasoning, author, url }) => {
    const { owner: repoOwner, repo: repoName } = resolveRepoContext(owner, repo);
    return {
      status: "pending_confirmation",
      mergeDetails: {
        owner: repoOwner,
        repo: repoName,
        pullNumber,
        title,
        head,
        base,
        mergeMethod,
        commitMessage: commitMessage || undefined,
        author: author || undefined,
        url: url || undefined,
      },
      reasoning,
    };
  },
});

// ---------------------------------------------------------------------------
// Exported tool map (matches pattern used by weatherTools, calendarTools, etc.)
// ---------------------------------------------------------------------------

export const githubTools = {
  createIssue,
  createBranch,
  createPullRequest,
  mergePullRequest,
  commentOnPR,
  listPullRequests,
  listRepositories,
  listCollaboratedRepositories,
  getRepository,
  listBranches,
  scheduleIssueCreation,
  schedulePRCreation,
  scheduleMerge,
};
