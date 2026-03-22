// @ts-nocheck
import { tool, jsonSchema } from "ai";
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
        "Read recent messages from a Slack channel. Set channelName to 'list' to list available channels.",
      parameters: jsonSchema({
        type: "object" as const,
        properties: {
          channelName: { type: "string", description: "Channel name to read (without #). Use 'list' to list available channels." },
          limit: { type: "number", description: "Number of messages to fetch, between 1 and 50" },
        },
        required: ["channelName", "limit"],
      }),
      execute: async ({ channelName, limit }: { channelName: string; limit: number }) => {
        const tokenResult = await exchangeToken("slack");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        if (channelName === "list" || !channelName) {
          const channels = await slackClient.listChannels(
            tokenResult.data.accessToken
          );
          return { channels: channels.map((c: any) => c.name) };
        }

        const channels = await slackClient.listChannels(
          tokenResult.data.accessToken
        );
        const channel = channels.find((c: any) => c.name === channelName);
        if (!channel) return { error: `Channel #${channelName} not found` };

        const messages = await slackClient.readMessages(
          tokenResult.data.accessToken,
          channel.id,
          limit || 20
        );

        return { channel: channelName, messages };
      },
    }),

    sendSlackMessage: tool({
      description:
        "Send a message to a Slack channel. If HITL is enabled, returns a pending approval.",
      parameters: jsonSchema({
        type: "object" as const,
        properties: {
          channelName: { type: "string", description: "Channel name (without #)" },
          text: { type: "string", description: "Message text to send" },
        },
        required: ["channelName", "text"],
      }),
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
        const channel = channels.find((c: any) => c.name === channelName);
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
