/**
 * Google Calendar Sync Job — BullMQ processor
 *
 * Handles async sync of activities to Google Calendar.
 * Runs in the AI processing lane (isolated from messaging).
 */
import { createServiceClient } from "../config/supabase.js";
import { createCalendarEvent, getCalendarConfig } from "./googleCalendar.js";

export interface GCalSyncJobData {
  type: "activity_to_gcal" | "gcal_to_activity" | "register_push";
  activityId?: string;
  tenantId: string;
  userId: string;
  action?: "create" | "update" | "delete";
}

/**
 * Process a Google Calendar sync job.
 */
export async function processGCalSyncJob(job: { data: GCalSyncJobData }) {
  const { type, activityId, tenantId, userId, action } = job.data;

  if (type === "activity_to_gcal" && activityId) {
    await syncActivityToGoogle(tenantId, userId, activityId, action || "create");
  }
}

/**
 * Sync a Whatsflow activity to Google Calendar.
 */
async function syncActivityToGoogle(
  tenantId: string,
  userId: string,
  activityId: string,
  action: string,
) {
  const supabase = createServiceClient();

  // Get the user's Google Calendar config
  const { data: config } = await supabase
    .from("google_calendar_configs")
    .select("*")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .eq("sync_to_google", true)
    .maybeSingle();

  if (!config) {
    // No config or sync disabled — skip silently
    return;
  }

  // Get the activity
  const { data: activity } = await supabase
    .from("activities")
    .select("*")
    .eq("id", activityId)
    .single();

  if (!activity) return;

  // Check if already synced
  const { data: existing } = await supabase
    .from("activity_gcal_sync")
    .select("*")
    .eq("activity_id", activityId)
    .eq("gcal_config_id", config.id)
    .maybeSingle();

  if (action === "delete" && existing) {
    // Delete from Google Calendar
    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.selected_calendar_id || "primary")}/events/${existing.gcal_event_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${config.access_token}` },
        },
      );
    } catch {}

    await supabase.from("activity_gcal_sync").delete().eq("id", existing.id);
    await supabase.from("activities").update({ gcal_synced: false, gcal_event_id: null }).eq("id", activityId);
    return;
  }

  // Build event times
  const dueDate = activity.due_date || new Date().toISOString().split("T")[0];
  const dueTime = activity.due_time || "09:00";
  const tz = config.timezone || "America/Sao_Paulo";
  const startTime = `${dueDate}T${dueTime}:00`;
  const endDt = new Date(`${dueDate}T${dueTime}:00`);
  endDt.setMinutes(endDt.getMinutes() + 30);
  const endTime = endDt.toISOString().replace("Z", "");

  if (action === "update" && existing) {
    // Update existing Google event
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.selected_calendar_id || "primary")}/events/${existing.gcal_event_id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${config.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: activity.title,
            description: activity.description || "",
            start: { dateTime: startTime, timeZone: tz },
            end: { dateTime: endTime, timeZone: tz },
          }),
        },
      );

      if (res.ok) {
        await supabase
          .from("activity_gcal_sync")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
    } catch (e: any) {
      console.error("[gcal-sync] Update failed:", e.message);
    }
    return;
  }

  // CREATE new event
  if (!existing) {
    const result = await createCalendarEvent(tenantId, {
      title: activity.title,
      description: activity.description || "",
      startTime,
      endTime,
      timezone: tz,
      addMeetLink: config.auto_add_meet,
    });

    if (!result) return;

    // Save sync mapping
    // Extract event ID from the eventLink
    const eventIdMatch = result.eventLink?.match(/eid=([^&]+)/);
    const gcalEventId = `wf_${activityId}_${Date.now()}`; // fallback

    // Actually we need to get the event ID from the create response
    // The createCalendarEvent function returns eventLink but not event ID
    // We'll query Google for the latest event we just created
    try {
      const listRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.selected_calendar_id || "primary")}/events?maxResults=1&orderBy=updated&q=${encodeURIComponent(activity.title)}`,
        { headers: { Authorization: `Bearer ${config.access_token}` } },
      );
      const listData = await listRes.json();
      const createdEvent = listData.items?.[0];

      if (createdEvent?.id) {
        await supabase.from("activity_gcal_sync").insert({
          activity_id: activityId,
          gcal_event_id: createdEvent.id,
          gcal_config_id: config.id,
          tenant_id: tenantId,
          user_id: userId,
          calendar_id: config.selected_calendar_id || "primary",
          event_link: result.eventLink,
          meet_link: result.meetLink || null,
          sync_direction: "whatsflow_to_google",
          etag: createdEvent.etag,
        });

        await supabase.from("activities").update({
          gcal_synced: true,
          gcal_event_id: createdEvent.id,
        }).eq("id", activityId);
      }
    } catch (e: any) {
      console.error("[gcal-sync] Post-create lookup failed:", e.message);
    }
  }
}
