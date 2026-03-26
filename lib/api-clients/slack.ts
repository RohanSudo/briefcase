const SLACK_BASE = "https://slack.com/api";

export interface SlackMessage {
  text: string;
  user: string;
  channel: string;
  timestamp: string;
}

export interface SlackChannel {
  id: string;
  name: string;
}

export async function listChannels(
  accessToken: string
): Promise<SlackChannel[]> {
  const res = await fetch(
    `${SLACK_BASE}/conversations.list?types=public_channel&limit=50`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack channels failed: ${data.error}`);
  return (data.channels || []).map(
    (c: { id: string; name: string }) => ({
      id: c.id,
      name: c.name,
    })
  );
}

export async function readMessages(
  accessToken: string,
  channelId: string,
  limit = 20
): Promise<SlackMessage[]> {
  const res = await fetch(
    `${SLACK_BASE}/conversations.history?channel=${channelId}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack history failed: ${data.error}`);
  return (data.messages || []).map(
    (m: { text: string; user: string; ts: string }) => ({
      text: m.text,
      user: m.user,
      channel: channelId,
      timestamp: m.ts,
    })
  );
}

export async function sendMessage(
  accessToken: string,
  channelId: string,
  text: string
): Promise<{ ok: boolean; ts: string }> {
  // Try to join the channel first
  try {
    const joinRes = await fetch(`${SLACK_BASE}/conversations.join`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: channelId }),
    });
    const joinData = await joinRes.json();
    console.log("Slack join result:", JSON.stringify(joinData));
  } catch (e) { console.log("Slack join error:", (e as Error).message); }

  const res = await fetch(`${SLACK_BASE}/chat.postMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: channelId, text }),
  });
  const data = await res.json();
  console.log("Slack postMessage result:", JSON.stringify(data));
  if (!data.ok) throw new Error(`Slack send failed: ${data.error}`);
  return { ok: true, ts: data.ts };
}
