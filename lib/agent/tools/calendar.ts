// @ts-nocheck
import { tool } from "ai";
import { z } from "zod";
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
        "Get upcoming calendar events. Returns event title, time, location, and attendees. All parameters are optional.",
      parameters: z.object({
        timeMin: z.string().describe("Start of time range (ISO 8601). Defaults to now."),
        timeMax: z.string().describe("End of time range (ISO 8601). Defaults to 7 days from now."),
        maxResults: z.number().describe("Max events to return. Defaults to 10."),
      }).partial(),
      execute: async (params) => {
        const { timeMin, timeMax, maxResults = 10 } = params as { timeMin?: string; timeMax?: string; maxResults?: number };
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        const events = await calendarClient.getEvents(
          tokenResult.data.accessToken,
          timeMin || undefined,
          timeMax || undefined,
          maxResults
        );

        return { events };
      },
    }),

    createCalendarEvent: tool({
      description:
        "Create a new calendar event. If HITL is enabled, returns a pending approval.",
      parameters: z.object({
        summary: z.string().describe("Event title"),
        start: z.string().describe("Start time (ISO 8601)"),
        end: z.string().describe("End time (ISO 8601)"),
        description: z.string().describe("Event description").optional(),
        attendees: z.array(z.string()).describe("List of attendee email addresses").optional(),
      }),
      execute: async (params) => {
        const { summary, start, end, description, attendees } = params as { summary: string; start: string; end: string; description?: string; attendees?: string[] };
        if (hitlEnabled) {
          return {
            requiresApproval: true,
            action: "createCalendarEvent",
            details: { summary, start, end, description, attendees },
            message: `I'd like to create this event:\n\nTitle: ${summary}\nWhen: ${start} to ${end}${attendees?.length ? `\nAttendees: ${attendees.join(", ")}` : ""}`,
          };
        }

        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        const event = await calendarClient.createEvent(
          tokenResult.data.accessToken,
          summary,
          start,
          end,
          description,
          attendees
        );

        return { created: true, event };
      },
    }),
  };
}
