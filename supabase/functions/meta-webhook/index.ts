/**
 * meta-webhook
 * Unified webhook receiver for WhatsApp and Instagram.
 * GET: Hub verification (challenge response)
 * POST: Incoming messages/events
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  // ─── GET: Webhook Verification (Hub Challenge) ─────────────────────────
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode !== "subscribe" || !token || !challenge) {
      return new Response("Bad request", { status: 400 });
    }

    // Check if any integration has this verify token
    const { data: integration } = await adminClient
      .from("channel_integrations")
      .select("id, provider")
      .eq("webhook_verify_token", token)
      .maybeSingle();

    // Also check global fallback token
    const globalToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "";

    if (integration || token === globalToken) {
      console.log(`[meta-webhook] Verification successful for token ${token.substring(0, 8)}...`);
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    console.warn(`[meta-webhook] Verification failed: unknown token ${token.substring(0, 8)}...`);
    return new Response("Forbidden", { status: 403 });
  }

  // ─── POST: Incoming Messages/Events ────────────────────────────────────
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      const object = payload.object; // "whatsapp_business_account" or "instagram" or "page"

      console.log(`[meta-webhook] Received ${object} event`);

      if (object === "whatsapp_business_account") {
        await handleWhatsAppWebhook(adminClient, payload);
      } else if (object === "instagram") {
        await handlePageMessaging(adminClient, payload, "instagram");
      } else if (object === "page") {
        await handlePageMessaging(adminClient, payload, "messenger");
      } else {
        console.warn(`[meta-webhook] Unknown object type: ${object}`);
      }

      return new Response("OK", { status: 200 });
    } catch (e: any) {
      console.error("[meta-webhook] POST error:", e);
      // Always return 200 to prevent Meta from retrying
      return new Response("OK", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

// ─── WHATSAPP WEBHOOK HANDLER ────────────────────────────────────────────────
async function handleWhatsAppWebhook(client: ReturnType<typeof createClient>, payload: any) {
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // Resolve integration by phone_number_id (operational key)
      const { data: integration } = await client
        .from("channel_integrations")
        .select("id, tenant_id, name")
        .eq("phone_number_id", phoneNumberId)
        .eq("status", "active")
        .maybeSingle();

      if (!integration) {
        console.warn(`[meta-webhook] No active integration for phone_number_id ${phoneNumberId}`);
        continue;
      }

      // Process messages
      if (value.messages) {
        for (const msg of value.messages) {
          console.log(`[meta-webhook] WhatsApp msg from ${msg.from} → integration ${integration.id}: ${msg.type}`);

          await client.from("chat_messages").insert({
            tenant_id: integration.tenant_id,
            sender_id: msg.from,
            content: extractMessageContent(msg),
            content_type: msg.type,
            message_type: msg.type,
            direction: "incoming",
            timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
            wa_message_id: msg.id,
            metadata: {
              provider: "WABA",
              integration_id: integration.id,
              phone_number_id: phoneNumberId,
              raw: msg,
            },
          }).then(({ error }) => {
            if (error) console.error("[meta-webhook] Store msg error:", error.message);
          });
        }
      }

      // Process status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          console.log(`[meta-webhook] WhatsApp status: ${status.id} → ${status.status}`);
        }
      }
    }
  }
}

// ─── INSTAGRAM + MESSENGER WEBHOOK HANDLER ──────────────────────────────────
// Handles both object="instagram" and object="page" (Messenger)
// The payload structure is identical — only the provider label differs
async function handlePageMessaging(
  client: ReturnType<typeof createClient>,
  payload: any,
  channel: "instagram" | "messenger"
) {
  const providerLabel = channel === "instagram" ? "INSTAGRAM" : "MESSENGER";

  for (const entry of payload.entry || []) {
    const pageId = entry.id;

    // Find integration by facebook_page_id or instagram_business_account_id
    const { data: integration } = await client
      .from("channel_integrations")
      .select("id, tenant_id, name, provider")
      .or(`facebook_page_id.eq.${pageId},instagram_business_account_id.eq.${pageId}`)
      .eq("status", "active")
      .maybeSingle();

    if (!integration) {
      console.warn(`[meta-webhook] No active integration for ${channel} page/account ${pageId}`);
      continue;
    }

    for (const messaging of entry.messaging || []) {
      // Handle incoming messages
      if (messaging.message) {
        const senderId = messaging.sender?.id; // PSID for Messenger, IGSID for Instagram
        const recipientId = messaging.recipient?.id; // Page ID
        const text = messaging.message.text || "";
        const attachments = messaging.message.attachments || [];
        const contentType = attachments.length > 0 ? (attachments[0]?.type || "attachment") : "text";
        const mediaUrl = attachments.length > 0 ? (attachments[0]?.payload?.url || null) : null;

        console.log(`[meta-webhook] ${providerLabel} msg from ${senderId} → integration ${integration.id}`);

        // Upsert conversation
        const { data: conv } = await client
          .from("conversations")
          .upsert({
            tenant_id: integration.tenant_id,
            channel,
            provider: providerLabel,
            status: "open",
            last_message_at: new Date(messaging.timestamp * 1000).toISOString(),
          }, { onConflict: "tenant_id,channel" })
          .select("id")
          .maybeSingle();

        // Store message
        await client.from("chat_messages").insert({
          tenant_id: integration.tenant_id,
          conversation_id: conv?.id || null,
          sender_id: senderId,
          content: text || (mediaUrl ? `[${contentType}]` : ""),
          content_type: contentType,
          message_type: contentType,
          channel,
          direction: "incoming",
          timestamp: new Date(messaging.timestamp * 1000).toISOString(),
          wa_message_id: messaging.message.mid,
          media_url: mediaUrl,
          metadata: {
            provider: providerLabel,
            integration_id: integration.id,
            page_id: pageId,
            sender_psid: senderId,
            recipient_page_id: recipientId,
            raw: messaging,
          },
        }).then(({ error }) => {
          if (error) console.error(`[meta-webhook] Store ${channel} msg error:`, error.message);
        });
      }

      // Handle message delivery/read receipts
      if (messaging.delivery || messaging.read) {
        console.log(`[meta-webhook] ${providerLabel} status event from ${messaging.sender?.id}`);
      }

      // Handle postbacks (Messenger button clicks)
      if (messaging.postback) {
        console.log(`[meta-webhook] ${providerLabel} postback: ${messaging.postback.payload} from ${messaging.sender?.id}`);
      }
    }
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function extractMessageContent(msg: any): string {
  switch (msg.type) {
    case "text": return msg.text?.body || "";
    case "image": return msg.image?.caption || "[Imagem]";
    case "video": return msg.video?.caption || "[Vídeo]";
    case "audio": return "[Áudio]";
    case "document": return msg.document?.filename || "[Documento]";
    case "sticker": return "[Sticker]";
    case "location": return `[Localização: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
    case "contacts": return "[Contato]";
    case "reaction": return msg.reaction?.emoji || "[Reação]";
    default: return `[${msg.type}]`;
  }
}
