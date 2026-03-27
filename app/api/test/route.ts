import { auth0 } from "@/lib/auth0";
import { exchangeToken } from "@/lib/auth/token-exchange";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return Response.json({ error: "not logged in" });

    const tokenResult = await exchangeToken("slack");
    if (!tokenResult.ok) return Response.json({ error: "no slack token", detail: tokenResult.error.message });

    const token = tokenResult.data.accessToken;

    // Test auth
    const authRes = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const authData = await authRes.json();

    // List channels
    const chRes = await fetch("https://slack.com/api/conversations.list?types=public_channel&limit=5", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const chData = await chRes.json();
    const channels = chData.channels?.map((c: { id: string; name: string; is_member: boolean }) => ({
      id: c.id, name: c.name, is_member: c.is_member
    })) || [];

    // Try join + post to first channel
    const testChannel = channels[0];
    let joinResult = null;
    let postResult = null;
    if (testChannel) {
      const joinRes = await fetch("https://slack.com/api/conversations.join", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ channel: testChannel.id }),
      });
      joinResult = await joinRes.json();

      // Don't actually post, just return the join result
    }

    return Response.json({
      auth: authData,
      channels,
      joinResult,
      tokenPreview: token.substring(0, 20) + "...",
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message });
  }
}
