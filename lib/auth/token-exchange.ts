import { auth0 } from "@/lib/auth0";

export interface TokenExchangeResult {
  accessToken: string;
  expiresAt: number;
}

export interface TokenExchangeError {
  type: "expired" | "revoked" | "not_connected" | "unknown";
  message: string;
}

/**
 * Exchange the user's Auth0 session token for a third-party provider access token
 * using Auth0 Token Vault (getAccessTokenForConnection).
 *
 * This uses the built-in Auth0 v4 SDK method which handles the RFC 8693 token
 * exchange under the hood, including automatic refresh.
 */
export async function exchangeToken(
  provider: "google"
): Promise<
  | { ok: true; data: TokenExchangeResult }
  | { ok: false; error: TokenExchangeError }
> {
  const connectionName = "google-oauth2";

  try {
    const result = await auth0.getAccessTokenForConnection({
      connection: connectionName,
    });

    return {
      ok: true,
      data: {
        accessToken: result.token,
        expiresAt: result.expiresAt,
      },
    };
  } catch (err: unknown) {
    const error = err as Error & { code?: string; status?: number };

    // Handle specific Auth0 error cases
    if (
      error.message?.includes("invalid_grant") ||
      error.message?.includes("expired")
    ) {
      return {
        ok: false,
        error: {
          type: "expired",
          message: `${provider} connection has expired. Please reconnect.`,
        },
      };
    }
    if (
      error.message?.includes("access_denied") ||
      error.message?.includes("not connected")
    ) {
      return {
        ok: false,
        error: {
          type: "not_connected",
          message: `${provider} is not connected. Please connect it first.`,
        },
      };
    }

    return {
      ok: false,
      error: {
        type: "unknown",
        message: `Token exchange failed for ${provider}: ${error.message || "unknown error"}`,
      },
    };
  }
}
