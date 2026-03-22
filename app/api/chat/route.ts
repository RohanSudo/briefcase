import { auth0 } from "@/lib/auth0";
import { generateText, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";

export async function POST(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response("Messages array required", { status: 400 });
    }

    // First, test that Gemini works with a simple non-streaming call
    // Remove this once confirmed working
    const testResult = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: "Say hello in one word",
    });

    if (!testResult.text) {
      return new Response(
        JSON.stringify({ error: "Gemini returned empty response" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Gemini works -- now do the real streaming call (no tools for now to isolate the issue)
    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: buildSystemPrompt(),
      messages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Chat API error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
