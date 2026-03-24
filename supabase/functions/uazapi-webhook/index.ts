import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

type AnyRecord = Record<string, any>;

const messageStatusMap: Record<string, number> = {
  ERROR: 0,
  PENDING: 0,
  SERVER_ACK: 1,
  SENT: 1,
  DELIVERY_ACK: 2,
  DELIVERED: 2,
  READ: 3,
  PLAYED: 3,
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 3,
  "5": 3,
};

const asArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const toIso = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return new Date().toISOString();
  }

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && asNumber > 0) {
    const ms = asNumber > 1_000_000_000_000 ? asNumber : asNumber * 1000;
    return new Date(ms).toISOString();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const getEventName = (payload: AnyRecord) =>
  payload.event || payload.EventType || payload.eventType || payload.type || payload.action || "";

const getInstanceName = (payload: AnyRecord) =>
  payload.instance || payload.instanceName || payload.name || payload.token || "";

const normalizeMessageId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const withoutJidPrefix = raw.replace(/^\d+:/, "").replace(/^(true|false)_/i, "");
  const parts = withoutJidPrefix.split("_");
  const tail = parts[parts.length - 1];

  if (parts.length > 1 && /^[A-Za-z0-9]{10,}$/.test(tail)) {
    return tail;
  }

  return withoutJidPrefix;
};

const toMessageStatus = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;

  const normalizedKey = String(value).trim().toUpperCase();
  if (normalizedKey in messageStatusMap) {
    return messageStatusMap[normalizedKey];
  }

  const numericStatus = Number(value);
  if (!Number.isNaN(numericStatus)) {
    if (numericStatus <= 0) return 0;
    if (numericStatus === 1) return 1;
    if (numericStatus === 2) return 2;
    return 3;
  }

  return undefined;
};

