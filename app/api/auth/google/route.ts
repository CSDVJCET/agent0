import { NextResponse } from "next/server";
import { getAuthorizationUrl, getTokens } from "@/lib/google-calendar";

// Default user ID for development (in production, get from auth session)
const DEFAULT_USER_ID = "default-user";

/**
 * GET /api/auth/google - Initiate Google OAuth flow or check status
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Check connection status
  if (action === "status") {
    const tokens = getTokens(DEFAULT_USER_ID);
    return Response.json({
      connected: !!tokens,
      hasRefreshToken: !!tokens?.refresh_token,
    });
  }

  // Redirect to Google OAuth
  const state = DEFAULT_USER_ID; // In production, use a secure state token
  const authUrl = getAuthorizationUrl(state);

  return NextResponse.redirect(authUrl);
}

/**
 * DELETE /api/auth/google - Disconnect Google account
 */
export async function DELETE() {
  const { removeTokens } = await import("@/lib/google-calendar");
  
  removeTokens(DEFAULT_USER_ID);
  
  return Response.json({ disconnected: true });
}
