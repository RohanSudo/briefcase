// @ts-nocheck
import { auth0 } from "@/lib/auth0";
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { createGmailTools } from "@/lib/agent/tools/gmail";
import { createCalendarTools } from "@/lib/agent/tools/calendar";
import { createSlackTools } from "@/lib/agent/tools/slack";
import type { UIMessage } from "ai";

function toModelMessages(uiMessages: UIMessage[]) {
  return uiMessages.map((msg) => {
    const textParts = msg.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("") || "";
    return {
      role: msg.role as "user" | "assistant" | "system",
      content: textParts,
    };
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response("Messages array required", { status: 400 });
    }

    const userId = session.user.sub ?? "";
    const modelMessages = toModelMessages(messages);
    const lastUserMessage = modelMessages.filter(m => m.role === "user").pop()?.content || "";

    const gmailTools = createGmailTools(userId, "default", false);
    const calendarTools = createCalendarTools(userId, "default", false);
    const slackTools = createSlackTools(userId, "default", false);

    // First: use generateText with tools to handle tool calls server-side
    // Then: stream the final response to the client (no tools in stream)
    const toolResult = await generateText({
      model: openai("gpt-4o-mini"),
      system: buildSystemPrompt(),
      messages: modelMessages,
      tools: {
        ...gmailTools,
        ...calendarTools,
        ...slackTools,
      },
      maxSteps: 5,
    });

    // If the AI generated text after tool calls, stream that back
    // If not, stream a fresh response incorporating tool results
    if (toolResult.text) {
      // Stream back the final text response
      const result = streamText({
        model: openai("gpt-4o-mini"),
        prompt: `You already processed the user's request. Here is your response to send back:\n\n${toolResult.text}`,
      });
      return result.toUIMessageStreamResponse();
    }

    // No tool calls needed -- just stream a direct response
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: buildSystemPrompt(),
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Chat API error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
