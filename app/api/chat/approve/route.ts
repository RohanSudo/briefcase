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

        // Always try to find an existing thread to reply in
        let replyTo: { threadId: string; messageId: string } | undefined;
        try {
          // Strip "Re:" prefix if present for search
          const rawSubject = (details.subject as string || "").replace(/^Re:\s*/i, "").trim();
          if (rawSubject) {
            // Search Gmail for emails with this subject
            const searchParams = new URLSearchParams({
              q: `subject:"${rawSubject}"`,
              maxResults: "5",
            });
            const searchRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages?${searchParams}`,
              { headers: { Authorization: `Bearer ${tokenResult.data.accessToken}` } }
            );
            const searchData = await searchRes.json();
            if (searchData.messages && searchData.messages.length > 0) {
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
                // Ensure subject has Re: prefix for proper threading
                if (!(details.subject as string).toLowerCase().startsWith("re:")) {
                  details.subject = `Re: ${details.subject}`;
                }
                console.log("Found thread for reply:", replyTo);
              }
            }
          }
        } catch (e) {
          console.log("Thread lookup failed:", (e as Error).message);
        }

        // Log what we're about to send
        console.log("Sending email:", {
          to: details.to,
          subject: details.subject,
          hasReplyTo: !!replyTo,
          threadId: replyTo?.threadId,
          messageId: replyTo?.messageId?.substring(0, 30),
        });

        try {
          const result = await gmailClient.sendEmail(
            tokenResult.data.accessToken,
            details.to,
            details.subject,
            details.body,
            replyTo
          );
          console.log("Email sent as reply:", { resultThreadId: result.threadId });
          return Response.json({ success: true, result, isReply: !!replyTo });
        } catch (replyErr: unknown) {
          console.log("Reply send failed:", (replyErr as Error).message, "Retrying without threadId");
          // Retry without threadId but keep the headers
          const result = await gmailClient.sendEmail(
            tokenResult.data.accessToken,
            details.to,
            details.subject,
            details.body,
            replyTo ? { threadId: "", messageId: replyTo.messageId } : undefined
          );
          console.log("Email sent with headers only:", { resultThreadId: result.threadId });
          return Response.json({ success: true, result, isReply: false });
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
