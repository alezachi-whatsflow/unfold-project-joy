import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ═══════════════════════════════════════════════════════════════
// TELEGRAM SEND — Send messages via Telegram Bot API
//
// Body:
//   { chat_id, text, parse_mode?, reply_to_message_id? }
//   { chat_id, photo, caption? }       — send photo
//   { chat_id, document, caption? }    — send document
//
// Resolves bot_token from channel_integrations by tenant_id.
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { action, bot_token: rawBotToken, url: webhookSetUrl, chat_id, text, photo, document: doc, caption, parse_mode, reply_to_message_id, tenant_id, integration_id } = body;

    // ── Setup actions (getMe / setWebhook) — used by Integrações page ──
    if (action === "getMe" && rawBotToken) {
      const res = await fetch(`https://api.telegram.org/bot${rawBotToken}/getMe`);
      const data = await res.json();
      if (!data.ok) return json({ error: data.description || "Token inválido" }, 400);
      return json({ result: data.result });
    }
    if (action === "setWebhook" && rawBotToken && webhookSetUrl) {
      const res = await fetch(`https://api.telegram.org/bot${rawBotToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookSetUrl }),
      });
      const data = await res.json();
      return json({ ok: data.ok, description: data.description });
    }

    if (!chat_id) return json({ error: "chat_id is required" }, 400);
    if (!text && !photo && !doc) return json({ error: "text, photo or document is required" }, 400);

    // Find integration
    let integration: any = null;
    if (integration_id) {
      const { data } = await supabase
        .from("channel_integrations")
        .select("id, tenant_id, bot_token, bot_username")
        .eq("id", integration_id)
        .maybeSingle();
      integration = data;
    } else if (tenant_id) {
      const { data } = await supabase
        .from("channel_integrations")
        .select("id, tenant_id, bot_token, bot_username")
        .eq("tenant_id", tenant_id)
        .eq("provider", "TELEGRAM")
        .eq("status", "active")
        .maybeSingle();
      integration = data;
    } else {
      // Resolve tenant from user
      const { data: ut } = await supabase.from("user_tenants").select("tenant_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (ut?.tenant_id) {
        const { data } = await supabase
          .from("channel_integrations")
          .select("id, tenant_id, bot_token, bot_username")
          .eq("tenant_id", ut.tenant_id)
          .eq("provider", "TELEGRAM")
          .eq("status", "active")
          .maybeSingle();
        integration = data;
      }
    }

    if (!integration?.bot_token) return json({ error: "No active Telegram bot found" }, 404);

    const TG_API = `https://api.telegram.org/bot${integration.bot_token}`;
    let method = "sendMessage";
    let payload: Record<string, unknown> = { chat_id };

    if (text) {
      payload.text = text;
      if (parse_mode) payload.parse_mode = parse_mode;
      if (reply_to_message_id) payload.reply_to_message_id = reply_to_message_id;
    } else if (photo) {
      method = "sendPhoto";
      payload.photo = photo;
      if (caption) payload.caption = caption;
    } else if (doc) {
      method = "sendDocument";
      payload.document = doc;
      if (caption) payload.caption = caption;
    }

    const res = await fetch(`${TG_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!result.ok) {
      return json({ error: result.description || `Telegram API error`, code: result.error_code }, res.status);
    }

    // Save outgoing message
    const sentMsg = result.result;
    await supabase.from("chat_messages").insert({
      tenant_id: integration.tenant_id,
      sender_id: user.id,
      content: text || caption || `[${photo ? "photo" : "document"}]`,
      content_type: text ? "text" : (photo ? "image" : "document"),
      message_type: text ? "text" : (photo ? "image" : "document"),
      channel: "telegram",
      direction: "outgoing",
      timestamp: new Date().toISOString(),
      wa_message_id: `tg_${sentMsg?.message_id}_${chat_id}`,
      metadata: {
        provider: "TELEGRAM",
        integration_id: integration.id,
        chat_id,
        message_id: sentMsg?.message_id,
      },
    });

    return json({ success: true, message_id: sentMsg?.message_id });
  } catch (err: any) {
    console.error("[telegram-send] Error:", err);
    return json({ error: err.message }, 500);
  }
});
