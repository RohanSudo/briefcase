import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    // Try to get a token for the My Account API (what handleConnectAccount does internally)
    try {
      const tokenResult = await auth0.getAccessToken({
        audience: `https://${process.env.AUTH0_DOMAIN}/me/`,
        scope: "create:me:connected_accounts",
      });

      // Now simulate what handleConnectAccount does: call the /me/connected-accounts endpoint
      const issuer = `https://${process.env.AUTH0_DOMAIN}`;
      const connectResponse = await fetch(`${issuer}/me/v1/connected-accounts/connect`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenResult.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connection: "google-oauth2",
          redirect_uri: `https://briefcase-rohan.vercel.app/auth/callback`,
          state: "test-state-123",
          code_challenge: "test-challenge",
          code_challenge_method: "S256",
        }),
      });

      const connectBody = await connectResponse.text();
      return NextResponse.json({
        success: connectResponse.ok,
        status: connectResponse.status,
        body: connectBody,
      });
    } catch (tokenError: any) {
      return NextResponse.json({
        error: "My Account API token failed",
        message: tokenError.message,
        code: tokenError.code,
        cause: tokenError.cause?.message,
        stack: tokenError.stack?.split("\n").slice(0, 5),
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({
      error: "Session error",
      message: err.message,
    }, { status: 500 });
  }
}
