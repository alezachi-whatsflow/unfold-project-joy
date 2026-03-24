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

/**
 * Sync message ack/status from uazapi for recent outgoing messages.
 * Called by the frontend polling to update ticks (sent → delivered → read).
 *
 * Body: { instanceName: string, messageIds?: string[] }
 *  - If messageIds provided, checks only those
 *  - Otherwise, checks all outgoing messages with status < 3 from last 24h
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instanceName, messageIds } = await req.json();

    if (!instanceName) {
      return new Response(
        JSON.stringify({ error: "instanceName required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get instance token
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

    // Get messages to check
    let msgsToCheck: { id: string; message_id: string; status: number }[];

    if (messageIds && messageIds.length > 0) {
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("id, message_id, status")
        .in("message_id", messageIds)
        .eq("direction", "outgoing")
        .lt("status", 3);
      msgsToCheck = data ?? [];
    } else {
      // Get recent outgoing messages that haven't reached "read" status
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("id, message_id, status")
        .eq("instance_name", instanceName)
        .eq("direction", "outgoing")
        .lt("status", 3)
        .gt("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50);
      msgsToCheck = data ?? [];
    }

    if (msgsToCheck.length === 0) {
      return new Response(
        JSON.stringify({ updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;

    // Check status for each message via uazapi API
    for (const msg of msgsToCheck) {
      try {
        const res = await fetch(`${UAZAPI_BASE_URL}/message/status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: inst.instance_token,
          },
          body: JSON.stringify({ id: msg.message_id }),
        });

        if (!res.ok) continue;

        const data = await res.json();
        // uazapi returns { ack: N } or { status: N } or { chatMessageStatusCode: N }
        const ack = data?.ack ?? data?.status ?? data?.chatMessageStatusCode;

        let newStatus: number | null = null;
        if (typeof ack === "number") {
          newStatus = ack >= 3 ? 3 : ack;
        } else if (typeof ack === "string") {
          const upper = ack.toUpperCase();
          if (upper === "READ" || upper === "PLAYED") newStatus = 3;
          else if (upper === "DELIVERED" || upper === "DELIVERY_ACK") newStatus = 2;
          else if (upper === "SENT" || upper === "SERVER_ACK") newStatus = 1;
        }

        // Only update if status increased
        if (newStatus !== null && newStatus > msg.status) {
          await supabase
            .from("whatsapp_messages")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", msg.id);
          updated++;
        }
      } catch (e) {
        // Skip individual message errors
        console.warn(`sync-message-status: error checking ${msg.message_id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ checked: msgsToCheck.length, updated }),
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
