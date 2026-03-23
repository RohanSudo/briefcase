// @ts-nocheck
import { tool, jsonSchema } from "ai";
import { exchangeToken } from "@/lib/auth/token-exchange";
import * as calendarClient from "@/lib/api-clients/calendar";

export function createCalendarTools(
  userId: string,
  conversationId: string,
  hitlEnabled: boolean
) {
  return {
    getCalendarEvents: tool({
      description:
        "Get calendar events in a time range. Use ISO 8601 dates for timeMin/timeMax. For 'today', use today's date at 00:00 to 23:59. For 'Friday evening', use that Friday at 16:00 to 23:59.",
      parameters: jsonSchema({
        type: "object" as const,
        properties: {
          timeMin: { type: "string", description: "Start of time range (ISO 8601). Required." },
          timeMax: { type: "string", description: "End of time range (ISO 8601). Required." },
          maxResults: { type: "number", description: "Max events to return, between 1 and 20" },
        },
        required: ["timeMin", "timeMax", "maxResults"],
      }),
      execute: async ({ timeMin, timeMax, maxResults }: { timeMin: string; timeMax: string; maxResults: number }) => {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        const events = await calendarClient.getEvents(
          tokenResult.data.accessToken,
          timeMin,
          timeMax,
          maxResults || 10
        );

        return { events, timeRange: { from: timeMin, to: timeMax } };
      },
    }),

    createCalendarEvent: tool({
      description:
        "Create a new calendar event. If HITL is enabled, returns a pending approval.",
      parameters: jsonSchema({
        type: "object" as const,
        properties: {
          summary: { type: "string", description: "Event title" },
          start: { type: "string", description: "Start time (ISO 8601)" },
          end: { type: "string", description: "End time (ISO 8601)" },
          description: { type: "string", description: "Event description, empty string if none" },
          attendees: { type: "string", description: "Comma-separated attendee emails, empty string if none" },
        },
        required: ["summary", "start", "end", "description", "attendees"],
      }),
      execute: async ({ summary, start, end, description, attendees }: { summary: string; start: string; end: string; description: string; attendees: string }) => {
        const attendeeList = attendees ? attendees.split(",").map((a: string) => a.trim()).filter(Boolean) : [];

        if (hitlEnabled) {
          return {
            requiresApproval: true,
            action: "createCalendarEvent",
            details: { summary, start, end, description, attendees: attendeeList },
            message: `I'd like to create this event:\n\nTitle: ${summary}\nWhen: ${start} to ${end}${attendeeList.length ? `\nAttendees: ${attendeeList.join(", ")}` : ""}`,
          };
        }

        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        const event = await calendarClient.createEvent(
          tokenResult.data.accessToken,
          summary,
          start,
          end,
          description || undefined,
          attendeeList.length ? attendeeList : undefined
        );

        return { created: true, event };
      },
    }),
  };
}
