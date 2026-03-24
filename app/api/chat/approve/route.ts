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
        try {
          // Search for the original email by subject to get correct threadId
          const subject = (details.subject as string || "").replace(/^Re:\s*/i, "");
          const emails = await gmailClient.readEmails(tokenResult.data.accessToken, 5);
          const match = emails.find(e =>
            e.subject.toLowerCase().includes(subject.toLowerCase()) ||
            subject.toLowerCase().includes(e.subject.toLowerCase())
          );
          if (match && match.threadId && match.messageId) {
            replyTo = { threadId: match.threadId, messageId: match.messageId };
            console.log("Found thread for reply:", replyTo);
          }
        } catch {
          console.log("Thread lookup failed, sending as new email");
        }

        try {
          const result = await gmailClient.sendEmail(
            tokenResult.data.accessToken,
            details.to,
            details.subject,
            details.body,
            replyTo
          );
          return Response.json({ success: true, result });
        } catch (e: unknown) {
          console.log("Reply failed, retrying as new email:", (e as Error).message);
          const result = await gmailClient.sendEmail(
            tokenResult.data.accessToken,
            details.to,
            details.subject,
            details.body
          );
          return Response.json({ success: true, result });
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
