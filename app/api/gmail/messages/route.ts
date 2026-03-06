import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/google-calendar";

const DEFAULT_USER_ID = "default-user";
const GMAIL_API_BASE = "https://www.googleapis.com/gmail/v1";

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  labelIds: string[];
  hasAttachments: boolean;
  attachmentCount: number;
  isUnread: boolean;
}

/**
 * Parse email address string into name and email parts
 * e.g. "John Doe <john@example.com>" → { name: "John Doe", email: "john@example.com" }
 */
function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/^["']|["']$/g, "").trim(), email: match[2] };
  }
  return { name: raw.split("@")[0], email: raw };
}

/**
 * GET /api/gmail/messages - Fetch inbox messages with metadata
 * Query params:
 *   - maxResults: Maximum number of messages to return (default: 10, max: 20)
 *   - q: Gmail search query (default: "is:inbox")
 */
export async function GET(req: NextRequest) {
  try {
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    if (!accessToken) {
      return NextResponse.json(
        { error: true, message: "Gmail is not connected. Please authenticate first." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const maxResults = Math.min(Number(searchParams.get("maxResults")) || 10, 20);
    const query = searchParams.get("q") || "is:inbox";

    // Step 1: Get message IDs
    const listResponse = await fetch(
      `${GMAIL_API_BASE}/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listResponse.ok) {
      const errorData = await listResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: true, message: errorData.error?.message || `Failed to fetch messages: ${listResponse.statusText}` },
        { status: listResponse.status }
      );
    }

    const listData = await listResponse.json();
    const messageIds: { id: string; threadId: string }[] = listData.messages || [];

    if (messageIds.length === 0) {
      return NextResponse.json({ error: false, messages: [], totalCount: 0 });
    }

    // Step 2: Batch-fetch metadata for each message
    const messagesRaw = await Promise.all(
      messageIds.map(async ({ id }) => {
        const msgResponse = await fetch(
          `${GMAIL_API_BASE}/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!msgResponse.ok) {
          return null;
        }

        const msgData = await msgResponse.json();
        const headers: { name: string; value: string }[] = msgData.payload?.headers || [];

        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        const fromRaw = getHeader("From");
        const { name: fromName, email: fromEmail } = parseEmailAddress(fromRaw);

        // Count attachments from payload parts
        const parts = msgData.payload?.parts || [];
        const attachmentParts = parts.filter(
          (p: { filename?: string }) => p.filename && p.filename.length > 0
        );

        return {
          id: msgData.id,
          threadId: msgData.threadId,
          from: fromRaw,
          fromName,
          fromEmail,
          to: getHeader("To"),
          subject: getHeader("Subject") || "(no subject)",
          snippet: msgData.snippet || "",
          date: getHeader("Date"),
          labelIds: msgData.labelIds || [],
          hasAttachments: attachmentParts.length > 0,
          attachmentCount: attachmentParts.length,
          isUnread: (msgData.labelIds || []).includes("UNREAD"),
        } satisfies GmailMessage;
      })
    );

    const validMessages = messagesRaw.filter((m): m is GmailMessage => m !== null);

    return NextResponse.json({
      error: false,
      messages: validMessages,
      totalCount: listData.resultSizeEstimate || validMessages.length,
    });
  } catch (error) {
    console.error("Error fetching Gmail messages:", error);
    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : "Failed to fetch messages",
      },
      { status: 500 }
    );
  }
}
