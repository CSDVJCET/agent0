import { NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  storeTokens,
} from "@/lib/google-calendar";

// Default user ID for development (in production, get from auth session)
const DEFAULT_USER_ID = "default-user";

/**
 * GET /api/auth/google/callback - Handle OAuth2 callback from Google
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    // Handle error from Google
    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Verify code exists
    if (!code) {
      return NextResponse.redirect(
        new URL("/?error=missing_code", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens) {
      return NextResponse.redirect(
        new URL("/?error=token_exchange_failed", request.url)
      );
    }

    // Store tokens for the user
    // In production, get the actual user ID from session/state
    const userId = state || DEFAULT_USER_ID;
    storeTokens(userId, tokens);

    console.log("Google Calendar connected successfully for user:", userId);

    // Redirect to home page with success message
    return NextResponse.redirect(
      new URL("/?google_calendar=connected", request.url)
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=callback_failed", request.url)
    );
  }
}
