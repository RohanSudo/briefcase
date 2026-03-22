import { auth0 } from "@/lib/auth0";
import { openai } from "@ai-sdk/openai";
import { streamText, type UIMessage } from "ai";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";

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
