/**
 * Google Calendar Push Notification Webhook
 *
 * Receives notifications when events change in a user's Google Calendar.
 * Updates the corresponding activity in Supabase.
 *
 * Google Push Notification headers:
 * - X-Goog-Channel-ID: our channel UUID
 * - X-Goog-Resource-ID: Google's resource ID
 * - X-Goog-Resource-State: "sync" | "exists" | "not_exists"
 * - X-Goog-Message-Number: incrementing number
 */
import { Router, Request, Response } from "express";
import { createServiceClient } from "../../config/supabase.js";
import { getCalendarConfig } from "../../services/googleCalendar.js";

const router = Router();

/**
 * POST /api/webhooks/google-calendar
 * Receives push notifications from Google Calendar API.
 */
router.post("/", async (req: Request, res: Response) => {
  // Always respond 200 immediately — Google retries on failure
  const channelId = req.headers["x-goog-channel-id"] as string;
  const resourceState = req.headers["x-goog-resource-state"] as string;

  if (!channelId) {
    return res.status(200).send("OK");
  }

  // "sync" = initial subscription confirmation
  if (resourceState === "sync") {
    console.log("[gcal-webhook] Subscription confirmed for channel:", channelId);
    return res.status(200).send("OK");
  }

  // Process in background — don't block response
  res.status(200).send("OK");

  try {
    const supabase = createServiceClient();

    // Find config by push_channel_id
    const { data: config } = await supabase
      .from("google_calendar_configs")
      .select("*")
      .eq("push_channel_id", channelId)
      .eq("is_active", true)
      .maybeSingle();

    if (!config) {
      console.warn("[gcal-webhook] No config found for channel:", channelId);
      return;
    }

    if (!config.sync_from_google) {
      console.log("[gcal-webhook] sync_from_google disabled for config:", config.id);
      return;
    }

    // Fetch changed events using sync token
    const calendarId = config.selected_calendar_id || "primary";
    const params = new URLSearchParams({
      singleEvents: "true",
      maxResults: "50",
    });
    if (config.sync_token) {
      params.set("syncToken", config.sync_token);
    } else {
      // First sync: get events from now forward
      params.set("timeMin", new Date().toISOString());
    }

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${config.access_token}` } },
    );

    if (eventsRes.status === 401) {
      // Token expired — need refresh, enqueue for later
      console.warn("[gcal-webhook] Token expired for config:", config.id);
      return;
    }

    if (!eventsRes.ok) {
      const errText = await eventsRes.text();
      // If sync token is invalid, clear it for full re-sync next time
      if (eventsRes.status === 410) {
        await supabase
          .from("google_calendar_configs")
          .update({ sync_token: null })
          .eq("id", config.id);
        console.warn("[gcal-webhook] Sync token expired, cleared for config:", config.id);
      } else {
        console.error("[gcal-webhook] Events fetch error:", eventsRes.status, errText);
      }
      return;
    }

    const eventsData = await eventsRes.json();

    // Save new sync token
    if (eventsData.nextSyncToken) {
      await supabase
        .from("google_calendar_configs")
        .update({
          sync_token: eventsData.nextSyncToken,
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", config.id);
    }

    // Process each changed event
    for (const event of eventsData.items || []) {
      await processGoogleEvent(supabase, config, event);
    }
  } catch (err: any) {
    console.error("[gcal-webhook] Processing error:", err.message);
  }
});

/**
 * Process a single Google Calendar event change.
 * Creates, updates, or deletes the corresponding Whatsflow activity.
 */
async function processGoogleEvent(supabase: any, config: any, event: any) {
  const eventId = event.id;
  if (!eventId) return;

  // Check if we have a sync mapping for this event
  const { data: syncRecord } = await supabase
    .from("activity_gcal_sync")
    .select("*, activities(*)")
    .eq("gcal_event_id", eventId)
    .eq("gcal_config_id", config.id)
    .maybeSingle();

  // Event was cancelled/deleted
  if (event.status === "cancelled") {
    if (syncRecord) {
      // Mark activity as done (don't delete — user might want to keep it)
      await supabase
        .from("activities")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", syncRecord.activity_id);

      await supabase
        .from("activity_gcal_sync")
        .delete()
        .eq("id", syncRecord.id);
    }
    return;
  }

  // Parse event dates
  const startDt = event.start?.dateTime || event.start?.date;
  const dueDate = startDt ? startDt.split("T")[0] : null;
  const dueTime = startDt?.includes("T") ? startDt.split("T")[1]?.substring(0, 5) : null;

  if (syncRecord) {
    // UPDATE existing activity
    await supabase
      .from("activities")
      .update({
        title: event.summary || syncRecord.activities?.title || "Evento Google",
        description: event.description || syncRecord.activities?.description || "",
        due_date: dueDate,
        due_time: dueTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", syncRecord.activity_id);

    // Update sync record
    await supabase
      .from("activity_gcal_sync")
      .update({
        etag: event.etag,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", syncRecord.id);
  } else {
    // CREATE new activity from Google event (only if sync_from_google enabled)
    const { data: newActivity, error: actErr } = await supabase
      .from("activities")
      .insert({
        tenant_id: config.tenant_id,
        title: event.summary || "Evento Google Calendar",
        description: event.description || "",
        status: "todo",
        priority: "medium",
        due_date: dueDate,
        due_time: dueTime,
        tags: ["google_calendar"],
        created_by: config.user_id,
        assigned_to: config.user_id,
        gcal_event_id: eventId,
        gcal_synced: true,
      })
      .select()
      .single();

    if (actErr) {
      console.error("[gcal-webhook] Activity insert error:", actErr.message);
      return;
    }

    // Create sync mapping
    await supabase
      .from("activity_gcal_sync")
      .insert({
        activity_id: newActivity.id,
        gcal_event_id: eventId,
        gcal_config_id: config.id,
        tenant_id: config.tenant_id,
        user_id: config.user_id,
        calendar_id: config.selected_calendar_id || "primary",
        event_link: event.htmlLink || null,
        meet_link: event.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri || null,
        sync_direction: "google_to_whatsflow",
        etag: event.etag,
      });
  }
}

/**
 * Register a push notification channel for a Google Calendar.
 * Called when user connects their Google Calendar.
 */
export async function registerPushNotifications(
  accessToken: string,
  calendarId: string,
  channelId: string,
  webhookUrl: string,
): Promise<{ resourceId: string; expiration: string } | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          params: { ttl: "604800" }, // 7 days
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[gcal] Push registration failed:", err);
      return null;
    }

    const data = await res.json();
    return {
      resourceId: data.resourceId,
      expiration: new Date(Number(data.expiration)).toISOString(),
    };
  } catch (e: any) {
    console.error("[gcal] Push registration error:", e.message);
    return null;
  }
}

export default router;
