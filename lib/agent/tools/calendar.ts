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
        "Get upcoming calendar events. Returns event title, time, location, and attendees.",
      parameters: z.object({
        maxResults: z.number().describe("Max events to return, between 1 and 20"),
      }),
      execute: async ({ maxResults }) => {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        const events = await calendarClient.getEvents(
          tokenResult.data.accessToken,
          undefined,
          undefined,
          maxResults || 10
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
        description: z.string().describe("Event description, empty string if none"),
        attendees: z.string().describe("Comma-separated list of attendee email addresses, empty string if none"),
      }),
      execute: async ({ summary, start, end, description, attendees }) => {
        const attendeeList = attendees ? attendees.split(",").map((a) => a.trim()).filter(Boolean) : [];

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
