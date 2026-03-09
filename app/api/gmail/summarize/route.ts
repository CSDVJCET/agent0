import { NextRequest, NextResponse } from "next/server";
import { createEmailSummaryAgent } from "@/ai/email-summary-agent";

type EmailInput = {
  subject: string;
  snippet: string;
  from: string;
  to?: string;
};

function buildFallbackSummary(message: EmailInput, index: number) {
  return {
    index,
    importance: "medium" as const,
    shortTitle: (message.subject || "Untitled email").slice(0, 45),
    summary: message.snippet || "No preview available.",
    suggestedReply: "No reply needed.",
    actionItems: [],
    todoItems: [],
    calendarEvent: null,
  };
}

/**
 * POST /api/gmail/summarize
 * Body: { messages: Array<{ subject, snippet, from, to }>, model?: string }
 * Returns: { emails: Array<{ index, importance, shortTitle, summary, suggestedReply, actionItems, todoItems, calendarEvent }> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: EmailInput[] = body.messages;
    // Use the model the user has selected, fall back to Kimi K2
    const modelId: string = body.model || "groq:moonshotai/kimi-k2-instruct-0905";

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

    const agent = createEmailSummaryAgent(modelId);
    const result = await agent.generate({
      prompt: `Today's date is March 8, 2026.

Analyze the following inbox emails and return structured output for every item.

Emails:
${emailSummaries}

Return results for ALL ${messages.length} emails using the provided schema.`,
    });

    const normalizedEmails = messages.map((message, index) => {
      const email = result.output.emails.find((item: (typeof result.output.emails)[number]) => item.index === index);
      return email ?? buildFallbackSummary(message, index);
    });

    return NextResponse.json({
      error: false,
      emails: normalizedEmails,
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