const normalizeMessage = (msg: AnyRecord, payload: AnyRecord, instance: string) => {
  const chatPayload = payload.chat || {};

  const remoteJid =
    msg?.key?.remoteJid ||
    msg?.remoteJid ||
    msg?.chatid ||
    msg?.chatId ||
    chatPayload?.wa_chatid ||
    chatPayload?.jid ||
    chatPayload?.id ||
    null;

  if (!remoteJid) return null;

  const isGroup = String(remoteJid).endsWith("@g.us");

  const fromMe = Boolean(
    msg?.key?.fromMe ??
      msg?.fromMe ??
      msg?.sentByMe ??
      (msg?.sender && payload?.owner && String(msg.sender).includes(String(payload.owner)))
  );

  const rawMessageId =
    msg?.key?.id ||
    msg?.messageid ||
    msg?.messageId ||
    msg?.id ||
    null;

  const messageId =
    normalizeMessageId(rawMessageId) ||
    `${instance || "unknown"}-${remoteJid}-${msg?.messageTimestamp || Date.now()}`;

  const body =
    msg?.body ??
    msg?.text ??
    msg?.content?.text ??
    msg?.message?.conversation ??
    msg?.message?.extendedTextMessage?.text ??
    chatPayload?.wa_lastMessageTextVote ??
    chatPayload?.wa_lastMsg ??
    null;

  const mediaUrl =
    msg?.mediaUrl ??
    msg?.media?.url ??
    msg?.content?.URL ??
    msg?.content?.url ??
    msg?.message?.imageMessage?.url ??
    msg?.message?.videoMessage?.url ??
    msg?.message?.documentMessage?.url ??
    msg?.message?.audioMessage?.url ??
    msg?.message?.stickerMessage?.url ??
    null;

  // Extract caption from media messages
  const captionVal =
    msg?.caption ??
    msg?.message?.imageMessage?.caption ??
    msg?.message?.videoMessage?.caption ??
    msg?.message?.documentMessage?.caption ??
    msg?.content?.caption ??
    null;

  const rawType =
    msg?.messageType ??
    msg?.type ??
    msg?.content?.type ??
    chatPayload?.wa_lastMessageType ??
    "";

  // Normalize message type to simple categories
  const normalizedType = rawType.toLowerCase();
  let type = "text";
  if (normalizedType.includes("image")) type = "image";
  else if (normalizedType.includes("video") || normalizedType === "ptv") type = "video";
  else if (normalizedType.includes("audio") || normalizedType === "ptt") type = "audio";
  else if (normalizedType.includes("document")) type = "document";
  else if (normalizedType.includes("sticker")) type = "sticker";
  else if (body) type = "text";
  else if (mediaUrl) type = "media";
  else type = rawType || "unknown";

  const mimetype =
    msg?.mimetype ??
    msg?.content?.mimetype ??
    msg?.message?.imageMessage?.mimetype ??
    msg?.message?.videoMessage?.mimetype ??
    msg?.message?.documentMessage?.mimetype ??
    null;

  // When API sends generic "media", infer by mimetype
  if ((type === "media" || type === "unknown") && mimetype) {
    if (String(mimetype).startsWith("image/")) type = "image";
    else if (String(mimetype).startsWith("video/")) type = "video";
    else if (String(mimetype).startsWith("audio/")) type = "audio";
    else type = "document";
  }

  // For group messages, capture participant (actual sender) and group subject
  const participant =
    msg?.key?.participant ||
    msg?.participant ||
    msg?.sender ||
    null;

  const groupSubject =
    chatPayload?.name ||
    chatPayload?.subject ||
    msg?.groupSubject ||
    payload?.groupSubject ||
    null;

  // Enrich raw_payload with group metadata for UI consumption
  const enrichedPayload = {
    ...msg,
    ...(isGroup && participant ? { participant } : {}),
    ...(isGroup && groupSubject ? { groupSubject } : {}),
    ...(msg?.pushName ? { pushName: msg.pushName } : {}),
    ...(msg?.senderName ? { senderName: msg.senderName } : {}),
  };

  const parsedStatus = toMessageStatus(
    msg?.status ?? msg?.ack ?? msg?.chatMessageStatusCode ?? msg?.messageStatus ?? msg?.content?.status ?? null
  );

  return {
    instance_name: instance,
    remote_jid: remoteJid,
    message_id: String(messageId),
    direction: fromMe ? "outgoing" : "incoming",
    type,
    body: body || captionVal,
    media_url: mediaUrl,
    caption: captionVal,
    status: parsedStatus ?? (fromMe ? 2 : 4),
    track_source: msg?.trackSource ?? msg?.track_source ?? null,
    track_id: msg?.trackId ?? msg?.track_id ?? null,
    raw_payload: enrichedPayload,
    created_at: toIso(msg?.messageTimestamp ?? msg?.timestamp ?? chatPayload?.wa_lastMsgTimestamp),
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Sempre retornar 200 para a uazapi não retentar
  if (req.method !== "POST") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    const payload: AnyRecord = await req.json();

    console.log("uazapi-webhook raw keys:", Object.keys(payload).join(","));
    console.log("uazapi-webhook raw:", JSON.stringify(payload).substring(0, 500));

    const event = getEventName(payload);
    const instance = getInstanceName(payload);
    const data = payload.data ?? payload.message ?? payload.messages ?? payload;

    console.log(`uazapi-webhook: event=${event}, instance=${instance}`);

    // Only process messages from known instances
    if (instance) {
      const { data: knownInst } = await supabase
        .from("whatsapp_instances")
        .select("id")
        .or(`instance_name.eq.${instance},instance_token.eq.${instance},session_id.eq.${instance}`)
        .limit(1)
        .maybeSingle();

      if (!knownInst) {
        console.warn(`uazapi-webhook: ignoring unknown instance: ${instance}`);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }
    }

    if (!event && payload.message) {
      const normalized = normalizeMessage(payload.message, payload, instance);
      if (normalized) {
        await supabase.from("whatsapp_messages").upsert(normalized, { onConflict: "message_id" });
      }
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Handle status update payloads that don't have a named event
    // e.g. { id: { id: "xxx" }, ack: 3 } or { messageId: "xxx", status: "READ" }
    if (!event && (payload.ack !== undefined || (payload.id && payload.status !== undefined))) {
      const rawMessageId = payload?.id?.id || payload?.messageId || payload?.messageid || null;
      const messageId = normalizeMessageId(rawMessageId);
      const statusKey = payload.ack ?? payload.status;
      const newStatus = toMessageStatus(statusKey);
      if (messageId && newStatus !== undefined) {
        console.log(`uazapi-webhook: no-event status update ${messageId} -> ${newStatus}`);
        await supabase.from("whatsapp_messages").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("message_id", String(messageId));
      }
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    switch (event) {
      case "connection": {
        const instData = data?.instance || data || {};
        const status = instData?.status ?? data?.state ?? "disconnected";
        const updateData: Record<string, unknown> = {
          status,
          api_updated_at: new Date().toISOString(),
          ultimo_ping: new Date().toISOString(),
        };

        if (instData?.qrcode) updateData.qr_code = instData.qrcode;
        if (instData?.paircode) updateData.pair_code = instData.paircode;
        if (instData?.profileName) updateData.profile_name = instData.profileName;
        if (instData?.profilePicUrl) updateData.profile_pic_url = instData.profilePicUrl;
        if (instData?.phone || data?.phone) updateData.phone_number = instData?.phone || data?.phone;
        if (instData?.isBusiness !== undefined) updateData.is_business = instData.isBusiness;
        if (instData?.plataform) updateData.platform = instData.plataform;
        if (instData?.currentPresence) updateData.current_presence = instData.currentPresence;
        if (instData?.owner) updateData.owner_email = instData.owner;

        if (status === "connected" || status === "open") {
          updateData.qr_code = null;
          updateData.pair_code = null;
        }

        if (status === "disconnected" || status === "close") {
          updateData.last_disconnect = new Date().toISOString();
          updateData.last_disconnect_reason =
            instData?.lastDisconnectReason || data?.reason || data?.statusReason || null;
        }

        const { data: matched } = await supabase
          .from("whatsapp_instances")
          .select("id")
          .or(`instance_name.eq.${instance},instance_token.eq.${instance},session_id.eq.${instance}`)
          .limit(1)
          .single();

        if (matched) {
          await supabase.from("whatsapp_instances").update(updateData).eq("id", matched.id);
        } else {
          console.warn(`uazapi-webhook: No instance found for: ${instance}`);
        }

        break;
      }

      case "messages":
      case "messages.upsert": {
        const msgs = asArray(data).flatMap((item) => {
          if (item?.message) return asArray(item.message);
          return [item];
        });

        let saved = 0;

        for (const msg of msgs) {
          const normalized = normalizeMessage(msg, payload, instance);
          if (!normalized) continue;

          // Never overwrite outgoing messages saved by the proxy with webhook echo
          const { data: existing } = await supabase
            .from("whatsapp_messages")
            .select("status, direction")
            .eq("message_id", normalized.message_id)
            .maybeSingle();

          if (existing) {
            // If proxy already saved as outgoing, keep its data (webhook echo has wrong direction)
            if (existing.direction === "outgoing" && normalized.direction === "incoming") {
              // Only update status if it's higher (e.g., read ack)
              if (typeof existing.status === "number" && (normalized.status ?? 0) <= existing.status) {
                continue; // Skip entirely — proxy data is authoritative
              }
              // Status is higher (ack update), just update status field
              await supabase
                .from("whatsapp_messages")
                .update({ status: normalized.status, updated_at: new Date().toISOString() })
                .eq("message_id", normalized.message_id);
              saved += 1;
              continue;
            }
            // Never downgrade status
            if (typeof existing.status === "number" && existing.status > (normalized.status ?? 0)) {
              normalized.status = existing.status;
            }
          }
          normalized.updated_at = new Date().toISOString();

          const { error } = await supabase
            .from("whatsapp_messages")
            .upsert(normalized, { onConflict: "message_id" });

          if (error) {
            console.error("uazapi-webhook: message upsert error:", error);
          } else {
            saved += 1;
          }

          // Upsert contact info from incoming messages
          if (normalized.direction === "incoming" && normalized.remote_jid) {
            const contactName = msg?.senderName || msg?.pushName || msg?.verifiedBizName || null;
            if (contactName) {
              const phone = normalized.remote_jid.replace(/@.*$/, "");
              await supabase.from("whatsapp_contacts").upsert(
                {
                  instance_name: instance,
                  phone,
                  jid: normalized.remote_jid,
                  push_name: msg?.pushName || contactName,
                  name: msg?.senderName || msg?.verifiedBizName || contactName,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "instance_name,phone" }
              );
            }
          }
        }

        // fallback: cria um snapshot com último conteúdo do chat quando payload vem sem message detalhada
        if (saved === 0 && payload?.chat?.wa_chatid) {
          const chatSnapshot = normalizeMessage(
            {
              chatid: payload.chat.wa_chatid,
              messageType: payload.chat.wa_lastMessageType ?? "text",
              text: payload.chat.wa_lastMessageTextVote ?? payload.chat.wa_lastMsg ?? "",
              messageTimestamp: payload.chat.wa_lastMsgTimestamp,
              fromMe: false,
            },
            payload,
            instance
          );

          if (chatSnapshot) {
            await supabase.from("whatsapp_messages").upsert(chatSnapshot, { onConflict: "message_id" });
          }
        }

        // Also upsert lead info from the chat object that comes with every messages event
        const chat = payload?.chat;
        if (chat?.wa_chatid) {
          const leadName = chat.lead_name || chat.lead_fullName || null;
          // Only use pushName from incoming messages to avoid saving device owner's name
          const hasIncoming = msgs.some((m: AnyRecord) => !Boolean(m?.key?.fromMe ?? m?.fromMe ?? m?.sentByMe));
          const pushName = hasIncoming ? (msgs[0]?.senderName || msgs[0]?.pushName || null) : null;
          const contactName = leadName || pushName || null;

          await supabase.from("whatsapp_leads").upsert(
            {
              instance_name: instance,
              chat_id: chat.wa_chatid,
              lead_name: chat.lead_name || (hasIncoming ? pushName : null) || undefined,
              lead_full_name: chat.lead_fullName || (hasIncoming ? pushName : null) || undefined,
              lead_status: chat.lead_status || null,
              is_ticket_open: chat.lead_isTicketOpen ?? false,
              assigned_attendant_id: chat.lead_assignedAttendant_id || null,
              kanban_order: chat.lead_kanbanOrder ?? 0,
              lead_tags: chat.lead_tags || [],
              updated_at: new Date().toISOString(),
            },
            { onConflict: "instance_name,chat_id" }
          );
        }

        await supabase
          .from("whatsapp_instances")
          .update({ ultimo_ping: new Date().toISOString() })
          .or(`instance_name.eq.${instance},instance_token.eq.${instance},session_id.eq.${instance}`);

        break;
      }

      case "messages_update":
      case "messages.update":
      case "message.update":
      case "message_ack":
      case "message-ack":
      case "ack":
      case "message_status":
      case "status": {
        // Handle both array and single object payloads
        const updates = asArray(data);

        for (const upd of updates) {
          const rawMessageId =
            upd?.key?.id ||
            upd?.update?.key?.id ||
            upd?.id?.id ||
            upd?.messageid ||
            upd?.messageId ||
            upd?.id ||
            null;
          const messageId = normalizeMessageId(rawMessageId);
          if (!messageId) {
            console.warn("uazapi-webhook: status update without messageId:", JSON.stringify(upd).substring(0, 200));
            continue;
          }

          // Try multiple paths for status value
          const statusKey =
            upd?.update?.status ??
            upd?.status ??
            upd?.ack ??
            upd?.chatMessageStatusCode ??
            upd?.messageStatus ??
            null;

          const newStatus = toMessageStatus(statusKey);

          if (newStatus !== undefined) {
            console.log(`uazapi-webhook: updating message ${messageId} status to ${newStatus}`);
            const { error: updateError } = await supabase
              .from("whatsapp_messages")
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq("message_id", String(messageId));

            if (updateError) {
              console.error("uazapi-webhook: status update error:", updateError);
            }
          }
        }
        break;
      }

      case "leads": {
        const lead = data;
        if (!lead?.wa_chatid) break;

        await supabase.from("whatsapp_leads").upsert(
          {
            instance_name: instance,
            chat_id: lead.wa_chatid,
            lead_name: lead.lead_name,
            lead_full_name: lead.lead_fullName,
            lead_status: lead.lead_status,
            is_ticket_open: lead.lead_isTicketOpen,
            assigned_attendant_id: lead.lead_assignedAttendant_id,
            kanban_order: lead.lead_kanbanOrder,
            lead_tags: lead.lead_tags,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "instance_name,chat_id" }
        );
        break;
      }

      default:
        console.log(`uazapi-webhook: unhandled event '${event}'`);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("uazapi-webhook error:", err);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});
