import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ═══════════════════════════════════════════════════════════════
// API N8N INBOUND — Receive messages from n8n workflows
//
// n8n sends: POST with Authorization: Bearer <n8n_api_key>
// Body: { phone, text, channel?, instance_name? }
//
// We validate the key, resolve the tenant, and send the message
// via the appropriate channel (uazapi, meta, telegram, etc.)
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Validate Bearer token
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Missing Authorization header. Use: Bearer <n8n_api_key>" }, 401);

    // 2. Find integration by n8n_api_key (stored in access_token)
    const { data: integration } = await supabase
      .from("channel_integrations")
      .select("id, tenant_id, status")
      .eq("provider", "N8N")
      .eq("access_token", token)
      .eq("status", "active")
      .maybeSingle();

    if (!integration) return json({ error: "Invalid API key or integration inactive" }, 401);

    const body = await req.json();
    const { phone, text, channel, instance_name } = body;

    if (!phone) return json({ error: "phone is required" }, 400);
    if (!text) return json({ error: "text is required" }, 400);

    const tenantId = integration.tenant_id;

    // 3. Determine send channel — default to WhatsApp Web via uazapi
    const sendChannel = channel || "whatsapp_web";

    if (sendChannel === "telegram") {
      // Send via Telegram
      const { data: tgInt } = await supabase
        .from("channel_integrations")
        .select("bot_token")
        .eq("tenant_id", tenantId)
        .eq("provider", "TELEGRAM")
        .eq("status", "active")
        .maybeSingle();

      if (!tgInt?.bot_token) return json({ error: "No active Telegram bot for this tenant" }, 404);

      const tgRes = await fetch(`https://api.telegram.org/bot${tgInt.bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: phone, text }),
      });
      const tgData = await tgRes.json();
      if (!tgData.ok) return json({ error: tgData.description }, 400);

      return json({ success: true, channel: "telegram", message_id: tgData.result?.message_id });

    } else {
      // Send via uazapi (WhatsApp Web) — find first active instance for tenant
      let instName = instance_name;
      if (!instName) {
        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("instance_name, instance_token, server_url")
          .eq("tenant_id", tenantId)
          .eq("status", "connected")
          .limit(1)
          .maybeSingle();

        if (!inst) return json({ error: "No connected WhatsApp instance for this tenant" }, 404);
        instName = inst.instance_name;
      }

      // Get instance details
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("instance_name, instance_token, server_url")
        .eq("instance_name", instName)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!inst) return json({ error: `Instance '${instName}' not found` }, 404);

      // Send via uazapi
      const uazapiUrl = `${inst.server_url}/instance/${inst.instance_name}/send/text`;
      const sendRes = await fetch(uazapiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: inst.instance_token,
        },
        body: JSON.stringify({
          number: phone.replace(/\D/g, ""),
          text,
        }),
      });

      const sendData = await sendRes.json();

      // Save outgoing message
      await supabase.from("whatsapp_messages").insert({
        instance_name: inst.instance_name,
        remote_jid: `${phone.replace(/\D/g, "")}@s.whatsapp.net`,
        message_id: `n8n_${Date.now()}`,
        direction: "outgoing",
        type: "text",
        body: text,
        status: 4,
        tenant_id: tenantId,
        raw_payload: { source: "n8n", integration_id: integration.id },
      });

      return json({ success: true, channel: "whatsapp_web", instance: inst.instance_name, data: sendData });
    }
  } catch (err: any) {
    console.error("[api-n8n-inbound] Error:", err);
    return json({ error: err.message }, 500);
  }
});
