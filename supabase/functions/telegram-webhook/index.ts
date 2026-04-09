/**
 * telegram-webhook
 * Receives messages from our MTProto microservice (Userbot with QR login).
 * No Telegraf, no Bot API — just a secure webhook endpoint.
 *
 * Expected payload from microservice:
 * {
 *   session_id: string,       // Unique session identifier for this Telegram account
 *   event: "message" | "message_edit" | "status" | "connection",
 *   message?: {
 *     id: number,             // Telegram message ID
 *     text: string,
 *     from: { id: number, first_name: string, last_name?: string, username?: string },
 *     chat_id: number,
 *     chat_title?: string,    // For groups
 *     timestamp: number,      // Unix seconds
 *     is_group: boolean,
 *     type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "location" | "contact",
 *     media_url?: string,
 *     caption?: string,
 *     reply_to_msg_id?: number,
 *   },
 *   status?: { connected: boolean, phone?: string },
 * }
 *
 * Security: validates X-Webhook-Secret header against TELEGRAM_WEBHOOK_SECRET env var.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ── Security: validate webhook secret ──
    const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
    if (webhookSecret) {
      const incomingSecret = req.headers.get("x-webhook-secret") || "";
      if (incomingSecret !== webhookSecret) {
        console.warn("[telegram-webhook] Invalid webhook secret");
        return new Response("Forbidden", { status: 403 });
      }
    }

    const payload = await req.json();
    const { session_id, event, message, status } = payload;

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[telegram-webhook] event=${event} session=${session_id}`);

    // ── Resolve tenant by session_id ──
    // First check channel_integrations (provider=TELEGRAM, bot_token or channel_id = session_id)
    const { data: integration } = await supabase
      .from("channel_integrations")
      .select("id, tenant_id, name, bot_username")
      .or(`bot_token.eq.${session_id},channel_id.eq.${session_id}`)
      .eq("provider", "TELEGRAM")
      .eq("status", "active")
      .maybeSingle();

    if (!integration) {
      console.warn(`[telegram-webhook] No active Telegram integration for session ${session_id}`);
      return new Response(JSON.stringify({ error: "Unknown session" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = integration.tenant_id;
    const instanceName = `telegram_${session_id}`;

    // ── Handle connection status events ──
    if (event === "connection" && status) {
      console.log(`[telegram-webhook] Connection: session=${session_id} connected=${status.connected}`);
      await supabase.from("channel_integrations").update({
        status: status.connected ? "active" : "inactive",
        updated_at: new Date().toISOString(),
      }).eq("id", integration.id);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Handle messages ──
    if ((event === "message" || event === "message_edit") && message) {
      const chatId = message.chat_id;
      const fromUser = message.from || {};
      const senderName = [fromUser.first_name, fromUser.last_name].filter(Boolean).join(" ")
        || fromUser.username
        || String(chatId);
      const isGroup = message.is_group || false;
      const remoteJid = `tg_${chatId}@telegram`;
      const messageId = `tg_${message.id}_${chatId}`;
      const timestamp = message.timestamp
        ? new Date(message.timestamp * 1000).toISOString()
        : new Date().toISOString();

      const msgType = message.type || "text";
      const body = message.text || message.caption || (msgType !== "text" ? `[${msgType}]` : "");

      // 1. Save to whatsapp_messages
      const { error: msgErr } = await supabase.from("whatsapp_messages").upsert({
        instance_name: instanceName,
        remote_jid: remoteJid,
        message_id: messageId,
        direction: "incoming",
        type: msgType,
        body,
        media_url: message.media_url || null,
        caption: message.caption || null,
        sender_name: senderName,
        status: 4,
        tenant_id: tenantId,
        is_group: isGroup,
        quoted_message_id: message.reply_to_msg_id ? `tg_${message.reply_to_msg_id}_${chatId}` : null,
        raw_payload: {
          provider: "TELEGRAM",
          session_id,
          integration_id: integration.id,
          chat_id: chatId,
          chat_title: message.chat_title || null,
          from_user: fromUser,
          is_edited: event === "message_edit",
          is_group: isGroup,
        },
        created_at: timestamp,
      }, { onConflict: "message_id" });

      if (msgErr) {
        console.error("[telegram-webhook] Message insert error:", msgErr.message);
      }

      // 2. Upsert contact
      if (senderName && !isGroup) {
        await supabase.from("whatsapp_contacts").upsert({
          instance_name: instanceName,
          jid: remoteJid,
          phone: String(chatId),
          push_name: senderName,
          name: senderName,
          updated_at: new Date().toISOString(),
        }, { onConflict: "jid,instance_name" }).then(({ error }) => {
          if (error && !error.message?.includes("duplicate"))
            console.warn("[telegram-webhook] Contact upsert error:", error.message);
        });
      }

      // 3. Upsert lead (inbox entry)
      const { data: existingLead } = await supabase
        .from("whatsapp_leads")
        .select("id, assigned_attendant_id, lead_status, is_ticket_open, department_id")
        .eq("chat_id", remoteJid)
        .eq("instance_name", instanceName)
        .maybeSingle();

      const isActiveSession = existingLead?.assigned_attendant_id != null
        && existingLead?.lead_status !== "resolved";
      const isReopening = existingLead?.lead_status === "resolved";

      await supabase.from("whatsapp_leads").upsert({
        instance_name: instanceName,
        chat_id: remoteJid,
        tenant_id: tenantId,
        lead_name: isGroup ? (message.chat_title || `Grupo ${chatId}`) : senderName,
        lead_full_name: isGroup ? (message.chat_title || `Grupo ${chatId}`) : senderName,
        is_group: isGroup,
        is_community: false,
        group_subject: isGroup ? (message.chat_title || null) : null,
        assigned_attendant_id: isActiveSession ? existingLead.assigned_attendant_id : null,
        lead_status: isActiveSession
          ? existingLead.lead_status
          : isReopening ? "pending" : (existingLead ? existingLead.lead_status : "pending"),
        is_ticket_open: true,
        department_id: existingLead?.department_id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "instance_name,chat_id" }).then(({ error }) => {
        if (error) console.error("[telegram-webhook] Lead upsert error:", error.message);
      });

      console.log(`[telegram-webhook] Saved: ${senderName} → ${msgType} in ${isGroup ? "group" : "DM"} ${chatId}`);
    }

    // ── Handle status updates ──
    if (event === "status" && payload.message_id && payload.new_status) {
      const statusMap: Record<string, number> = { sent: 1, delivered: 2, read: 3 };
      const numericStatus = statusMap[payload.new_status];
      if (numericStatus !== undefined) {
        await supabase
          .from("whatsapp_messages")
          .update({ status: numericStatus, updated_at: new Date().toISOString() })
          .eq("message_id", `tg_${payload.message_id}_${payload.chat_id}`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[telegram-webhook] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, // Always 200 to prevent retries
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
