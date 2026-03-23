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
      const token = await auth0.getAccessToken({
        audience: `https://${process.env.AUTH0_DOMAIN}/me/`,
        scope: "create:me:connected_accounts",
      });
      return NextResponse.json({
        success: true,
        hasToken: !!token,
        tokenPreview: token?.token?.substring(0, 20) + "...",
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
