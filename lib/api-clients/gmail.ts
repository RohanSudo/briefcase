const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface Email {
  id: string;
  threadId: string;
  messageId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  isUnread: boolean;
}

export async function readEmails(
  accessToken: string,
  maxResults = 10,
  unreadOnly = false
): Promise<Email[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    labelIds: "INBOX",
  });
  if (unreadOnly) {
    params.append("q", "is:unread");
  }
  const listRes = await fetch(
    `${GMAIL_BASE}/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);
  const listData = await listRes.json();
  if (!listData.messages) return [];

  const emails = await Promise.all(
    listData.messages.slice(0, maxResults).map(async (msg: { id: string }) => {
      const msgRes = await fetch(
        `${GMAIL_BASE}/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgData = await msgRes.json();
      const headers = msgData.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find(
          (h: { name: string; value: string }) =>
            h.name.toLowerCase() === name.toLowerCase()
        )?.value || "";

      return {
        id: msgData.id,
        threadId: msgData.threadId || "",
        messageId: getHeader("Message-ID") || getHeader("Message-Id") || "",
        from: getHeader("From"),
        to: getHeader("To"),
        subject: getHeader("Subject"),
        snippet: msgData.snippet || "",
        body: extractBody(msgData.payload),
        date: getHeader("Date"),
        isUnread: msgData.labelIds?.includes("UNREAD") || false,
      };
    })
  );
  return emails;
}

function extractBody(payload: {
  body?: { data?: string };
  parts?: Array<{ mimeType: string; body?: { data?: string } }>;
}): string {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  if (payload.parts) {
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }
  }
  return "";
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  replyTo?: { threadId: string; messageId: string }
): Promise<{ id: string; threadId: string }> {
  // For replies, ensure subject starts with "Re:"
  let finalSubject = subject;
  if (replyTo && !subject.toLowerCase().startsWith("re:")) {
    finalSubject = `Re: ${subject}`;
  }

  const headerLines = [
    `To: ${to}`,
    `Subject: ${finalSubject}`,
    `Content-Type: text/plain; charset=utf-8`,
  ];

  // Add reply headers for threading
  if (replyTo?.messageId) {
    headerLines.push(`In-Reply-To: ${replyTo.messageId}`);
    headerLines.push(`References: ${replyTo.messageId}`);
  }

  const raw = Buffer.from(
    `${headerLines.join("\r\n")}\r\n\r\n${body}`
  ).toString("base64url");

  const payload: { raw: string; threadId?: string } = { raw };
  if (replyTo?.threadId && replyTo.threadId.length > 0) {
    payload.threadId = replyTo.threadId;
  }

  const res = await fetch(`${GMAIL_BASE}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gmail send failed: ${res.status} - ${errBody}`);
  }
  return res.json();
}
