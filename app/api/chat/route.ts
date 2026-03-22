import { auth0 } from "@/lib/auth0";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { createGmailTools } from "@/lib/agent/tools/gmail";
import { createCalendarTools } from "@/lib/agent/tools/calendar";
import { createSlackTools } from "@/lib/agent/tools/slack";

export async function POST(req: Request) {
  const session = await auth0.getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return new Response("Messages array required", { status: 400 });
  }

  const userId = session.user.sub ?? "";

  const gmailTools = createGmailTools(userId, "default", false);
  const calendarTools = createCalendarTools(userId, "default", false);
  const slackTools = createSlackTools(userId, "default", false);

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: buildSystemPrompt(),
    messages,
    tools: {
      ...gmailTools,
      ...calendarTools,
      ...slackTools,
    },
  });

  return result.toUIMessageStreamResponse();
}
