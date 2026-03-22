// @ts-nocheck
import { tool } from "ai";
import { z } from "zod";
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
      parameters: z.object({
        maxResults: z.number().describe("Number of emails to fetch, between 1 and 20"),
      }),
      execute: async ({ maxResults }) => {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        const emails = await gmailClient.readEmails(
          tokenResult.data.accessToken,
          maxResults || 5
        );

        return {
          emails: emails.map((e) => ({
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
      parameters: z.object({
        to: z.string().describe("Recipient email address"),
        subject: z.string().describe("Email subject line"),
        body: z.string().describe("Email body text"),
      }),
      execute: async ({ to, subject, body }) => {
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
