/**
 * gcal-sync — Bidirectional Google Calendar sync
 *
 * POST /functions/v1/gcal-sync
 * Body: { action: "sync_all" | "sync_activity" | "import_events", activity_id?: string }
 *
 * Handles:
 * 1. Push activities → Google Calendar (Whatsflow → Google)
 * 2. Pull events from Google → activities (Google → Whatsflow)
 * 3. Refresh expired tokens automatically
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface GCalConfig {
  id: string;
  user_id: string;
  tenant_id: string;
  google_email: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string | null;
  token_expiry: string | null;
  selected_calendar_id: string;
  sync_to_google: boolean;
  sync_from_google: boolean;
  auto_add_meet: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization") || "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync_all";

    // Get user's active Google Calendar config
    const { data: config } = await supabase
      .from("google_calendar_configs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!config) return json({ error: "Google Calendar não conectado" }, 400);

    // Refresh token if expired
    const accessToken = await ensureValidToken(supabase, config as GCalConfig);
    if (!accessToken) return json({ error: "Falha ao renovar token Google" }, 401);

    const results: string[] = [];
    const calendarId = config.selected_calendar_id || "primary";

    // 1. Sync Whatsflow → Google
    if (config.sync_to_google && (action === "sync_all" || action === "sync_activity")) {
      let activitiesQuery = supabase
        .from("activities")
        .select("*")
        .eq("assigned_to", user.id)
        .eq("gcal_synced", false)
        .not("status", "eq", "done");

      if (action === "sync_activity" && body.activity_id) {
        activitiesQuery = supabase
          .from("activities")
          .select("*")
          .eq("id", body.activity_id);
      }

      const { data: activities } = await activitiesQuery;

      for (const act of activities || []) {
        try {
          const eventBody = buildGoogleEvent(act, config.auto_add_meet);

          // Check if already synced
          const { data: existing } = await supabase
            .from("activity_gcal_sync")
            .select("gcal_event_id")
            .eq("activity_id", act.id)
            .eq("gcal_config_id", config.id)
            .maybeSingle();

          let eventId: string;
          if (existing?.gcal_event_id) {
            // Update existing event
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existing.gcal_event_id}`,
              {
                method: "PUT",
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify(eventBody),
              }
            );
            if (!res.ok) { console.error("Update event failed:", await res.text()); continue; }
            const ev = await res.json();
            eventId = ev.id;
          } else {
            // Create new event
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${config.auto_add_meet ? "?conferenceDataVersion=1" : ""}`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify(eventBody),
              }
            );
            if (!res.ok) { console.error("Create event failed:", await res.text()); continue; }
            const ev = await res.json();
            eventId = ev.id;

            // Save mapping
            await supabase.from("activity_gcal_sync").insert({
              activity_id: act.id,
              gcal_event_id: eventId,
              gcal_config_id: config.id,
              tenant_id: config.tenant_id,
              user_id: user.id,
              calendar_id: calendarId,
              event_link: ev.htmlLink || null,
              meet_link: ev.hangoutLink || null,
              sync_direction: "whatsflow_to_google",
            });
          }

          // Mark as synced
          await supabase.from("activities").update({ gcal_synced: true, gcal_event_id: eventId }).eq("id", act.id);
          results.push(`✓ ${act.title}`);
        } catch (e: any) {
          console.error(`Sync failed for activity ${act.id}:`, e.message);
          results.push(`✗ ${act.title}: ${e.message}`);
        }
      }
    }

    // 2. Import Google → Whatsflow
    if (config.sync_from_google && (action === "sync_all" || action === "import_events")) {
      try {
        const now = new Date();
        const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=50&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (res.ok) {
          const data = await res.json();
          let imported = 0;

          for (const ev of data.items || []) {
            if (!ev.id || !ev.summary) continue;

            // Check if already mapped
            const { data: existingSync } = await supabase
              .from("activity_gcal_sync")
              .select("id")
              .eq("gcal_event_id", ev.id)
              .eq("user_id", user.id)
              .maybeSingle();

            if (existingSync) continue;

            // Create activity from Google event
            const dueDate = ev.start?.date || ev.start?.dateTime?.split("T")[0] || null;
            const dueTime = ev.start?.dateTime ? ev.start.dateTime.split("T")[1]?.substring(0, 5) : null;

            const { data: newAct } = await supabase.from("activities").insert({
              tenant_id: config.tenant_id,
              title: ev.summary,
              description: ev.description || "",
              status: "todo",
              priority: "medium",
              due_date: dueDate,
              due_time: dueTime,
              assigned_to: user.id,
              created_by: user.id,
              gcal_event_id: ev.id,
              gcal_synced: true,
              tags: ["google-calendar"],
            }).select("id").single();

            if (newAct) {
              await supabase.from("activity_gcal_sync").insert({
                activity_id: newAct.id,
                gcal_event_id: ev.id,
                gcal_config_id: config.id,
                tenant_id: config.tenant_id,
                user_id: user.id,
                calendar_id: calendarId,
                event_link: ev.htmlLink || null,
                meet_link: ev.hangoutLink || null,
                sync_direction: "google_to_whatsflow",
              });
              imported++;
            }
          }

          if (imported > 0) results.push(`✓ ${imported} eventos importados do Google`);
        }
      } catch (e: any) {
        results.push(`✗ Import: ${e.message}`);
      }
    }

    // Update last_sync_at
    await supabase.from("google_calendar_configs")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", config.id);

    return json({ success: true, synced: results });
  } catch (err: any) {
    console.error("[gcal-sync] Error:", err);
    return json({ error: err.message }, 500);
  }
});

// ── Helpers ──

async function ensureValidToken(supabase: any, config: GCalConfig): Promise<string | null> {
  const expiry = config.token_expires_at || config.token_expiry;
  const isExpired = !expiry || new Date(expiry).getTime() < Date.now() + 60000; // 1 min buffer

  if (!isExpired) return config.access_token;
  if (!config.refresh_token) return null;

  // Resolve partner's Google credentials
  const { data: license } = await supabase
    .from("licenses")
    .select("id, parent_license_id")
    .eq("tenant_id", config.tenant_id)
    .maybeSingle();

  let clientId: string | null = null;
  let clientSecret: string | null = null;

  if (license) {
    const wlLicenseId = license.parent_license_id || license.id;
    const { data: wlConfig } = await supabase
      .from("whitelabel_config")
      .select("google_client_id, google_client_secret")
      .eq("license_id", wlLicenseId)
      .maybeSingle();

    if (wlConfig?.google_client_id) {
      clientId = wlConfig.google_client_id;
      clientSecret = wlConfig.google_client_secret;
    }
  }

  if (!clientId) clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  if (!clientSecret) clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  if (!clientId || !clientSecret) return null;

  // Refresh the token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: config.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await res.json();
  if (!res.ok || !tokens.access_token) {
    console.error("[gcal-sync] Token refresh failed:", tokens);
    return null;
  }

  // Save refreshed token
  await supabase.from("google_calendar_configs").update({
    access_token: tokens.access_token,
    token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", config.id);

  return tokens.access_token;
}

function buildGoogleEvent(activity: any, addMeet: boolean) {
  const startDate = activity.due_date || new Date().toISOString().split("T")[0];
  const startTime = activity.due_time || "09:00";

  const start = `${startDate}T${startTime}:00`;
  const endHour = parseInt(startTime.split(":")[0]) + 1;
  const end = `${startDate}T${String(endHour).padStart(2, "0")}:${startTime.split(":")[1]}:00`;

  const event: any = {
    summary: activity.title,
    description: activity.description || "",
    start: { dateTime: start, timeZone: "America/Sao_Paulo" },
    end: { dateTime: end, timeZone: "America/Sao_Paulo" },
  };

  if (addMeet) {
    event.conferenceData = {
      createRequest: {
        requestId: activity.id,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  return event;
}
