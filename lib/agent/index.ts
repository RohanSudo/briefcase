import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { buildSystemPrompt } from "./system-prompt";
import { createGmailTools } from "./tools/gmail";
import { createCalendarTools } from "./tools/calendar";

export interface AgentConfig {
  userId: string;
  conversationId: string;
  hitlEnabled: boolean;
}

export function createBriefcaseAgent(config: AgentConfig) {
  const { userId, conversationId, hitlEnabled } = config;

  const gmailTools = createGmailTools(userId, conversationId, hitlEnabled);
  const calendarTools = createCalendarTools(
    userId,
    conversationId,
    hitlEnabled
  );
  const allTools = {
    ...gmailTools,
    ...calendarTools,
  };

  return {
    tools: allTools,
    model: google("gemini-2.0-flash"),
    systemPrompt: buildSystemPrompt(),
  };
}

export async function runAgent(
  config: AgentConfig,
  messages: Array<{ role: string; content: string }>,
  onAssistantMessage?: (text: string) => Promise<void>
) {
  const agent = createBriefcaseAgent(config);

  return streamText({
    model: agent.model,
    system: agent.systemPrompt,
    messages: messages as any,
    tools: agent.tools,
    onFinish: onAssistantMessage
      ? async (event) => {
          if (event.text) await onAssistantMessage(event.text);
        }
      : undefined,
  });
}
