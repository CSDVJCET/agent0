import { tool } from "ai";
import { z } from "zod";
import { Octokit } from "@octokit/rest";

/**
 * GitHub Tools for Agent0
 *
 * These tools allow the AI agent to interact with GitHub via the REST API.
 * Users invoke these tools using @github mentions in their prompts.
 *
 * Available operations:
 * - createIssue: Create a new issue in a repository
 * - createBranch: Create a new branch from a base ref
 * - createPullRequest: Open a pull request
 * - mergePullRequest: Merge a pull request (merge / squash / rebase)
 * - commentOnPR: Add a comment to a pull request
 * - listPullRequests: List pull requests with filtering
 */

// ---------------------------------------------------------------------------
// Octokit singleton (lazy, auth'd from env)
// ---------------------------------------------------------------------------

let _octokit: Octokit | null = null;

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
    .min(1)
    .describe("GitHub repository owner (user or organisation)"),
  repo: z
    .string()
    .min(1)
    .describe("GitHub repository name (without the owner prefix)"),
};

/** Protected branch names that require explicit confirmation before merge */
const PROTECTED_BRANCHES = ["main", "master", "production", "release"];

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
      const octokit = getOctokit();
      const { data } = await octokit.issues.create({
        owner,
        repo,
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
        message: `Issue #${data.number} created successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? "Failed to create issue",
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
      const octokit = getOctokit();

      // Get the SHA of the base branch
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`,
      });

      const sha = refData.object.sha;

      // Create the new branch ref
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranch}`,
        sha,
      });

      return {
        success: true,
        branch: newBranch,
        baseBranch,
        sha,
        message: `Branch '${newBranch}' created from '${baseBranch}' at ${sha.slice(0, 7)}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? "Failed to create branch",
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
      const octokit = getOctokit();
      const { data } = await octokit.pulls.create({
        owner,
        repo,
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
        message: `Pull request #${data.number} created successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? "Failed to create pull request",
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
      const octokit = getOctokit();

      // Fetch the PR first to validate it exists and check its target branch
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
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
        owner,
        repo,
        pull_number: pullNumber,
        merge_method: mergeMethod,
        commit_message: commitMessage ?? undefined,
      });

      return {
        success: true,
        merged: mergeResult.merged,
        sha: mergeResult.sha,
        message: mergeResult.message ?? `PR #${pullNumber} merged successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? "Failed to merge pull request",
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
      const octokit = getOctokit();
      const { data } = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });

      return {
        success: true,
        url: data.html_url,
        commentId: data.id,
        message: `Comment added to #${issueNumber}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? "Failed to add comment",
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
      const octokit = getOctokit();
      const { data } = await octokit.pulls.list({
        owner,
        repo,
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
        message: `Found ${pullRequests.length} pull request(s)`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? "Failed to list pull requests",
      };
    }
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
};
