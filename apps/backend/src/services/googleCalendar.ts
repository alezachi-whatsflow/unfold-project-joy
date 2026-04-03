/**
 * Google Calendar Service — Create events + auto-refresh tokens
 *
 * Used by the Assistente Autonomo's schedule_activity tool.
 * If tenant has active Google Calendar config, events are also
 * created in Google Calendar with optional Google Meet link.
 */
import { createServiceClient } from "../config/supabase.js";
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

interface CalendarEvent {
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  timezone?: string;
  attendees?: string[]; // email addresses
  addMeetLink?: boolean;
}

interface CalendarConfig {
  id: string;
  tenant_id: string;
  google_email: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  default_calendar_id: string;
  auto_add_meet: boolean;
  timezone: string;
}

/**
 * Get active Google Calendar config for a tenant.
 * Auto-refreshes token if expired.
 */
export async function getCalendarConfig(tenantId: string): Promise<CalendarConfig | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("google_calendar_configs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  // Check if token is expired (refresh 5 min before expiry)
  const expiry = new Date(data.token_expiry).getTime();
  const now = Date.now();

  if (now > expiry - 5 * 60 * 1000) {
    // Token expired or expiring soon — refresh
    const refreshed = await refreshAccessToken(data.refresh_token);
    if (refreshed) {
      await supabase
        .from("google_calendar_configs")
        .update({
          access_token: refreshed.access_token,
          token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      data.access_token = refreshed.access_token;
    } else {
      console.error("[gcal] Failed to refresh token for tenant:", tenantId);
      return null;
    }
  }

  return data as CalendarConfig;
}

/**
 * Refresh an expired access token using the refresh token.
 */
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await res.json();
    if (data.error) {
      console.error("[gcal] Token refresh error:", data.error);
      return null;
    }

    return { access_token: data.access_token, expires_in: data.expires_in };
  } catch (e: any) {
    console.error("[gcal] Token refresh failed:", e.message);
    return null;
  }
}

/**
 * Create an event in Google Calendar.
 * Returns the event link and optional Meet link.
 */
export async function createCalendarEvent(
  tenantId: string,
  event: CalendarEvent,
): Promise<{ eventLink: string; meetLink?: string } | null> {
  const config = await getCalendarConfig(tenantId);
  if (!config) return null;

  const calendarId = config.default_calendar_id || "primary";
  const tz = event.timezone || config.timezone || "America/Sao_Paulo";

  const body: any = {
    summary: event.title,
    description: event.description || "",
    start: { dateTime: event.startTime, timeZone: tz },
    end: { dateTime: event.endTime, timeZone: tz },
  };

  // Add attendees if provided
  if (event.attendees?.length) {
    body.attendees = event.attendees.map(email => ({ email }));
  }

  // Add Google Meet link
  if (event.addMeetLink ?? config.auto_add_meet) {
    body.conferenceData = {
      createRequest: {
        requestId: `wf-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[gcal] Create event error:", data.error?.message || data);
      return null;
    }

    // Update last_sync
    const supabase = createServiceClient();
    await supabase
      .from("google_calendar_configs")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", config.id);

    return {
      eventLink: data.htmlLink || "",
      meetLink: data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri || undefined,
    };
  } catch (e: any) {
    console.error("[gcal] Create event failed:", e.message);
    return null;
  }
}
