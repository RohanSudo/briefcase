import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    // Try to get a token for the My Account API
    try {
      const token = await auth0.getAccessToken();
      return NextResponse.json({
        success: true,
        hasToken: !!token,
        tokenPreview: token?.token?.substring(0, 20) + "...",
        sessionUser: session.user?.email,
        sessionSub: session.user?.sub,
      });
    } catch (tokenError: any) {
      return NextResponse.json({
        error: "Token exchange failed",
        message: tokenError.message,
        code: tokenError.code,
        cause: tokenError.cause?.message,
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({
      error: "Session error",
      message: err.message,
    }, { status: 500 });
  }
}
