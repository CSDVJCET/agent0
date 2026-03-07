import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { cohere } from "@ai-sdk/cohere";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

// Multi-provider model resolution (mirrors chat route)
const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

function resolveModel(modelId: string) {
  if (modelId.startsWith("groq:")) return groq(modelId.replace("groq:", ""));
  if (modelId.startsWith("cohere:")) return cohere(modelId.replace("cohere:", ""));
  // Default: Google Gemini
  return google(modelId);
}

const summarizeSchema = z.object({
  emails: z.array(
    z.object({
      index: z.number().describe("Index of the email in the input array"),
      importance: z
        .enum(["high", "medium", "low"])
        .describe("Importance: high=urgent/action-required, medium=relevant, low=newsletters/automated"),
      shortTitle: z
        .string()
        .describe("AI-generated concise title, max 45 chars, better than the raw subject"),
      summary: z
        .string()
        .describe(
          "Markdown-formatted summary. Use **bold** for key names/dates/amounts. Add a '## Action Items' section with '- [ ] action' bullets ONLY if the email requires concrete tasks from the recipient. Include deadlines in bold like '- [ ] Reply by **Friday, March 13**'. Keep total under 250 words."
        ),
      suggestedReply: z
        .string()
        .describe("Professional 2-4 sentence reply draft. Write 'No reply needed.' for newsletters/automated emails."),
    })
  ),
});

/**
 * POST /api/gmail/summarize
 * Body: { messages: Array<{ subject, snippet, from, to }>, model?: string }
 * Returns: { emails: Array<{ index, importance, shortTitle, summary, suggestedReply }> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: { subject: string; snippet: string; from: string; to?: string }[] =
      body.messages;
    // Use the model the user has selected, fall back to Gemini 2.0 Flash
    const modelId: string = body.model || "gemini-2.0-flash";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: true, message: "No messages provided for summarization" },
        { status: 400 }
      );
    }

    const emailSummaries = messages
      .map(
        (msg, i) =>
          `[${i}] From: ${msg.from} | To: ${msg.to || "me"} | Subject: ${msg.subject} | Preview: ${msg.snippet.slice(0, 300)}`
      )
      .join("\n\n");

    const model = resolveModel(modelId);

    const result = await generateObject({
      model,
      schema: summarizeSchema,
      prompt: `You are an intelligent email assistant. Analyze each email and provide structured summaries.

For each email provide:

1. **importance**: 
   - "high": direct human messages, urgent requests, meeting invites, action required, financial/legal notices, time-sensitive
   - "medium": relevant updates, non-urgent work/personal messages, informational content worth reading
   - "low": newsletters, marketing, automated system alerts, social notifications, promotional

2. **shortTitle**: A concise title under 45 chars that captures the email's essence better than its raw subject

3. **summary**: Write a clear Markdown-formatted summary:
   - Open with 1-2 sentences giving the key context (who sent it, what it's about, why it matters)
   - Use **bold** to highlight: sender names, key dates, amounts, project names, deadlines
   - ONLY add "## Action Items" section when the email explicitly requires actions from the recipient:
     \`\`\`
     ## Action Items
     - [ ] Reply with confirmation by **Friday, March 13**
     - [ ] Review attached contract before **EOD Monday**
     \`\`\`
   - Do NOT add Action Items for newsletters, FYI emails, or automated notifications
   - Keep it focused — no filler phrases, no generic summaries

4. **suggestedReply**: A professional, friendly 2-4 sentence reply draft. Write "No reply needed." for newsletters or automated emails.

Emails:
${emailSummaries}

Return results for ALL ${messages.length} emails.`,
    });

    return NextResponse.json({
      error: false,
      emails: result.object.emails,
    });
  } catch (error) {
    console.error("Error summarizing emails:", error);
    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : "Failed to summarize emails",
      },
      { status: 500 }
    );
  }
}
