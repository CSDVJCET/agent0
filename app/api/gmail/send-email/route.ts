import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

const DEFAULT_USER_ID = "default-user";
const GMAIL_API_BASE = "https://www.googleapis.com/gmail/v1";

const sendEmailSchema = z.object({
  to: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  thread_id: z.string().optional(),
});

/**
 * Encode string to base64url
 */
function encodeBase64Url(str: string): string {
  const base64 = Buffer.from(str, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = sendEmailSchema.parse(body);

    // Get access token
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    if (!accessToken) {
      return NextResponse.json(
        { error: true, message: "Gmail is not connected. Please authenticate first." },
        { status: 401 }
      );
    }

    // Build the raw email message in RFC 2822 format
    const emailLines = [
      `To: ${validated.to}`,
      ...(validated.cc ? [`Cc: ${validated.cc}`] : []),
      ...(validated.bcc ? [`Bcc: ${validated.bcc}`] : []),
      `Subject: ${validated.subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      validated.body,
    ];
    
    const rawMessage = encodeBase64Url(emailLines.join("\r\n"));

    const sendBody: Record<string, unknown> = {
      raw: rawMessage,
      ...(validated.thread_id && { threadId: validated.thread_id }),
    };

    // Send the email
    const response = await fetch(`${GMAIL_API_BASE}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: true,
          message: errorData.error?.message || `Failed to send email: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      error: false,
      messageId: result.id,
      threadId: result.threadId,
      to: validated.to,
      subject: validated.subject,
      message: `Email sent successfully to ${validated.to}`,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : "Failed to send email",
      },
      { status: 500 }
    );
  }
}
