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

      // Save to whatsapp_messages (same table the inbox reads from)
      const instanceName = `telegram_${integration.bot_username || integration.id}`;
      const remoteJid = `tg_${chatId}@telegram`;

      await supabase.from("whatsapp_messages").insert({
        instance_name: instanceName,
        remote_jid: remoteJid,
        message_id: `tg_${message.message_id}_${chatId}`,
        direction: "incoming",
        type: contentType,
        body: text || `[${contentType}]`,
        media_url: mediaUrl,
        status: 4,
        sender_name: senderName,
        tenant_id: integration.tenant_id,
        raw_payload: {
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
        },
      }).then(({ error }) => {
        if (error) console.error("[telegram-webhook] Insert error:", error.message);
        else console.log(`[telegram-webhook] Saved msg from ${senderName} in chat ${chatId} to whatsapp_messages`);
      });
    }

    // ── Handle callback query (button clicks) ──
    if (payload.callback_query) {
      const cb = payload.callback_query;
      console.log(`[telegram-webhook] Callback: ${cb.data} from ${cb.from?.id}`);

      const cbChatId = cb.message?.chat?.id;
      const cbInstanceName = `telegram_${integration.bot_username || integration.id}`;
      await supabase.from("whatsapp_messages").insert({
        instance_name: cbInstanceName,
        remote_jid: `tg_${cbChatId}@telegram`,
        message_id: `tg_cb_${cb.id}`,
        direction: "incoming",
        type: "text",
        body: `[Botão: ${cb.data}]`,
        status: 4,
        tenant_id: integration.tenant_id,
        raw_payload: {
          provider: "TELEGRAM",
          integration_id: integration.id,
          callback_data: cb.data,
          chat_id: cbChatId,
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
