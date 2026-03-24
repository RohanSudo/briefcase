import { auth0 } from "@/lib/auth0";
import { openai as openaiProvider } from "@ai-sdk/openai";
import { streamText, type UIMessage } from "ai";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { exchangeToken } from "@/lib/auth/token-exchange";
import * as gmailClient from "@/lib/api-clients/gmail";
import * as calendarClient from "@/lib/api-clients/calendar";
import * as slackClient from "@/lib/api-clients/slack";

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ---------- Tool definitions as plain JSON (no Zod) ----------

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "checkEmail",
      description:
        "Read the user's recent Gmail inbox messages. Returns subjects, senders, snippets, and dates.",
      parameters: {
        type: "object",
        properties: {
          maxResults: {
            type: "number",
            description: "How many emails to fetch (default 10, max 20)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sendEmail",
      description:
        "Send an email from the user's Gmail account. Returns a confirmation with the message ID.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Plain-text email body" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCalendarEvents",
      description:
        "Fetch upcoming Google Calendar events. Returns title, time, location, and attendees.",
      parameters: {
        type: "object",
        properties: {
          timeMin: {
            type: "string",
            description: "ISO 8601 start bound (defaults to now)",
          },
          timeMax: {
            type: "string",
            description: "ISO 8601 end bound (defaults to 7 days from now)",
          },
          maxResults: {
            type: "number",
            description: "How many events to fetch (default 10)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createCalendarEvent",
      description:
        "Create a new event on the user's Google Calendar. Returns the created event details.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Event title" },
          start: {
            type: "string",
            description: "ISO 8601 start date-time",
          },
          end: { type: "string", description: "ISO 8601 end date-time" },
          description: {
            type: "string",
            description: "Optional event description",
          },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of attendee email addresses",
          },
        },
        required: ["summary", "start", "end"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listSlackChannels",
      description:
        "List the public Slack channels visible to the user. Returns channel IDs and names.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "readSlackMessages",
      description:
        "Read recent messages from a specific Slack channel.",
      parameters: {
        type: "object",
        properties: {
          channelId: {
            type: "string",
            description: "The Slack channel ID to read from",
          },
          limit: {
            type: "number",
            description: "Number of messages to fetch (default 20)",
          },
        },
        required: ["channelId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sendSlackMessage",
      description:
        "Post a message to a Slack channel on behalf of the user.",
      parameters: {
        type: "object",
        properties: {
          channelId: {
            type: "string",
            description: "The Slack channel ID to post in",
          },
          text: { type: "string", description: "The message text" },
        },
        required: ["channelId", "text"],
      },
    },
  },
];

// ---------- Tool execution ----------

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "checkEmail": {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok)
          return JSON.stringify({ error: tokenResult.error.message });
        const emails = await gmailClient.readEmails(
          tokenResult.data.accessToken,
          (args.maxResults as number) || 10
        );
        return JSON.stringify(emails);
      }

      case "sendEmail": {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok)
          return JSON.stringify({ error: tokenResult.error.message });
        const result = await gmailClient.sendEmail(
          tokenResult.data.accessToken,
          args.to as string,
          args.subject as string,
          args.body as string
        );
        return JSON.stringify(result);
      }

      case "getCalendarEvents": {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok)
          return JSON.stringify({ error: tokenResult.error.message });
        const events = await calendarClient.getEvents(
          tokenResult.data.accessToken,
          args.timeMin as string | undefined,
          args.timeMax as string | undefined,
          (args.maxResults as number) || 10
        );
        // Compute availability verdict so the AI doesn't have to do time math
        const queryStart = args.timeMin ? new Date(args.timeMin as string).getTime() : 0;
        const queryEnd = args.timeMax ? new Date(args.timeMax as string).getTime() : 0;
        const busySlots: string[] = [];
        const freeSlots: string[] = [];

        if (Array.isArray(events) && events.length > 0) {
          for (const evt of events) {
            const evtStart = new Date(evt.start).getTime();
            const evtEnd = new Date(evt.end).getTime();
            busySlots.push(`BUSY: "${evt.summary}" from ${evt.start} to ${evt.end}`);
          }
          // Check if the entire queried range is covered
          const anyOverlap = events.some((evt) => {
            const s = new Date(evt.start).getTime();
            const e = new Date(evt.end).getTime();
            return s < queryEnd && e > queryStart;
          });
          if (anyOverlap) {
            freeSlots.push("VERDICT: The user is BUSY during part or all of the requested time range. They are NOT free.");
          } else {
            freeSlots.push("VERDICT: The user is FREE during the requested time range.");
          }
        } else {
          freeSlots.push("VERDICT: No events found. The user is FREE during the requested time range.");
        }

        return JSON.stringify({
          events,
          busySlots,
          availability: freeSlots,
          _instruction: "Use the VERDICT above to answer the user. If the verdict says BUSY, the user is NOT free at ANY point during the busy event's duration."
        });
      }

      case "createCalendarEvent": {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok)
          return JSON.stringify({ error: tokenResult.error.message });
        const event = await calendarClient.createEvent(
          tokenResult.data.accessToken,
          args.summary as string,
          args.start as string,
          args.end as string,
          args.description as string | undefined,
          args.attendees as string[] | undefined
        );
        return JSON.stringify(event);
      }

      case "listSlackChannels": {
        const tokenResult = await exchangeToken("slack");
        if (!tokenResult.ok)
          return JSON.stringify({ error: tokenResult.error.message });
        const channels = await slackClient.listChannels(
          tokenResult.data.accessToken
        );
        return JSON.stringify(channels);
      }

      case "readSlackMessages": {
        const tokenResult = await exchangeToken("slack");
        if (!tokenResult.ok)
          return JSON.stringify({ error: tokenResult.error.message });
        const messages = await slackClient.readMessages(
          tokenResult.data.accessToken,
          args.channelId as string,
          (args.limit as number) || 20
        );
        return JSON.stringify(messages);
      }

      case "sendSlackMessage": {
        const tokenResult = await exchangeToken("slack");
        if (!tokenResult.ok)
          return JSON.stringify({ error: tokenResult.error.message });
        const result = await slackClient.sendMessage(
          tokenResult.data.accessToken,
          args.channelId as string,
          args.text as string
        );
        return JSON.stringify(result);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: unknown) {
    const e = err as Error;
    return JSON.stringify({ error: e.message || "Tool execution failed" });
  }
}

