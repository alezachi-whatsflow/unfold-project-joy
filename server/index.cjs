/**
 * Express server for Railway deployment.
 * Serves static files (Vite build) AND exposes webhook endpoints
 * so we don't depend on Supabase Edge Functions.
 */
const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 8080;

// Supabase client with service role (for server-side operations)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://supabase.whatsflow.com.br";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "dummy";
let supabase = null;
try {
  if (SUPABASE_KEY && SUPABASE_KEY !== "dummy") {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.warn("[server] No Supabase key found — webhook will not save to DB");
  }
} catch (e) {
  console.warn("[server] Supabase init error:", e.message);
}

// Parse JSON bodies (webhooks send JSON)
app.use(express.json({ limit: "10mb" }));

// ════════════════════════════════════════════════════
// WEBHOOK: uazapi — receives all WhatsApp events
// ════════════════════════════════════════════════════
app.post("/api/webhook/uazapi", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload) return res.status(200).json({ ok: true });
    if (!supabase) return res.status(200).json({ ok: true, warn: "no db connection" });

    const event = payload.event || null;
    const instance = payload.instance || payload.instanceName || null;
    const data = payload.data || payload;

    console.log(`[webhook] event=${event} instance=${instance}`);

    // ── Connection events ──
    if (event === "connection" || event === "connection.update") {
      await handleConnection(instance, data, payload);
      return res.status(200).json({ ok: true });
    }

    // ── Message events ──
    if (event === "messages" || event === "messages.upsert" || !event) {
      const msgs = Array.isArray(data) ? data : data?.messages || [data];
      for (const msg of msgs) {
        await handleMessage(instance, msg, payload);
      }
      return res.status(200).json({ ok: true });
    }

    // ── Status update events ──
    if (["messages_update", "messages.update", "message_ack", "ack", "message_status", "status"].includes(event)) {
      const updates = Array.isArray(data) ? data : [data];
      for (const upd of updates) {
        await handleStatusUpdate(instance, upd);
      }
      return res.status(200).json({ ok: true });
    }

    // ── No-event status updates (fallback) ──
    if (!event && (payload.ack !== undefined || (payload.id && payload.status !== undefined))) {
      await handleStatusUpdate(instance, payload);
      return res.status(200).json({ ok: true });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[webhook] Error:", err.message);
    res.status(200).json({ ok: true, error: err.message }); // Always 200 to prevent retries
  }
});

// ════════════════════════════════════════════════════
// WEBHOOK HANDLERS
// ════════════════════════════════════════════════════

async function handleConnection(instance, data, payload) {
  const instData = data || payload;
  const status = instData?.status || instData?.state || null;
  if (!instance || !status) return;

  const updateData = { status: status === "open" || status === "connected" ? "connected" : "disconnected" };
  if (instData?.profileName) updateData.profile_name = instData.profileName;
  if (instData?.profilePicUrl) updateData.profile_pic_url = instData.profilePicUrl;
  if (instData?.phoneNumber) updateData.phone_number = instData.phoneNumber;

  await supabase.from("whatsapp_instances")
    .update(updateData)
    .or(`instance_name.eq.${instance},instance_token.eq.${instance}`);

  console.log(`[webhook] Connection: ${instance} → ${updateData.status}`);
}

