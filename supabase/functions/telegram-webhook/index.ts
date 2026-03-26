import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════
// TELEGRAM WEBHOOK — Receive messages from Telegram Bot API
//
// Telegram sends updates as JSON with `message`, `callback_query`,
// `edited_message`, etc.
//
// Webhook URL per bot: /functions/v1/telegram-webhook?token={bot_token}
// The token query param identifies which tenant owns this bot.
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Extract bot token from URL query param for tenant resolution
    const url = new URL(req.url);
    const botToken = url.searchParams.get("token");

    const payload = await req.json();
    console.log("[telegram-webhook] Update received:", JSON.stringify(payload).substring(0, 300));

    // Resolve integration by bot_token
    let integration: any = null;
    if (botToken) {
      const { data } = await supabase
        .from("channel_integrations")
        .select("id, tenant_id, bot_token, bot_username, name")
        .eq("bot_token", botToken)
        .eq("provider", "TELEGRAM")
        .eq("status", "active")
        .maybeSingle();
      integration = data;
    }

    if (!integration) {
      // Try finding by any active Telegram integration (single-tenant fallback)
      const { data } = await supabase
        .from("channel_integrations")
        .select("id, tenant_id, bot_token, bot_username, name")
        .eq("provider", "TELEGRAM")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      integration = data;
    }

    if (!integration) {
      console.warn("[telegram-webhook] No active Telegram integration found");
      return new Response("OK", { status: 200 });
    }

    // ── Handle message ──
    const message = payload.message || payload.edited_message;
    if (message) {
      const chatId = message.chat?.id;
      const fromUser = message.from;
      const text = message.text || message.caption || "";
      const isEdited = !!payload.edited_message;

      // Detect content type
      let contentType = "text";
      let mediaUrl: string | null = null;
      if (message.photo) { contentType = "image"; }
      else if (message.video) { contentType = "video"; }
      else if (message.voice || message.audio) { contentType = "audio"; }
      else if (message.document) { contentType = "document"; mediaUrl = null; }
      else if (message.sticker) { contentType = "sticker"; }
      else if (message.location) { contentType = "location"; }
      else if (message.contact) { contentType = "contact"; }

      const senderName = [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(" ") || fromUser?.username || String(chatId);
      const isGroup = message.chat?.type === "group" || message.chat?.type === "supergroup";

      await supabase.from("chat_messages").insert({
        tenant_id: integration.tenant_id,
        sender_id: String(fromUser?.id || chatId),
        content: text || `[${contentType}]`,
        content_type: contentType,
        message_type: contentType,
        channel: "telegram",
        direction: "incoming",
        timestamp: new Date(message.date * 1000).toISOString(),
        wa_message_id: `tg_${message.message_id}_${chatId}`,
        media_url: mediaUrl,
        metadata: {
          provider: "TELEGRAM",
          integration_id: integration.id,
          chat_id: chatId,
          chat_type: message.chat?.type,
          chat_title: message.chat?.title,
          from_user: {
            id: fromUser?.id,
            username: fromUser?.username,
            first_name: fromUser?.first_name,
            last_name: fromUser?.last_name,
            is_bot: fromUser?.is_bot,
          },
          message_id: message.message_id,
          is_edited: isEdited,
          is_group: isGroup,
          reply_to: message.reply_to_message?.message_id || null,
          raw: payload,
        },
      }).then(({ error }) => {
        if (error) console.error("[telegram-webhook] Insert error:", error.message);
        else console.log(`[telegram-webhook] Saved msg from ${senderName} in chat ${chatId}`);
      });
    }

    // ── Handle callback query (button clicks) ──
    if (payload.callback_query) {
      const cb = payload.callback_query;
      console.log(`[telegram-webhook] Callback: ${cb.data} from ${cb.from?.id}`);

      await supabase.from("chat_messages").insert({
        tenant_id: integration.tenant_id,
        sender_id: String(cb.from?.id),
        content: `[Botão: ${cb.data}]`,
        content_type: "callback",
        message_type: "callback",
        channel: "telegram",
        direction: "incoming",
        timestamp: new Date().toISOString(),
        wa_message_id: `tg_cb_${cb.id}`,
        metadata: {
          provider: "TELEGRAM",
          integration_id: integration.id,
          callback_data: cb.data,
          chat_id: cb.message?.chat?.id,
          message_id: cb.message?.message_id,
        },
      });
    }

    return new Response("OK", { status: 200 });
  } catch (err: any) {
    console.error("[telegram-webhook] Error:", err);
    return new Response("OK", { status: 200 }); // Always 200 to prevent Telegram retries
  }
});