// ---------- Message conversion ----------

function uiToOpenAI(
  uiMessages: UIMessage[]
): ChatCompletionMessageParam[] {
  return uiMessages.map((msg) => {
    const text =
      msg.parts
        ?.filter((p) => p.type === "text")
        .map((p) => (p as { type: "text"; text: string }).text)
        .join("") || "";
    return {
      role: msg.role as "user" | "assistant",
      content: text,
    };
  });
}

// ---------- Route handler ----------

export async function POST(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { messages } = body;

    // Read HITL setting from cookie
    const cookieHeader = req.headers.get("cookie") || "";
    const hitlMatch = cookieHeader.match(/hitl=(\d)/);
    const hitlEnabled = hitlMatch ? hitlMatch[1] === "1" : true;

    if (!messages || !Array.isArray(messages)) {
      return new Response("Messages array required", { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(
      session.user.name || session.user.nickname,
      session.user.email
    );
    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...uiToOpenAI(messages),
    ];

    // Check if the latest user message is an internal directive (e.g. post-approval)
    const lastUserMsg = openaiMessages.filter((m) => m.role === "user").pop();
    const lastUserText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";
    const isInternalDirective = lastUserText.startsWith("[INTERNAL:");

    // Step 1: Non-streaming call with tools via OpenAI SDK directly
    const client = getOpenAIClient();
    const toolResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      // Skip tools entirely for internal directives to prevent infinite loops
      ...(isInternalDirective ? {} : { tools, tool_choice: "auto" as const }),
    });

    const choice = toolResponse.choices[0];
    const assistantMessage = choice.message;

    // Step 2: If the model requested tool calls, execute them and add results
    const extraMessages: ChatCompletionMessageParam[] = [];
    const WRITE_ACTIONS = ["sendEmail", "createCalendarEvent", "sendSlackMessage"];
    let hitlBlocked = false;
    let hitlAction = "";
    let hitlArgs: Record<string, unknown> = {};

    if (
      assistantMessage.tool_calls &&
      assistantMessage.tool_calls.length > 0
    ) {
      extraMessages.push({
        role: "assistant",
        content: assistantMessage.content || null,
        tool_calls: assistantMessage.tool_calls,
      });

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") continue;
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments);

        // If HITL is enabled and this is a write action, block it
        if (hitlEnabled && WRITE_ACTIONS.includes(fnName)) {
          hitlBlocked = true;
          hitlAction = fnName;
          hitlArgs = fnArgs;
          // Return a fake tool result that tells the AI to present an approval request
          extraMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              requiresApproval: true,
              action: fnName,
              details: fnArgs,
            }),
          });
        } else {
          const toolResult = await executeTool(fnName, fnArgs);
          extraMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }
      }
    }

    // Step 3: Build the final message list for the streaming response
    // Convert everything to simple role/content pairs for AI SDK's streamText
    const streamMessages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }> = [];

    // Add original user messages (skip system - passed separately)
    for (const msg of openaiMessages) {
      if (msg.role === "system") continue;
      streamMessages.push({
        role: msg.role as "user" | "assistant",
        content: typeof msg.content === "string" ? msg.content : "",
      });
    }

    // If tools were called, add the tool context as an assistant turn
    // so the streaming model has the data to work with
    if (extraMessages.length > 0) {
      // Gather all tool results into a context string
      const toolContext: string[] = [];
      if (assistantMessage.content) {
        toolContext.push(assistantMessage.content);
      }
      for (const m of extraMessages) {
        if (m.role === "tool") {
          const toolCallId = (m as { tool_call_id: string }).tool_call_id;
          const matchingCall = assistantMessage.tool_calls?.find(
            (tc) => tc.id === toolCallId
          );
          const toolName =
            matchingCall && matchingCall.type === "function"
              ? matchingCall.function.name
              : "unknown";
          toolContext.push(
            `[Tool result from ${toolName}]: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`
          );
        }
      }

      // Add the tool context
      if (hitlBlocked) {
        // Build approval message for the frontend
        const approvalJson = JSON.stringify({
          action: hitlAction,
          details: hitlArgs,
          message: hitlAction === "sendEmail"
            ? `Send email to ${hitlArgs.to}\nSubject: ${hitlArgs.subject}\n\n${hitlArgs.body}`
            : hitlAction === "createCalendarEvent"
            ? `Create event: ${hitlArgs.summary}\nWhen: ${hitlArgs.start} to ${hitlArgs.end}`
            : `Post to Slack channel ${hitlArgs.channelId}: ${hitlArgs.text}`,
        });

        streamMessages.push({
          role: "user",
          content: `[INTERNAL - The action requires user approval. Present what you want to do clearly, then include this EXACT block at the end of your message so the UI can render approval buttons:\n\n[APPROVAL_REQUIRED]${approvalJson}[/APPROVAL_REQUIRED]\n\nDescribe the action naturally before the block. Include the approval block at the very end.]`,
        });
      } else {
        streamMessages.push({
          role: "user",
          content: `[INTERNAL - Tool results for the previous request. Use these results to answer the user's question. Do not mention that you called tools or functions, just present the information naturally.]\n\n${toolContext.join("\n\n")}`,
        });
      }
    }

    // Step 4: Stream the final response via AI SDK (no tools passed)
    const result = streamText({
      model: openaiProvider("gpt-4o-mini"),
      system: systemPrompt,
      messages: streamMessages,
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
