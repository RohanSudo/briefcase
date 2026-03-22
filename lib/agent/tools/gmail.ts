// @ts-nocheck
import { tool, jsonSchema } from "ai";
import { exchangeToken } from "@/lib/auth/token-exchange";
import * as gmailClient from "@/lib/api-clients/gmail";

export function createGmailTools(
  userId: string,
  conversationId: string,
  hitlEnabled: boolean
) {
  return {
    checkEmail: tool({
      description:
        "Read recent emails from the user's Gmail inbox. Returns subject, sender, snippet, and date.",
      parameters: jsonSchema({
        type: "object" as const,
        properties: {
          maxResults: { type: "number", description: "Number of emails to fetch, between 1 and 20" },
        },
        required: ["maxResults"],
      }),
      execute: async ({ maxResults }: { maxResults: number }) => {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        const emails = await gmailClient.readEmails(
          tokenResult.data.accessToken,
          maxResults || 5
        );

        return {
          emails: emails.map((e: any) => ({
            from: e.from,
            subject: e.subject,
            snippet: e.snippet,
            date: e.date,
            isUnread: e.isUnread,
          })),
        };
      },
    }),

    sendEmail: tool({
      description:
        "Send an email on behalf of the user. If HITL is enabled, this will return a pending approval instead of sending immediately.",
      parameters: jsonSchema({
        type: "object" as const,
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body text" },
        },
        required: ["to", "subject", "body"],
      }),
      execute: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
        if (hitlEnabled) {
          return {
            requiresApproval: true,
            action: "sendEmail",
            details: { to, subject, body },
            message: `I'd like to send this email:\n\nTo: ${to}\nSubject: ${subject}\n\n${body}`,
          };
        }

        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        const result = await gmailClient.sendEmail(
          tokenResult.data.accessToken,
          to,
          subject,
          body
        );

        return { sent: true, messageId: result.id };
      },
    }),
  };
}
