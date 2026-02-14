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
    const { owner, repo, title, head, base, body: prBody, draft } = body;

    if (!owner || !repo || !title || !head || !base) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: owner, repo, title, head, and base are required",
        },
        { status: 400 }
      );
    }

    const octokit = getOctokit();
    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body: prBody ?? undefined,
      draft: draft ?? false,
    });

    return NextResponse.json({
      success: true,
      url: data.html_url,
      number: data.number,
      title: data.title,
      state: data.state,
      draft: data.draft,
      owner,
      repo,
      message: `Pull request #${data.number} created successfully`,
    });
  } catch (error: any) {
    console.error("Failed to create GitHub PR:", error);

    const status = error?.status;
    let errorMessage = error?.message || "Unknown GitHub API error";

    if (status === 401) {
      errorMessage = "Invalid or expired GitHub token";
    } else if (status === 403) {
      errorMessage = "Token does not have sufficient permissions";
    } else if (status === 404) {
      errorMessage =
        "Repository not found or token lacks access. Verify owner/repo and token scopes.";
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
