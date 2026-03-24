import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const statusMap: Record<string, number> = {
  ERROR: 0, PENDING: 0,
  SERVER_ACK: 1, SENT: 1,
  DELIVERY_ACK: 2, DELIVERED: 2,
  READ: 3, PLAYED: 3,
};

function parseStatus(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const key = String(value).trim().toUpperCase();
  if (key in statusMap) return statusMap[key];
  const n = Number(value);
  if (!Number.isNaN(n)) return n >= 3 ? 3 : n <= 0 ? 0 : n;
  return null;
}

/**
 * Syncs message ack/read status from uazapi using POST /message/find.
 * Also syncs profile pictures using POST /chat/details.
 *
 * Body: { instanceName: string, remoteJid?: string, syncAvatars?: boolean }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instanceName, remoteJid, syncAvatars } = await req.json();

    if (!instanceName) {
      return new Response(
        JSON.stringify({ error: "instanceName required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("instance_token")
      .eq("instance_name", instanceName)
      .single();

    if (!inst?.instance_token) {
      return new Response(
        JSON.stringify({ error: "Instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = inst.instance_token;
    let statusUpdated = 0;
    let avatarsUpdated = 0;

    // ── Sync message status via /message/find ──
    if (remoteJid) {
      // Sync specific conversation
      const { data: pendingMsgs } = await supabase
        .from("whatsapp_messages")
        .select("id, message_id, status")
        .eq("instance_name", instanceName)
        .eq("remote_jid", remoteJid)
        .eq("direction", "outgoing")
        .lt("status", 3)
        .order("created_at", { ascending: false })
        .limit(30);

      if (pendingMsgs && pendingMsgs.length > 0) {
        const res = await fetch(`${UAZAPI_BASE_URL}/message/find`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ chatid: remoteJid, limit: 50 }),
        });

        if (res.ok) {
          const data = await res.json();
          const apiMsgs = data.messages || [];
          const apiStatusMap = new Map<string, number>();

          for (const msg of apiMsgs) {
            const mid = msg.messageid || msg.id?.split(":").pop();
            const s = parseStatus(msg.status);
            if (mid && s !== null) apiStatusMap.set(mid, s);
          }

          for (const dbMsg of pendingMsgs) {
            const apiStatus = apiStatusMap.get(dbMsg.message_id);
            if (apiStatus !== undefined && apiStatus > dbMsg.status) {
              await supabase
                .from("whatsapp_messages")
                .update({ status: apiStatus, updated_at: new Date().toISOString() })
                .eq("id", dbMsg.id);
              statusUpdated++;
            }
          }
        }
      }
    }

    // ── Sync profile pictures via /chat/details ──
    if (syncAvatars) {
      // Get distinct remote_jids that don't have profile_pic_url
      const { data: contacts } = await supabase
        .from("whatsapp_contacts")
        .select("id, jid, profile_pic_url")
        .eq("instance_name", instanceName)
        .is("profile_pic_url", null)
        .limit(20);

      for (const contact of contacts || []) {
        try {
          const phone = contact.jid?.replace(/@.*$/, "");
          if (!phone) continue;

          const res = await fetch(`${UAZAPI_BASE_URL}/chat/details`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token },
            body: JSON.stringify({ number: phone, preview: true }),
          });

          if (!res.ok) continue;
          const data = await res.json();
          const picUrl = data.imagePreview || data.image || null;

          if (picUrl) {
            await supabase
              .from("whatsapp_contacts")
              .update({ profile_pic_url: picUrl, updated_at: new Date().toISOString() })
              .eq("id", contact.id);
            avatarsUpdated++;
          }
        } catch {
          // Skip individual errors
        }
      }
    }

    return new Response(
      JSON.stringify({ statusUpdated, avatarsUpdated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-message-status error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
