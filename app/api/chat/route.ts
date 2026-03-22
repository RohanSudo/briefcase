import { auth0 } from "@/lib/auth0";
import { streamText, type UIMessage, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { createGmailTools } from "@/lib/agent/tools/gmail";
import { createCalendarTools } from "@/lib/agent/tools/calendar";
import { createSlackTools } from "@/lib/agent/tools/slack";

// Convert UIMessage[] (from useChat) to ModelMessage[] (for streamText)
function toModelMessages(uiMessages: UIMessage[]): ModelMessage[] {
  return uiMessages.map((msg) => {
    // Extract text from parts
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

    const modelMessages = toModelMessages(messages);

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
