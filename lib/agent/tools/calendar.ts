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
        timeMin: z
          .string()
          .optional()
          .describe("Start of time range (ISO 8601). Defaults to now."),
        timeMax: z
          .string()
          .optional()
          .describe(
            "End of time range (ISO 8601). Defaults to 7 days from now."
          ),
        maxResults: z
          .number()
          .optional()
          .describe("Max events to return (default 10)"),
      }),
      // @ts-expect-error - optional params cause type inference issue with tool()
      execute: async ({ timeMin, timeMax, maxResults = 10 }: { timeMin?: string; timeMax?: string; maxResults?: number }) => {
        const tokenResult = await exchangeToken("google");
        if (!tokenResult.ok) return { error: tokenResult.error.message };

        const events = await calendarClient.getEvents(
          tokenResult.data.accessToken,
          timeMin,
          timeMax,
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
        description: z.string().optional().describe("Event description"),
        attendees: z
          .array(z.string())
          .optional()
          .describe("List of attendee email addresses"),
      }),
      // @ts-expect-error - optional params cause type inference issue with tool()
      execute: async ({ summary, start, end, description, attendees }: { summary: string; start: string; end: string; description?: string; attendees?: string[] }) => {
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
