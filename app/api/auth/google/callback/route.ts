import { NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  storeTokens,
} from "@/lib/google-calendar";

// Default user ID for development (in production, get from auth session)
const DEFAULT_USER_ID = "default-user";

function getHtmlResponse(title: string, message: string, success: boolean, userId?: string) {
  const color = success ? "#16a34a" : "#dc2626";
  const script = success 
    ? `
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', userId: '${userId}' }, '*');
      }
      setTimeout(() => window.close(), 1500);
    `
    : '';

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; color: #333; }
          .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
          h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: ${color}; }
          p { color: #666; margin-bottom: 1.5rem; line-height: 1.5; }
          button { background: #333; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
          button:hover { background: #000; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${title}</h1>
          <p>${message}</p>
          ${!success ? '<button onclick="window.close()">Close Window</button>' : '<p style="font-size: 0.8rem; color: #999">Closing automatically...</p>'}
        </div>
        <script>
          ${script}
        </script>
      </body>
    </html>`,
    {
      headers: { "Content-Type": "text/html" },
    }
  );
}

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
      return getHtmlResponse("Authentication Failed", `Google returned an error: ${error}`, false);
    }

    // Verify code exists
    if (!code) {
      return getHtmlResponse("Authentication Failed", "No authorization code received from Google.", false);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens) {
      return getHtmlResponse("Authentication Failed", "Failed to exchange authorization code for tokens.", false);
    }

    // Store tokens for the user
    // In production, get the actual user ID from session/state
    const userId = state || DEFAULT_USER_ID;
    storeTokens(userId, tokens);

    console.log("Google Calendar connected successfully for user:", userId);

    return getHtmlResponse("Connected!", "You have successfully logged in with Google.", true, userId);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return getHtmlResponse("System Error", "An unexpected error occurred during authentication.", false);
  }
}
