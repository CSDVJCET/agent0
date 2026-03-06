import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

const DEFAULT_USER_ID = "default-user";
const GMAIL_API_BASE = "https://www.googleapis.com/gmail/v1";

const markReadSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
});

/**
 * POST /api/gmail/mark-read — Remove UNREAD label from a message
 * Body: { messageId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId } = markReadSchema.parse(body);

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    if (!accessToken) {
      return NextResponse.json(
        { error: true, message: "Gmail is not connected. Please authenticate first." },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${GMAIL_API_BASE}/users/me/messages/${messageId}/modify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          removeLabelIds: ["UNREAD"],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: true,
          message: errorData.error?.message || `Failed to mark message as read: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      error: false,
      messageId,
      message: "Message marked as read",
    });
  } catch (error) {
    console.error("Error marking message as read:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : "Failed to mark message as read",
      },
      { status: 500 }
    );
  }
}
