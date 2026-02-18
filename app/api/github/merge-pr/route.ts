import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }
  return new Octokit({ auth: token });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, pullNumber, mergeMethod, commitMessage } = body;

    if (!owner || !repo || !pullNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: owner, repo, and pullNumber are required",
        },
        { status: 400 }
      );
    }

    const octokit = getOctokit();

    // Verify PR is open first
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    if (pr.state !== "open") {
      return NextResponse.json(
        {
          success: false,
          error: `PR #${pullNumber} is already ${pr.state}`,
        },
        { status: 400 }
      );
    }

    const { data: mergeResult } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      merge_method: mergeMethod || "squash",
      commit_message: commitMessage ?? undefined,
    });

    return NextResponse.json({
      success: true,
      merged: mergeResult.merged,
      sha: mergeResult.sha,
      owner,
      repo,
      message: mergeResult.message ?? `PR #${pullNumber} merged successfully`,
    });
  } catch (error: any) {
    console.error("Failed to merge GitHub PR:", error);

    const status = error?.status;
    let errorMessage = error?.message || "Unknown GitHub API error";

    if (status === 401) {
      errorMessage = "Invalid or expired GitHub token";
    } else if (status === 403) {
      errorMessage = "Token does not have sufficient permissions";
    } else if (status === 404) {
      errorMessage = "PR not found or token lacks access";
    } else if (status === 405) {
      errorMessage = "PR is not mergeable. Check for merge conflicts or required status checks.";
    } else if (status === 409) {
      errorMessage = "Merge conflict. The PR has conflicts that need to be resolved first.";
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: status || 500 }
    );
  }
}
