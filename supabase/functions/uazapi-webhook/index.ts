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

  // Extract sender name (pushName / senderName / verifiedBizName)
  const senderName =
    msg?.senderName ||
    msg?.pushName ||
    msg?.verifiedBizName ||
    payload?.senderName ||
    payload?.pushName ||
    null;

  // Enrich raw_payload with group metadata for UI consumption
  const enrichedPayload = {
    ...msg,
    ...(isGroup && participant ? { participant } : {}),
    ...(isGroup && groupSubject ? { groupSubject } : {}),
    ...(msg?.pushName ? { pushName: msg.pushName } : {}),
    ...(senderName ? { senderName } : {}),
  };

  const parsedStatus = toMessageStatus(
    msg?.status ?? msg?.ack ?? msg?.chatMessageStatusCode ?? msg?.messageStatus ?? msg?.content?.status ?? null
  );

  // Extract quoted message ID from contextInfo (for reply threading)
  const quotedMessageId =
    msg?.quoted ??
    msg?.content?.contextInfo?.stanzaID ??
    msg?.message?.extendedTextMessage?.contextInfo?.stanzaId ??
    msg?.contextInfo?.stanzaID ??
    null;

  // Community detection
  const isCommunity = Boolean(
    msg?.isCommunity ??
    msg?.linkedParentId ??
    payload?.isCommunity ??
    chatPayload?.isCommunity ??
    false
  );
  const parentGroupId = msg?.linkedParentId ?? chatPayload?.linkedParentId ?? null;

  return {
    instance_name: instance,
    remote_jid: remoteJid,
    message_id: String(messageId),
    direction: fromMe ? "outgoing" : "incoming",
    type,
    body: body || captionVal,
    media_url: mediaUrl,
    caption: captionVal,
    sender_name: fromMe ? null : senderName,
    status: parsedStatus ?? (fromMe ? 2 : 4),
    track_source: msg?.trackSource ?? msg?.track_source ?? null,
    track_id: msg?.trackId ?? msg?.track_id ?? null,
    raw_payload: enrichedPayload,
    quoted_message_id: quotedMessageId ? normalizeMessageId(quotedMessageId) : null,
    is_group: isGroup,
    is_community: isCommunity,
    parent_group_id: parentGroupId,
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

          // Auto-set presence to "available" so we receive delivery/read receipts
          const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
          if (UAZAPI_BASE_URL) {
            const { data: instToken } = await supabase
              .from("whatsapp_instances")
              .select("instance_token")
              .or(`instance_name.eq.${instance},instance_token.eq.${instance},session_id.eq.${instance}`)
              .limit(1)
              .maybeSingle();

            if (instToken?.instance_token) {
              fetch(`${UAZAPI_BASE_URL}/instance/presence`, {
                method: "POST",
                headers: { "Content-Type": "application/json", token: instToken.instance_token },
                body: JSON.stringify({ presence: "available" }),
              }).catch(() => {});
              console.log("uazapi-webhook: auto-set presence to available for", instance);

              // CATCH-UP: Fetch recent messages that may have been lost during downtime
              // Check if instance was offline for more than 5 minutes
              const { data: instInfo } = await supabase
                .from("whatsapp_instances")
                .select("ultimo_ping, last_disconnect")
                .or(`instance_name.eq.${instance},instance_token.eq.${instance}`)
                .limit(1)
                .maybeSingle();

              const lastPing = instInfo?.ultimo_ping ? new Date(instInfo.ultimo_ping).getTime() : 0;
              const downtime = Date.now() - lastPing;
              const FIVE_MINUTES = 5 * 60 * 1000;

              if (downtime > FIVE_MINUTES) {
                console.log(`uazapi-webhook: instance ${instance} was offline ${Math.round(downtime / 60000)}min — triggering catch-up`);
                // Fire-and-forget: fetch recent messages from uazapi
                fetch(`${UAZAPI_BASE_URL}/chat/messages`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", token: instToken.instance_token },
                  body: JSON.stringify({ count: 50, offset: 0 }),
                }).then(async (r) => {
                  if (!r.ok) return;
                  const msgs = await r.json().catch(() => []);
                  const arr = Array.isArray(msgs) ? msgs : msgs?.messages || [];
                  console.log(`uazapi-webhook: catch-up found ${arr.length} messages for ${instance}`);
                }).catch(() => {});
              }
            }
          }
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
      case "messages.upsert":
      case "messages.history":
      case "history": {
        const msgs = asArray(data).flatMap((item) => {
          if (item?.message) return asArray(item.message);
          return [item];
        });

        // Sort by timestamp for history events (oldest first)
        if (event === "messages.history" || event === "history") {
          msgs.sort((a: any, b: any) => (a?.messageTimestamp || 0) - (b?.messageTimestamp || 0));
          console.log(`[uazapi-webhook] Processing history: ${msgs.length} messages for ${instance}`);
        }

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

            // ── n8n dispatch: forward incoming messages to tenant's n8n webhook ──
            if (normalized.direction === "incoming") {
              // Resolve tenant for n8n dispatch
              const { data: instForN8n } = await supabase
                .from("whatsapp_instances")
                .select("tenant_id")
                .or(`instance_name.eq.${instance},instance_token.eq.${instance}`)
                .limit(1)
                .maybeSingle();

              if (instForN8n?.tenant_id) {
                supabase
                  .from("channel_integrations")
                  .select("webhook_url")
                  .eq("tenant_id", instForN8n.tenant_id)
                  .eq("provider", "N8N")
                  .eq("status", "active")
                  .maybeSingle()
                  .then(({ data: n8nInt }) => {
                    if (n8nInt?.webhook_url) {
                      const phone = normalized.remote_jid?.replace(/@.*$/, "") || "";
                      fetch(n8nInt.webhook_url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          contact_phone: phone,
                          text: normalized.body || "",
                          session_id: normalized.remote_jid || "",
                          channel: "whatsapp_web",
                          instance_name: normalized.instance_name || instance,
                          message_id: normalized.message_id,
                          sender_name: normalized.sender_name || normalized.raw_payload?.senderName || "",
                          timestamp: normalized.created_at || new Date().toISOString(),
                          type: normalized.type || "text",
                          media_url: normalized.media_url || null,
                        }),
                      }).catch((e: any) => console.error("[n8n-dispatch] Error:", e.message));
                    }
                  });
              }

              // ── Automation Router: check triggers + Typebot sessions ──
              if (instForN8n?.tenant_id) {
                const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
                const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
                fetch(`${SUPABASE_URL}/functions/v1/automation-router`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
                  body: JSON.stringify({
                    tenant_id: instForN8n.tenant_id,
                    instance_name: normalized.instance_name || instance,
                    remote_jid: normalized.remote_jid,
                    contact_phone: normalized.remote_jid?.replace(/@.*$/, "") || "",
                    message_text: normalized.body || "",
                    message_type: normalized.type || "text",
                    sender_name: normalized.sender_name || "",
                  }),
                }).catch((e: any) => console.error("[automation-router-dispatch] Error:", e.message));
              }
            }
          }

          // ── CSAT detection: if incoming message is 1-5, save as rating ──
          if (normalized.direction === "incoming" && normalized.body) {
            const trimmed = String(normalized.body).trim();
            if (/^[1-5]$/.test(trimmed)) {
              const rating = parseInt(trimmed);
              const phone = normalized.remote_jid?.replace(/@.*$/, "");
              // Check if CSAT was recently sent for this contact
              const { data: instForCsat } = await supabase
                .from("whatsapp_instances")
                .select("tenant_id")
                .or(`instance_name.eq.${instance},instance_token.eq.${instance}`)
                .limit(1)
                .maybeSingle();

              if (instForCsat?.tenant_id) {
                const { data: recentCsat } = await supabase
                  .from("conversations")
                  .select("id, assigned_to")
                  .eq("tenant_id", instForCsat.tenant_id)
                  .eq("csat_sent", true)
                  .is("csat_rating", null)
                  .limit(1)
                  .maybeSingle();

                if (recentCsat) {
                  // Save CSAT rating
                  await supabase.from("csat_ratings").insert({
                    tenant_id: instForCsat.tenant_id,
                    conversation_id: recentCsat.id,
                    contact_phone: phone,
                    rating,
                    channel: "whatsapp",
                    agent_id: recentCsat.assigned_to,
                  });
                  // Update conversation
                  await supabase.from("conversations").update({ csat_rating: rating }).eq("id", recentCsat.id);
                  console.log(`uazapi-webhook: CSAT rating ${rating} from ${phone}`);
                }
              }
            }
          }

          // ── MEDIA ATTACHMENT LOG (diagnostic catcher) ──
          if (normalized.direction === "incoming" && normalized.media_url) {
            const rawMime = msg?.mimetype || msg?.content?.mimetype || msg?.message?.imageMessage?.mimetype || "unknown";
            const isViewOnce = Boolean(msg?.message?.viewOnceMessage || msg?.message?.viewOnceMessageV2 || msg?.isViewOnce || msg?.viewOnce);
            const senderPhone = normalized.remote_jid?.replace(/@.*$/, "") || "unknown";
            console.log(`🔴 [MEDIA-CATCHER] type=${normalized.type} | mime=${rawMime} | sender=${senderPhone} | viewOnce=${isViewOnce} | url=${normalized.media_url?.substring(0, 60)}...`);

            // Block viewOnce messages — they can't be downloaded
            if (isViewOnce) {
              console.warn(`[MEDIA-CATCHER] ViewOnce detected from ${senderPhone} — skipping expense pipeline`);
            }
          }

          // ── EXPENSE DETECTION: incoming image with trigger OR text trigger after image ──
          const isViewOnceMsg = Boolean(msg?.message?.viewOnceMessage || msg?.message?.viewOnceMessageV2 || msg?.isViewOnce || msg?.viewOnce);
          const isImageWithUrl = (normalized.type === "image" || normalized.type === "document") && normalized.media_url && !isViewOnceMsg;
          const isTextTrigger = normalized.type === "text" && /despesa|gasto|nota\s*fiscal|recibo|nf[-\s]?e?|comprovante/i.test(normalized.body || "");

          if (normalized.direction === "incoming" && (isImageWithUrl || isTextTrigger)) {
            try {
              // Resolve tenant_id for this instance
              const { data: instForExpense } = await supabase
                .from("whatsapp_instances")
                .select("tenant_id, instance_token, server_url, instance_name")
                .or(`instance_name.eq.${instance},instance_token.eq.${instance}`)
                .limit(1)
                .maybeSingle();
              console.log(`[expense-pipeline] Instance lookup: ${instance} → ${instForExpense?.instance_name || "NOT FOUND"} tenant=${instForExpense?.tenant_id || "NONE"}`);

              if (instForExpense?.tenant_id) {
                // Check if expense_extractor skill is active for this tenant
                const { data: licenseData } = await supabase
                  .from("licenses")
                  .select("ai_active_skills")
                  .eq("tenant_id", instForExpense.tenant_id)
                  .maybeSingle();
                const isExtractorActive = licenseData?.ai_active_skills?.expense_extractor === true;

                // Check caption trigger: must contain "despesa" or "gasto" or "nota" or "recibo"
                const captionLower = String(normalized.body || normalized.caption || "").toLowerCase();
                const hasExpenseTrigger = /despesa|gasto|nota\s*fiscal|recibo|nf[-\s]?e?|comprovante/i.test(captionLower);

                // For images with caption trigger, or images without caption (trigger checked later)
                const isDirectImageTrigger = isImageWithUrl && hasExpenseTrigger;
                // For text trigger: look for recent image from same sender (last 2 min)
                let recentImageMsg: any = null;
                if (isTextTrigger && hasExpenseTrigger && !isImageWithUrl) {
                  const twoMinAgo = new Date(Date.now() - 120_000).toISOString();
                  const { data: recentImg } = await supabase
                    .from("whatsapp_messages")
                    .select("message_id, media_url, raw_payload")
                    .eq("remote_jid", normalized.remote_jid)
                    .eq("direction", "incoming")
                    .in("type", ["image", "document"])
                    .gt("created_at", twoMinAgo)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  recentImageMsg = recentImg;
                }

                if (isExtractorActive && (isDirectImageTrigger || recentImageMsg)) {
                  const mediaUrl = isDirectImageTrigger ? normalized.media_url : recentImageMsg?.media_url;
                  const msgForMedia = isDirectImageTrigger ? msg : recentImageMsg?.raw_payload;
                  const msgId = isDirectImageTrigger ? normalized.message_id : recentImageMsg?.message_id;
                  console.log(`[expense-pipeline] Triggered for ${normalized.remote_jid} tenant=${instForExpense.tenant_id} via=${isDirectImageTrigger ? "image+caption" : "text-after-image"}`);

                  // 1. Get decrypted image URL from uazapi
                  const uazapiUrl = instForExpense.server_url || Deno.env.get("UAZAPI_BASE_URL") || "";
                  const dlRes = await fetch(`${uazapiUrl}/message/download`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", token: instForExpense.instance_token || "" },
                    body: JSON.stringify({ id: msgId, return_link: true }),
                  });
                  const dlData = dlRes.ok ? await dlRes.json() : null;
                  const imageUrl = dlData?.fileURL || dlData?.url || mediaUrl;
                  console.log(`[expense-pipeline] Image URL: ${imageUrl}`);

                  if (imageUrl) {
                    // 2. Extract expense data via Vision AI
                    const { extractExpenseData } = await import("../_shared/ai.ts");
                    const expense = await extractExpenseData(
                      imageUrl,
                      captionLower || undefined,
                      instForExpense.tenant_id,
                    );
                    console.log(`[expense-pipeline] AI extracted: ${JSON.stringify(expense)}`);

                    // 3. Save to asaas_expenses
                    const fileName = `receipt_${msgId || Date.now()}.jpg`;
                    const { error: expErr } = await supabase.from("asaas_expenses").insert({
                      tenant_id: instForExpense.tenant_id,
                      description: expense.description || `Despesa via WhatsApp — ${expense.supplier}`,
                      date: expense.date,
                      value: expense.amount,
                      category: expense.category,
                      supplier: expense.supplier,
                      attachment_url: imageUrl,
                      attachment_name: fileName,
                    });

                    if (expErr) {
                      console.error("[expense-pipeline] Insert error:", expErr.message);
                    } else {
                      console.log(`[expense-pipeline] Saved: ${expense.supplier} R$${expense.amount}`);

                      // 5. Send confirmation back via WhatsApp
                      const amt = typeof expense.amount === "number" ? expense.amount.toFixed(2) : String(expense.amount);
                      // Category icon mapping
                      const catIcons: Record<string, string> = {
                        "Transporte": "\uD83D\uDE97", "Alimentacao": "\uD83C\uDF7D", "Hospedagem": "\uD83C\uDFE8",
                        "Material": "\uD83D\uDCE6", "Servicos": "\uD83D\uDD27", "Marketing": "\uD83D\uDCE3",
                        "Tecnologia": "\uD83D\uDCBB", "Fuel and Car Care": "\u26FD",
                      };
                      const catIcon = catIcons[expense.category] || "\uD83D\uDCCB";
                      const confirmText = [
                        "\uD83E\uDDFE *Despesa Registrada*",
                        "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
                        "",
                        `\uD83C\uDFEA *Fornecedor:* ${expense.supplier}`,
                        `\uD83D\uDCC5 *Data:* ${expense.date}`,
                        `${catIcon} *Categoria:* ${expense.category}`,
                        "",
                        `\uD83D\uDCB0 *Valor total:* R$ ${amt}`,
                        "",
                        "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
                        `_\u2713 Lancamento automatico via Whatsflow_`,
                      ].join("\n");

                      if (uazapiUrl && instForExpense.instance_token) {
                        fetch(`${uazapiUrl}/send/text`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", token: instForExpense.instance_token },
                          body: JSON.stringify({
                            number: normalized.remote_jid?.replace(/@.*$/, ""),
                            text: confirmText,
                          }),
                        }).catch((e: any) => console.error("[expense-pipeline] Reply error:", e.message));
                      }
                    }
                  } else {
                    // Download failed — send feedback to user
                    console.warn(`[expense-pipeline] Media download failed for msgId=${msgId} — sending feedback`);
                    if (uazapiUrl && instForExpense.instance_token) {
                      fetch(`${uazapiUrl}/send/text`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", token: instForExpense.instance_token },
                        body: JSON.stringify({
                          number: normalized.remote_jid?.replace(/@.*$/, ""),
                          text: "⚠️ Não foi possível processar esta imagem. Por favor, envie como uma foto normal da galeria (não use visualização única nem envio por documento compactado).",
                        }),
                      }).catch((e: any) => console.error("[expense-pipeline] Feedback error:", e.message));
                    }
                  }
                }
              }
            } catch (expPipeErr: any) {
              // Non-blocking: expense pipeline failure should never break message processing
              console.error("[expense-pipeline] Error:", expPipeErr.message);
            }
          }

          // Upsert contact info from incoming messages (including profile picture)
          if (normalized.direction === "incoming" && normalized.remote_jid) {
            const contactName = msg?.senderName || msg?.pushName || msg?.verifiedBizName || null;
            if (contactName) {
              const phone = normalized.remote_jid.replace(/@.*$/, "");
              // Extract profile picture URL from various payload locations
              const profilePicUrl =
                msg?.profilePicUrl ||
                msg?.profilePictureUrl ||
                msg?.profilePic ||
                payload?.profilePicUrl ||
                payload?.sender?.profilePicUrl ||
                payload?.contact?.profilePicUrl ||
                null;

              const upsertData: Record<string, any> = {
                instance_name: instance,
                phone,
                jid: normalized.remote_jid,
                push_name: msg?.pushName || contactName,
                name: msg?.senderName || msg?.verifiedBizName || contactName,
                updated_at: new Date().toISOString(),
              };
              // Only set profile_pic_url if we have a new value (don't overwrite existing with null)
              if (profilePicUrl) upsertData.profile_pic_url = profilePicUrl;

              await supabase.from("whatsapp_contacts").upsert(
                upsertData,
                { onConflict: "instance_name,phone" }
              );
            }
          }

          // Auto-sync group to whatsapp_groups table for Kanban
          if (String(normalized.remote_jid).endsWith("@g.us")) {
            const groupSubjectVal =
              msg?.groupSubject || payload?.chat?.name || payload?.chat?.subject || null;

            // Get tenant_id from the instance
            const { data: instRow } = await supabase
              .from("whatsapp_instances")
              .select("tenant_id")
              .or(`instance_name.eq.${instance},instance_token.eq.${instance}`)
              .limit(1)
              .maybeSingle();

            if (instRow?.tenant_id) {
              // Get default kanban column for this tenant
              const { data: defaultCol } = await supabase
                .from("group_kanban_columns")
                .select("id")
                .eq("tenant_id", instRow.tenant_id)
                .eq("is_default", true)
                .limit(1)
                .maybeSingle();

              await supabase.from("whatsapp_groups").upsert(
                {
                  tenant_id: instRow.tenant_id,
                  instance_name: instance,
                  jid: normalized.remote_jid,
                  name: groupSubjectVal || undefined,
                  last_message_at: normalized.created_at || new Date().toISOString(),
                  kanban_column_id: defaultCol?.id || undefined,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "tenant_id,jid", ignoreDuplicates: false }
              ).then(({ error: groupErr }) => {
                if (groupErr) console.error("whatsapp_groups upsert error:", groupErr.message);
              });

              // Increment unread count
              await supabase.rpc("increment_group_unread", {
                p_tenant_id: instRow.tenant_id,
                p_jid: normalized.remote_jid,
              }).catch(() => {}); // best-effort — function may not exist yet
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
          const incomingMsg = msgs.find((m: AnyRecord) => !Boolean(m?.key?.fromMe ?? m?.fromMe ?? m?.sentByMe));
          const pushName = incomingMsg ? (incomingMsg.senderName || incomingMsg.pushName || null) : null;
          // Also check payload-level fields
          const contactName = leadName || pushName || payload?.senderName || payload?.pushName || chat.name || null;

          // ── TRAVA DE SESSÃO: buscar lead existente pelo chat_id + instance ──
          const { data: existingLead } = await supabase
            .from("whatsapp_leads")
            .select("id, assigned_attendant_id, lead_status, is_ticket_open, tenant_id")
            .eq("chat_id", chat.wa_chatid)
            .eq("instance_name", instance)
            .maybeSingle();

          // Máquina de estados: sessão ativa = tem atendente E não está resolvida
          const isActiveSession = existingLead?.assigned_attendant_id != null
            && existingLead?.lead_status !== "resolved";

          // Sessão resolvida que recebe nova msg = reabertura → vai pra fila
          const isReopening = existingLead?.lead_status === "resolved";

          // Resolve department from instance (device → sector mapping)
          let instanceDeptId: string | null = null;
          if (!existingLead?.department_id) {
            const { data: instDept } = await supabase
              .from("whatsapp_instances")
              .select("department_id")
              .eq("instance_name", instance)
              .maybeSingle();
            instanceDeptId = instDept?.department_id || null;
          }

          // Detect if this chat is a group/community
          const chatIsGroup = String(chat.wa_chatid || "").endsWith("@g.us");
          const chatIsCommunity = Boolean(chat.isCommunity || chat.linkedParentId);

          // ── PAYLOAD BLINDADO: NUNCA sobrescrever assignment com null ──
          await supabase.from("whatsapp_leads").upsert(
            {
              is_group: chatIsGroup,
              is_community: chatIsCommunity,
              parent_group_id: chat.linkedParentId || null,
              group_subject: chatIsGroup ? (chat.name || chat.subject || chat.wa_groupSubject || null) : null,
              instance_name: instance,
              chat_id: chat.wa_chatid,
              tenant_id: existingLead?.tenant_id || undefined,
              // Auto-assign department from instance if not already set
              department_id: existingLead?.department_id || instanceDeptId || undefined,
              // Prefer real name (pushName) over phone-number-as-name from uazapi
              lead_name: (pushName && !/^\d+$/.test(pushName)) ? pushName : (chat.lead_name && !/^\d+$/.test(chat.lead_name)) ? chat.lead_name : contactName || undefined,
              lead_full_name: (pushName && !/^\d+$/.test(pushName)) ? pushName : (chat.lead_fullName && !/^\d+$/.test(chat.lead_fullName)) ? chat.lead_fullName : contactName || undefined,
              // REGRA DE OURO: atendente no banco → MANTÉM. Sem atendente → null.
              assigned_attendant_id: isActiveSession
                ? existingLead.assigned_attendant_id
                : null,
              // Status: ativo → preserva. Reabertura → pending. Novo → pending.
              lead_status: isActiveSession
                ? existingLead.lead_status
                : isReopening
                  ? "pending"
                  : (existingLead ? existingLead.lead_status : "pending"),
              // Ticket: ativo → true. Reabertura → true. Novo → true (toda msg abre ticket).
              is_ticket_open: isActiveSession ? true : (isReopening ? true : true),
              kanban_order: chat.lead_kanbanOrder ?? 0,
              lead_tags: chat.lead_tags || existingLead?.lead_tags || [],
              updated_at: new Date().toISOString(),
            },
            { onConflict: "instance_name,chat_id" }
          );
        }

        await supabase
          .from("whatsapp_instances")
          .update({ ultimo_ping: new Date().toISOString() })
          .or(`instance_name.eq.${instance},instance_token.eq.${instance},session_id.eq.${instance}`);

        // ── Track conversation metrics (first_response_at, claimed_at) ──
        for (const msg of msgs) {
          const normalized = normalizeMessage(msg, payload, instance);
          if (!normalized?.remote_jid) continue;
          // Groups and communities are now tracked (no longer skipped)

          const isOutgoing = normalized.direction === "outgoing";
          const jid = normalized.remote_jid;

          // Get tenant_id for this instance
          const { data: instForMetrics } = await supabase
            .from("whatsapp_instances")
            .select("tenant_id")
            .or(`instance_name.eq.${instance},instance_token.eq.${instance}`)
            .limit(1)
            .maybeSingle();

          if (!instForMetrics?.tenant_id) continue;

          // Upsert conversation tracking
          const now = new Date().toISOString();
          const convData: Record<string, unknown> = {
            tenant_id: instForMetrics.tenant_id,
            channel: "whatsapp",
            status: "open",
            last_message_at: now,
            updated_at: now,
          };

          if (isOutgoing) {
            // Agent responded — set first_response_at if not set
            const { data: existingConv } = await supabase
              .from("conversations")
              .select("id, first_response_at, claimed_at")
              .eq("tenant_id", instForMetrics.tenant_id)
              .eq("channel", "whatsapp")
              .limit(1)
              .maybeSingle();

            if (existingConv) {
              const updates: Record<string, unknown> = { last_message_at: now };
              if (!existingConv.first_response_at) updates.first_response_at = now;
              if (!existingConv.claimed_at) updates.claimed_at = now;
              await supabase.from("conversations").update(updates).eq("id", existingConv.id);
            }
          }
        }

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

        // ── TRAVA DE SESSÃO (mesmo padrão do evento messages) ──
        const { data: existingLeadForEvent } = await supabase
          .from("whatsapp_leads")
          .select("id, assigned_attendant_id, lead_status, is_ticket_open, tenant_id")
          .eq("chat_id", lead.wa_chatid)
          .eq("instance_name", instance)
          .maybeSingle();

        const isLeadActive = existingLeadForEvent?.assigned_attendant_id != null
          && existingLeadForEvent?.lead_status !== "resolved";

        // ── PAYLOAD BLINDADO ──
        await supabase.from("whatsapp_leads").upsert(
          {
            instance_name: instance,
            chat_id: lead.wa_chatid,
            tenant_id: existingLeadForEvent?.tenant_id || undefined,
            lead_name: lead.lead_name,
            lead_full_name: lead.lead_fullName,
            // REGRA DE OURO: atendente no banco → MANTÉM
            assigned_attendant_id: isLeadActive
              ? existingLeadForEvent.assigned_attendant_id
              : null,
            lead_status: isLeadActive
              ? existingLeadForEvent.lead_status
              : (lead.lead_status || "pending"),
            is_ticket_open: isLeadActive
              ? true
              : (lead.lead_isTicketOpen ?? existingLeadForEvent?.is_ticket_open ?? false),
            kanban_order: lead.lead_kanbanOrder,
            lead_tags: lead.lead_tags || [],
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
