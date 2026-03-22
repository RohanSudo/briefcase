import { tool } from "ai";
import { z } from "zod";
import { exchangeToken } from "@/lib/auth/token-exchange";
import * as slackClient from "@/lib/api-clients/slack";

export function createSlackTools(
  userId: string,
  conversationId: string,
  hitlEnabled: boolean
) {
  return {
    readSlackMessages: tool({
      description:
        "Read recent messages from a Slack channel. Can also list available channels.",
      parameters: z.object({
        channelName: z
          .string()
          .optional()
          .describe(
            "Channel name to read (without #). If not provided, lists available channels."
          ),
        limit: z
          .number()
          .optional()
          .describe("Number of messages to fetch (default 20)"),
      }),
      // @ts-expect-error - AI SDK tool type inference
      execute: async ({ channelName, limit = 20 }: { channelName?: string; limit?: number }) => {
        const tokenResult = await exchangeToken("slack");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        if (!channelName) {
          const channels = await slackClient.listChannels(
            tokenResult.data.accessToken
          );
          return { channels: channels.map((c) => c.name) };
        }

        const channels = await slackClient.listChannels(
          tokenResult.data.accessToken
        );
        const channel = channels.find((c) => c.name === channelName);
        if (!channel) return { error: `Channel #${channelName} not found` };

        const messages = await slackClient.readMessages(
          tokenResult.data.accessToken,
          channel.id,
          limit
        );

        return { channel: channelName, messages };
      },
    }),

    sendSlackMessage: tool({
      description:
        "Send a message to a Slack channel. If HITL is enabled, returns a pending approval.",
      parameters: z.object({
        channelName: z.string().describe("Channel name (without #)"),
        text: z.string().describe("Message text to send"),
      }),
      // @ts-expect-error - AI SDK tool type inference
      execute: async ({ channelName, text }: { channelName: string; text: string }) => {
        if (hitlEnabled) {
          return {
            requiresApproval: true,
            action: "sendSlackMessage",
            details: { channelName, text },
            message: `I'd like to post this to #${channelName}:\n\n${text}`,
          };
        }

        const tokenResult = await exchangeToken("slack");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        const channels = await slackClient.listChannels(
          tokenResult.data.accessToken
        );
        const channel = channels.find((c) => c.name === channelName);
        if (!channel) return { error: `Channel #${channelName} not found` };

        await slackClient.sendMessage(
          tokenResult.data.accessToken,
          channel.id,
          text
        );

        return { sent: true, channel: channelName };
      },
    }),
  };
}
