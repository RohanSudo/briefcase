import { auth0 } from "@/lib/auth0";
import { exchangeToken } from "@/lib/auth/token-exchange";
import * as gmailClient from "@/lib/api-clients/gmail";
import * as calendarClient from "@/lib/api-clients/calendar";
import * as slackClient from "@/lib/api-clients/slack";

export async function POST(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const { action, details } = await req.json();

    switch (action) {
      case "sendEmail": {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok)
          return Response.json({ error: tokenResult.error.message }, { status: 400 });

        // Try to find the original email thread to reply in-thread
        let replyTo: { threadId: string; messageId: string } | undefined;
        const isReply = (details.subject as string || "").toLowerCase().startsWith("re:");
        if (isReply) {
          try {
            const subject = (details.subject as string || "").replace(/^Re:\s*/i, "").trim();
            // Search Gmail directly for the subject to find the thread
            const searchParams = new URLSearchParams({
              q: `subject:${subject}`,
              maxResults: "5",
            });
            const searchRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages?${searchParams}`,
              { headers: { Authorization: `Bearer ${tokenResult.data.accessToken}` } }
            );
            const searchData = await searchRes.json();
            if (searchData.messages && searchData.messages.length > 0) {
              // Get the first matching message's full details
              const msgRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${searchData.messages[0].id}?format=metadata&metadataHeaders=Message-ID`,
                { headers: { Authorization: `Bearer ${tokenResult.data.accessToken}` } }
              );
              const msgData = await msgRes.json();
              const messageIdHeader = msgData.payload?.headers?.find(
                (h: { name: string }) => h.name.toLowerCase() === "message-id"
              )?.value;
              if (msgData.threadId && messageIdHeader) {
                replyTo = { threadId: msgData.threadId, messageId: messageIdHeader };
                console.log("Found thread for reply:", replyTo);
              }
            }
          } catch (e) {
            console.log("Thread lookup failed:", (e as Error).message);
          }
        }

        try {
          const result = await gmailClient.sendEmail(
            tokenResult.data.accessToken,
            details.to,
            details.subject,
            details.body,
            replyTo
          );
          return Response.json({ success: true, result, isReply: !!replyTo });
        } catch (e: unknown) {
          console.log("Reply failed, retrying as new email:", (e as Error).message);
          // Fallback: send as new email but log it
          try {
            const result = await gmailClient.sendEmail(
              tokenResult.data.accessToken,
              details.to,
              details.subject,
              details.body
            );
            return Response.json({ success: true, result, isReply: false, note: "Sent as new email (thread reply failed)" });
          } catch (e2: unknown) {
            return Response.json({ error: (e2 as Error).message }, { status: 500 });
          }
        }
      }

      case "createCalendarEvent": {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok)
          return Response.json({ error: tokenResult.error.message }, { status: 400 });
        const event = await calendarClient.createEvent(
          tokenResult.data.accessToken,
          details.summary,
          details.start,
          details.end,
          details.description,
          details.attendees
        );
        return Response.json({ success: true, event });
      }

      case "sendSlackMessage": {
        const tokenResult = await exchangeToken("slack");
        if (!tokenResult.ok)
          return Response.json({ error: tokenResult.error.message }, { status: 400 });
        const result = await slackClient.sendMessage(
          tokenResult.data.accessToken,
          details.channelId,
          details.text
        );
        return Response.json({ success: true, result });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const err = error as Error;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
