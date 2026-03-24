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
        "Read the user's Gmail inbox messages. Can filter for unread only. When the user says 'unread emails' or 'new emails', set unreadOnly to true.",
      parameters: {
        type: "object",
        properties: {
          maxResults: {
            type: "number",
            description: "How many emails to fetch (default 10, max 20)",
          },
          unreadOnly: {
            type: "boolean",
            description: "If true, only return unread emails. Default false.",
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
        "Send or reply to an email. When replying to an existing email, include the threadId and messageId from the original email to keep it in the same thread. Always reply in-thread when responding to an existing email.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line. For replies, use 'Re: <original subject>'" },
          body: { type: "string", description: "Plain-text email body" },
          threadId: { type: "string", description: "Gmail thread ID from the original email (for replies)" },
          messageId: { type: "string", description: "Message-ID header from the original email (for replies)" },
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
        "Check if the user is free or busy during a time range. IMPORTANT: Always use a WIDE time range. To check if someone is free at 5pm, query from the START of that day (00:00) to the END (23:59) so you catch events that START BEFORE 5pm but EXTEND PAST it. Never use a narrow 15-minute window.",
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
          (args.maxResults as number) || 10,
          (args.unreadOnly as boolean) || false
        );
        return JSON.stringify(emails);
      }

      case "sendEmail": {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok)
          return JSON.stringify({ error: tokenResult.error.message });
        const replyTo = (args.threadId && args.messageId)
          ? { threadId: args.threadId as string, messageId: args.messageId as string }
          : undefined;
        const result = await gmailClient.sendEmail(
          tokenResult.data.accessToken,
          args.to as string,
          args.subject as string,
          args.body as string,
          replyTo
        );
        return JSON.stringify(result);
      }

      case "getCalendarEvents": {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok)
          return JSON.stringify({ error: tokenResult.error.message });

        // Always expand to full day to catch overlapping events
        let queryMin = args.timeMin as string | undefined;
        let queryMax = args.timeMax as string | undefined;
        let fullDayMin = queryMin;
        let fullDayMax = queryMax;

        if (queryMin) {
          const d = new Date(queryMin);
          fullDayMin = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
          fullDayMax = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
        }

        const events = await calendarClient.getEvents(
          tokenResult.data.accessToken,
          fullDayMin,
          fullDayMax,
          (args.maxResults as number) || 20
        );

        // Check specific time availability
        const checkTime = queryMin ? new Date(queryMin as string).getTime() : 0;
        const busyAt: string[] = [];
        const freeAt: string[] = [];

        if (Array.isArray(events) && events.length > 0) {
          for (const evt of events) {
            const evtStart = new Date(evt.start).getTime();
            const evtEnd = new Date(evt.end).getTime();
            if (checkTime >= evtStart && checkTime < evtEnd) {
              busyAt.push(`CONFLICT: The user has "${evt.summary}" from ${evt.start} to ${evt.end}. The user is BUSY at the requested time because this event covers it.`);
            }
          }
        }

        const verdict = busyAt.length > 0
          ? `VERDICT: BUSY. The user is NOT free. ${busyAt.join(" ")}`
          : "VERDICT: FREE. No conflicting events at the requested time.";

        return JSON.stringify({
          allEventsOnDay: events,
          conflicts: busyAt,
          verdict,
          _instruction: "ALWAYS use the VERDICT to answer. If it says BUSY, the user is NOT free. Do not override the verdict with your own judgment."
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

    // Pre-fetch calendar data if user mentions calendar/schedule/free/busy
    const calendarKeywords = /calendar|schedule|free|busy|available|meeting|event|appointment/i;
    if (!isInternalDirective && calendarKeywords.test(lastUserText)) {
      try {
        const tokenResult = await exchangeToken("google");
        if (tokenResult.ok) {
          // Get today's and next 7 days events
          const now = new Date();
          const weekLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const events = await calendarClient.getEvents(
            tokenResult.data.accessToken,
            now.toISOString(),
            weekLater.toISOString(),
            20
          );
          const calendarContext = events.map((evt: { summary: string; start: string; end: string }) =>
            `- "${evt.summary}" from ${evt.start} to ${evt.end} (user is BUSY for the ENTIRE duration)`
          ).join("\n");
          // Inject calendar data as a system message so it doesn't interfere with tool calling
          openaiMessages.splice(1, 0, {
            role: "system",
            content: `Calendar data for the next 30 days. Use this to determine availability. If ANY event overlaps with a requested time, the user is BUSY:\n\n${calendarContext || "No events scheduled."}`,
          } as ChatCompletionMessageParam);
        }
      } catch {
        // Calendar fetch failed, continue without it
      }
    }

    // Step 1: Multi-round tool call loop (up to 5 rounds)
    const client = getOpenAIClient();
    const WRITE_ACTIONS = ["sendEmail", "createCalendarEvent", "sendSlackMessage"];
    let hitlBlocked = false;
    let hitlAction = "";
    let hitlArgs: Record<string, unknown> = {};
    const allMessages = [...openaiMessages];
    let lastAssistantContent = "";
    const MAX_ROUNDS = 5;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: allMessages,
        ...(isInternalDirective ? {} : { tools, tool_choice: "auto" as const }),
      });

      const choice = response.choices[0];
      const msg = choice.message;
      lastAssistantContent = msg.content || "";

      // No tool calls -- we're done
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        break;
      }

      // Add assistant message with tool calls
      allMessages.push({
        role: "assistant",
        content: msg.content || null,
        tool_calls: msg.tool_calls,
      });

      // Execute each tool call
      let roundBlocked = false;
      for (const toolCall of msg.tool_calls) {
        if (toolCall.type !== "function") continue;
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments);

        if (hitlEnabled && WRITE_ACTIONS.includes(fnName)) {
          hitlBlocked = true;
          roundBlocked = true;
          hitlAction = fnName;
          hitlArgs = fnArgs;
          allMessages.push({
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
          allMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }
      }

      // If HITL blocked a write action, stop the loop
      if (roundBlocked) break;
    }

    // Collect tool context from all messages beyond the original
    const extraMessages = allMessages.slice(openaiMessages.length);

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
    if (extraMessages.length > 0) {
      const toolContext: string[] = [];
      if (lastAssistantContent) {
        toolContext.push(lastAssistantContent);
      }
      for (const m of extraMessages) {
        if (m.role === "tool") {
          toolContext.push(
            `[Tool result]: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`
          );
        }
      }

      // Add the tool context
      if (hitlBlocked) {
        // Return approval card directly -- don't rely on AI to output the block
        const approvalJson = JSON.stringify({
          action: hitlAction,
          details: hitlArgs,
          message: hitlAction === "sendEmail"
            ? `Send email to ${hitlArgs.to}\nSubject: ${hitlArgs.subject}\n\n${hitlArgs.body}`
            : hitlAction === "createCalendarEvent"
            ? `Create event: ${hitlArgs.summary}\nWhen: ${hitlArgs.start} to ${hitlArgs.end}`
            : `Post to Slack channel ${hitlArgs.channelId}: ${hitlArgs.text}`,
        });

        const description = hitlAction === "sendEmail"
          ? `I'd like to send this email reply.`
          : hitlAction === "createCalendarEvent"
          ? `I'd like to create this calendar event.`
          : `I'd like to post this message to Slack.`;

        // Build the approval text with the block
        const approvalText = `${description}\n\n[APPROVAL_REQUIRED]${approvalJson}[/APPROVAL_REQUIRED]`;

        // Stream it using a simple echo prompt -- costs almost nothing
        const result = streamText({
          model: openaiProvider("gpt-4o-mini"),
          messages: [
            { role: "system", content: "Repeat the following text EXACTLY as given. Do not change, add, or remove anything. Output it verbatim." },
            { role: "user", content: approvalText },
          ],
        });

        return result.toUIMessageStreamResponse();
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