async function handleMessage(instance, msg, payload) {
  if (!msg || !instance) return;

  const remoteJid = msg?.key?.remoteJid || msg?.remoteJid || msg?.from || msg?.chatId || null;
  if (!remoteJid) return;

  const fromMe = msg?.key?.fromMe ?? msg?.fromMe ?? false;
  const rawMessageId = msg?.key?.id || msg?.id?.id || msg?.messageId || msg?.id || null;
  const messageId = normalizeMessageId(rawMessageId);
  if (!messageId) return;

  // Extract message content
  const textMsg = msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || msg?.body || msg?.text || null;
  const imageMsg = msg?.message?.imageMessage;
  const videoMsg = msg?.message?.videoMessage;
  const audioMsg = msg?.message?.audioMessage;
  const docMsg = msg?.message?.documentMessage;
  const stickerMsg = msg?.message?.stickerMessage;

  let type = "text";
  let body = textMsg;
  let mediaUrl = null;
  let captionVal = null;

  if (imageMsg) { type = "image"; captionVal = imageMsg.caption; mediaUrl = imageMsg.url; }
  else if (videoMsg) { type = "video"; captionVal = videoMsg.caption; mediaUrl = videoMsg.url; }
  else if (audioMsg || msg?.message?.pttMessage) { type = msg?.message?.pttMessage ? "ptt" : "audio"; mediaUrl = (audioMsg || msg?.message?.pttMessage)?.url; }
  else if (docMsg) { type = "document"; captionVal = docMsg.caption || docMsg.fileName; mediaUrl = docMsg.url; }
  else if (stickerMsg) { type = "sticker"; mediaUrl = stickerMsg.url; }

  // Get tenant_id from instance
  const { data: instRow } = await supabase
    .from("whatsapp_instances")
    .select("tenant_id")
    .or(`instance_name.eq.${instance},instance_token.eq.${instance}`)
    .limit(1)
    .maybeSingle();

  const tenantId = instRow?.tenant_id || null;

  // Determine status
  const statusNum = fromMe ? 2 : 4; // outgoing=delivered, incoming=received

  // Upsert message
  const { error } = await supabase.from("whatsapp_messages").upsert({
    instance_name: instance,
    remote_jid: remoteJid,
    message_id: messageId,
    direction: fromMe ? "outgoing" : "incoming",
    type,
    body: body || captionVal,
    media_url: mediaUrl,
    caption: captionVal,
    status: statusNum,
    sender_name: msg?.pushName || msg?.senderName || null,
    tenant_id: tenantId,
    raw_payload: msg,
  }, { onConflict: "message_id" });

  if (error && !error.message?.includes("duplicate")) {
    console.warn("[webhook] Message upsert error:", error.message);
  }

  // Upsert contact
  if (!fromMe && remoteJid) {
    const contactName = msg?.senderName || msg?.pushName || msg?.verifiedBizName || null;
    if (contactName) {
      const phone = remoteJid.replace(/@.*$/, "");
      const profilePicUrl = msg?.profilePicUrl || msg?.profilePictureUrl || payload?.sender?.profilePicUrl || null;
      const upsertData = {
        instance_name: instance,
        phone,
        jid: remoteJid,
        push_name: msg?.pushName || contactName,
        name: msg?.senderName || msg?.verifiedBizName || contactName,
        updated_at: new Date().toISOString(),
      };
      if (profilePicUrl) upsertData.profile_pic_url = profilePicUrl;
      await supabase.from("whatsapp_contacts").upsert(upsertData, { onConflict: "instance_name,phone" });
    }
  }

  // Auto-create lead
  if (!fromMe && remoteJid && !remoteJid.endsWith("@g.us")) {
    const { data: existingLead } = await supabase
      .from("whatsapp_leads")
      .select("id")
      .eq("chat_id", remoteJid)
      .maybeSingle();

    if (!existingLead) {
      await supabase.from("whatsapp_leads").insert({
        chat_id: remoteJid,
        instance_name: instance,
        lead_name: msg?.pushName || msg?.senderName || remoteJid.replace(/@.*$/, ""),
        lead_status: "open",
        tenant_id: tenantId,
      }).then(() => {});
    }
  }

  console.log(`[webhook] Message: ${fromMe ? "OUT" : "IN"} ${type} from ${remoteJid} (${messageId})`);
}

async function handleStatusUpdate(instance, upd) {
  const rawMessageId = upd?.key?.id || upd?.update?.key?.id || upd?.id?.id || upd?.messageid || upd?.messageId || upd?.id || null;
  const messageId = normalizeMessageId(rawMessageId);
  if (!messageId) return;

  const statusKey = upd?.update?.status ?? upd?.status ?? upd?.ack ?? upd?.chatMessageStatusCode ?? upd?.messageStatus ?? null;
  const newStatus = toMessageStatus(statusKey);
  if (newStatus === undefined) return;

  await supabase.from("whatsapp_messages")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("message_id", String(messageId));

  console.log(`[webhook] Status: ${messageId} → ${newStatus}`);
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function normalizeMessageId(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const withoutJidPrefix = raw.replace(/^\d+:/, "").replace(/^(true|false)_/i, "");
  const parts = withoutJidPrefix.split("_");
  const tail = parts[parts.length - 1];
  if (parts.length > 1 && /^[A-Za-z0-9]{10,}$/.test(tail)) return tail;
  return withoutJidPrefix;
}

const STATUS_MAP = {
  ERROR: 0, PENDING: 0, SERVER_ACK: 1, SENT: 1,
  DELIVERY_ACK: 2, DELIVERED: 2, READ: 3, PLAYED: 3,
};

function toMessageStatus(val) {
  if (val === null || val === undefined) return undefined;
  const s = String(val).toUpperCase();
  if (STATUS_MAP[s] !== undefined) return STATUS_MAP[s];
  const n = Number(val);
  if (!isNaN(n)) {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    if (n === 2) return 2;
    return 3;
  }
  return undefined;
}

// ════════════════════════════════════════════════════
// STATIC FILES (Vite build)
// ════════════════════════════════════════════════════
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

// SPA fallback: all non-API routes serve index.html
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  if (req.method === "GET" && req.accepts("html")) {
    return res.sendFile(path.join(distPath, "index.html"));
  }
  next();
});

// ════════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`[server] Whatsflow running on port ${PORT}`);
  console.log(`[server] Webhook: POST /api/webhook/uazapi`);
  console.log(`[server] Static: ${distPath}`);
});
