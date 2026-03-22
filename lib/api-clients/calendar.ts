const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  location: string;
  attendees: string[];
}

export async function getEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string,
  maxResults = 10
): Promise<CalendarEvent[]> {
  const now = new Date();
  const min = timeMin || now.toISOString();
  const max =
    timeMax ||
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    timeMin: min,
    timeMax: max,
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `${CALENDAR_BASE}/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Calendar list failed: ${res.status}`);
  const data = await res.json();

  return (data.items || []).map(
    (item: {
      id: string;
      summary?: string;
      description?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      location?: string;
      attendees?: Array<{ email: string }>;
    }) => ({
      id: item.id,
      summary: item.summary || "(No title)",
      description: item.description || "",
      start: item.start?.dateTime || item.start?.date || "",
      end: item.end?.dateTime || item.end?.date || "",
      location: item.location || "",
      attendees: (item.attendees || []).map((a) => a.email),
    })
  );
}

export async function createEvent(
  accessToken: string,
  summary: string,
  start: string,
  end: string,
  description?: string,
  attendees?: string[]
): Promise<CalendarEvent> {
  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary,
      description: description || "",
      start: { dateTime: start },
      end: { dateTime: end },
      attendees: attendees?.map((email) => ({ email })) || [],
    }),
  });
  if (!res.ok) throw new Error(`Calendar create failed: ${res.status}`);
  const item = await res.json();
  return {
    id: item.id,
    summary: item.summary,
    description: item.description || "",
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date || "",
    location: item.location || "",
    attendees: (item.attendees || []).map(
      (a: { email: string }) => a.email
    ),
  };
}
