/**
 * meta-webhook
 * Unified webhook receiver for WhatsApp Cloud API, Instagram and Messenger.
 * GET: Hub verification (challenge response)
 * POST: Incoming messages/events
 *
 * WhatsApp messages are saved to whatsapp_messages + whatsapp_leads
 * (same tables as uazapi-webhook) so they appear in the Inbox.
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

    const { data: integration } = await adminClient
      .from("channel_integrations")
      .select("id, provider")
      .eq("webhook_verify_token", token)
      .maybeSingle();

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
      const object = payload.object;

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
      return new Response("OK", { status: 200 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

// ─── WHATSAPP CLOUD API WEBHOOK HANDLER ─────────────────────────────────────
// Saves messages to whatsapp_messages + whatsapp_leads (same as uazapi-webhook)
// so they appear in the Inbox/Queue correctly.
async function handleWhatsAppWebhook(client: ReturnType<typeof createClient>, payload: any) {
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      const displayPhone = value.metadata?.display_phone_number || "";
      if (!phoneNumberId) continue;

      // Resolve integration
      const { data: integration } = await client
        .from("channel_integrations")
        .select("id, tenant_id, name, waba_id, access_token")
        .eq("phone_number_id", phoneNumberId)
        .eq("status", "active")
        .maybeSingle();

      if (!integration) {
        console.warn(`[meta-webhook] No active integration for phone_number_id ${phoneNumberId}`);
        continue;
      }

      const tenantId = integration.tenant_id;
      // Use a virtual instance name for Cloud API to distinguish from uazapi instances
      const instanceName = `cloud_api_${phoneNumberId}`;

      // ── Contact info from webhook payload ──
      const contacts = value.contacts || [];
      const contactMap: Record<string, { name: string; wa_id: string }> = {};
      for (const c of contacts) {
        if (c.wa_id) {
          contactMap[c.wa_id] = {
            name: c.profile?.name || "",
            wa_id: c.wa_id,
          };
        }
      }

      // ── Process Messages ──
      if (value.messages) {
        for (const msg of value.messages) {
          const fromNumber = msg.from; // sender phone (no @)
          const remoteJid = `${fromNumber}@s.whatsapp.net`;
          const contactInfo = contactMap[fromNumber];
          const senderName = contactInfo?.name || "";
          const messageId = msg.id || `cloud_${Date.now()}_${fromNumber}`;
          const timestamp = msg.timestamp
            ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
            : new Date().toISOString();

          // Extract content based on type
          const extracted = extractCloudMessageContent(msg);
          const { body, type, caption, ext, mime } = extracted;
          let { mediaId } = extracted;

          // Resolve media: download from Meta CDN → upload to our storage
          let mediaUrl: string | null = null;
          if (mediaId && integration.access_token) {
            mediaUrl = await resolveCloudMedia(mediaId, integration.access_token, client, ext, mime);
          }

          console.log(`[meta-webhook] WhatsApp Cloud msg: ${fromNumber} (${senderName}) → ${msg.type}: ${(body || "").substring(0, 50)}`);

          // 1. Save to whatsapp_messages (same table as uazapi)
          const messageData: Record<string, any> = {
            instance_name: instanceName,
            remote_jid: remoteJid,
            message_id: messageId,
            direction: "incoming",
            type,
            body: body || caption || null,
            media_url: mediaUrl,
            caption,
            sender_name: senderName || null,
            status: 4, // received
            tenant_id: tenantId,
            raw_payload: {
              ...msg,
              senderName,
              provider: "cloud_api",
              phone_number_id: phoneNumberId,
            },
            created_at: timestamp,
          };

          // Handle quoted messages (replies)
          if (msg.context?.id) {
            messageData.quoted_message_id = msg.context.id;
          }

          const { error: msgErr } = await client
            .from("whatsapp_messages")
            .upsert(messageData, { onConflict: "message_id" });

          if (msgErr) {
            console.error("[meta-webhook] Store msg error:", msgErr.message);
          }

          // 2. Upsert whatsapp_contacts
          if (senderName) {
            await client.from("whatsapp_contacts").upsert({
              instance_name: instanceName,
              jid: remoteJid,
              phone: fromNumber,
              push_name: senderName,
              name: senderName,
              updated_at: new Date().toISOString(),
            }, { onConflict: "jid,instance_name" }).then(({ error }) => {
              if (error && !error.message?.includes("duplicate"))
                console.warn("[meta-webhook] Contact upsert error:", error.message);
            });
          }

          // 3. Upsert whatsapp_leads (creates the inbox entry)
          const { data: existingLead } = await client
            .from("whatsapp_leads")
            .select("id, assigned_attendant_id, lead_status, is_ticket_open, department_id")
            .eq("chat_id", remoteJid)
            .eq("instance_name", instanceName)
            .maybeSingle();

          const isActiveSession = existingLead?.assigned_attendant_id != null
            && existingLead?.lead_status !== "resolved";
          const isReopening = existingLead?.lead_status === "resolved";

          await client.from("whatsapp_leads").upsert({
            instance_name: instanceName,
            chat_id: remoteJid,
            tenant_id: tenantId,
            lead_name: senderName || fromNumber,
            lead_full_name: senderName || fromNumber,
            is_group: false,
            is_community: false,
            assigned_attendant_id: isActiveSession
              ? existingLead.assigned_attendant_id
              : null,
            lead_status: isActiveSession
              ? existingLead.lead_status
              : isReopening
                ? "pending"
                : (existingLead ? existingLead.lead_status : "pending"),
            is_ticket_open: true,
            department_id: existingLead?.department_id || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "instance_name,chat_id" }).then(({ error }) => {
            if (error) console.error("[meta-webhook] Lead upsert error:", error.message);
          });
        }
      }

      // ── Process Status Updates ──
      if (value.statuses) {
        for (const status of value.statuses) {
          const statusMap: Record<string, number> = {
            sent: 1, delivered: 2, read: 3, failed: 0,
          };
          const newStatus = statusMap[status.status];
          if (newStatus !== undefined && status.id) {
            await client
              .from("whatsapp_messages")
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq("message_id", status.id)
              .then(({ error }) => {
                if (error && !error.message?.includes("0 rows"))
                  console.warn("[meta-webhook] Status update error:", error.message);
              });
          }
        }
      }
    }
  }
}

// ─── INSTAGRAM + MESSENGER WEBHOOK HANDLER ──────────────────────────────────
async function handlePageMessaging(
  client: ReturnType<typeof createClient>,
  payload: any,
  channel: "instagram" | "messenger"
) {
  const providerLabel = channel === "instagram" ? "INSTAGRAM" : "MESSENGER";

  for (const entry of payload.entry || []) {
    const pageId = entry.id;

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

    const tenantId = integration.tenant_id;
    const instanceName = `${channel}_${pageId}`;

    for (const messaging of entry.messaging || []) {
      if (messaging.message) {
        const senderId = messaging.sender?.id;
        const text = messaging.message.text || "";
        const attachments = messaging.message.attachments || [];
        const contentType = attachments.length > 0 ? (attachments[0]?.type || "attachment") : "text";
        const mediaUrl = attachments.length > 0 ? (attachments[0]?.payload?.url || null) : null;
        const messageId = messaging.message.mid || `${channel}_${Date.now()}_${senderId}`;
        const remoteJid = `${senderId}@${channel}.meta`;
        const timestamp = new Date(messaging.timestamp * 1000).toISOString();

        console.log(`[meta-webhook] ${providerLabel} msg from ${senderId} → integration ${integration.id}`);

        // Save to whatsapp_messages
        await client.from("whatsapp_messages").upsert({
          instance_name: instanceName,
          remote_jid: remoteJid,
          message_id: messageId,
          direction: "incoming",
          type: contentType,
          body: text || (mediaUrl ? `[${contentType}]` : ""),
          media_url: mediaUrl,
          sender_name: null,
          status: 4,
          tenant_id: tenantId,
          raw_payload: {
            provider: providerLabel,
            integration_id: integration.id,
            page_id: pageId,
            sender_psid: senderId,
            raw: messaging,
          },
          created_at: timestamp,
        }, { onConflict: "message_id" }).then(({ error }) => {
          if (error) console.error(`[meta-webhook] Store ${channel} msg error:`, error.message);
        });

        // Upsert lead
        const { data: existingLead } = await client
          .from("whatsapp_leads")
          .select("id, assigned_attendant_id, lead_status, is_ticket_open")
          .eq("chat_id", remoteJid)
          .eq("instance_name", instanceName)
          .maybeSingle();

        const isActiveSession = existingLead?.assigned_attendant_id != null
          && existingLead?.lead_status !== "resolved";
        const isReopening = existingLead?.lead_status === "resolved";

        await client.from("whatsapp_leads").upsert({
          instance_name: instanceName,
          chat_id: remoteJid,
          tenant_id: tenantId,
          lead_name: senderId,
          is_group: false,
          is_community: false,
          assigned_attendant_id: isActiveSession ? existingLead.assigned_attendant_id : null,
          lead_status: isActiveSession
            ? existingLead.lead_status
            : isReopening ? "pending" : (existingLead ? existingLead.lead_status : "pending"),
          is_ticket_open: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "instance_name,chat_id" }).then(({ error }) => {
          if (error) console.error(`[meta-webhook] ${channel} lead upsert error:`, error.message);
        });
      }

      if (messaging.delivery || messaging.read) {
        console.log(`[meta-webhook] ${providerLabel} status event from ${messaging.sender?.id}`);
      }

      if (messaging.postback) {
        console.log(`[meta-webhook] ${providerLabel} postback: ${messaging.postback.payload} from ${messaging.sender?.id}`);
      }
    }
  }
}

// ─── Resolve Media: download from Meta CDN → upload to our storage ──────────
async function resolveCloudMedia(
  mediaId: string,
  accessToken: string,
  client: ReturnType<typeof createClient>,
  ext: string,
  mime: string,
): Promise<string | null> {
  try {
    // 1. Get download URL from Meta
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const metaData = await metaRes.json();
    const downloadUrl = metaData?.url;
    if (!downloadUrl) {
      console.warn(`[meta-webhook] No download URL for media ${mediaId}`);
      return `cloud_media:${mediaId}`;
    }

    // 2. Download the media binary
    const mediaRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaRes.ok) {
      console.warn(`[meta-webhook] Media download failed: ${mediaRes.status}`);
      return `cloud_media:${mediaId}`;
    }
    const mediaBytes = new Uint8Array(await mediaRes.arrayBuffer());

    // 3. Upload to our Supabase storage
    const fileName = `cloud_${mediaId}_${Date.now()}.${ext}`;
    const { error: uploadErr } = await client.storage
      .from("chat-attachments")
      .upload(fileName, mediaBytes, { contentType: mime, upsert: false });

    if (uploadErr) {
      console.warn(`[meta-webhook] Storage upload failed: ${uploadErr.message}`);
      return `cloud_media:${mediaId}`;
    }

    const { data: urlData } = client.storage.from("chat-attachments").getPublicUrl(fileName);
    console.log(`[meta-webhook] Media resolved: ${mediaId} → ${urlData?.publicUrl?.substring(0, 80)}...`);
    return urlData?.publicUrl || `cloud_media:${mediaId}`;
  } catch (err: any) {
    console.error(`[meta-webhook] resolveCloudMedia error: ${err.message}`);
    return `cloud_media:${mediaId}`;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function extractCloudMessageContent(msg: any): {
  body: string | null;
  mediaId: string | null;
  mediaUrl: string | null;
  type: string;
  caption: string | null;
  ext: string;
  mime: string;
} {
  switch (msg.type) {
    case "text":
      return { body: msg.text?.body || "", mediaId: null, mediaUrl: null, type: "text", caption: null, ext: "", mime: "" };
    case "image":
      return { body: null, mediaId: msg.image?.id || null, mediaUrl: null, type: "image", caption: msg.image?.caption || null, ext: "jpg", mime: msg.image?.mime_type || "image/jpeg" };
    case "video":
      return { body: null, mediaId: msg.video?.id || null, mediaUrl: null, type: "video", caption: msg.video?.caption || null, ext: "mp4", mime: msg.video?.mime_type || "video/mp4" };
    case "audio":
      return { body: null, mediaId: msg.audio?.id || null, mediaUrl: null, type: "audio", caption: null, ext: "ogg", mime: msg.audio?.mime_type || "audio/ogg" };
    case "document":
      return { body: msg.document?.filename || null, mediaId: msg.document?.id || null, mediaUrl: null, type: "document", caption: msg.document?.caption || null, ext: msg.document?.filename?.split(".").pop() || "pdf", mime: msg.document?.mime_type || "application/pdf" };
    case "sticker":
      return { body: null, mediaId: msg.sticker?.id || null, mediaUrl: null, type: "sticker", caption: null, ext: "webp", mime: "image/webp" };
    case "location":
      return { body: `${msg.location?.latitude},${msg.location?.longitude}`, mediaId: null, mediaUrl: null, type: "location", caption: msg.location?.name || null, ext: "", mime: "" };
    case "contacts":
      return { body: JSON.stringify(msg.contacts), mediaId: null, mediaUrl: null, type: "contact", caption: null, ext: "", mime: "" };
    case "reaction":
      return { body: msg.reaction?.emoji || "", mediaUrl: null, type: "reaction", caption: null };
    default:
      return { body: `[${msg.type}]`, mediaUrl: null, type: msg.type || "unknown", caption: null };
  }
}
