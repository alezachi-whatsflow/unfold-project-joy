import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

// ══════════════════════════════════════════════════════════════
// CATCH-UP SERVICE — Idempotent message recovery
//
// Called when:
//   1. Heartbeat detects a stale instance coming back alive
//   2. Webhook receives "connected" event after >5min offline
//
// Uses: upsert_recovered_message() SQL function with
//       ON CONFLICT (message_id) DO NOTHING for deduplication.
// ══════════════════════════════════════════════════════════════

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

interface Instance {
  id: string;
  instance_name: string;
  instance_token: string;
  server_url: string;
  tenant_id: string;
}

interface RecoveryResult {
  fetched: number;
  recovered: number;
  duplicates: number;
  errors: number;
  duration_ms: number;
}

// ── FETCH MESSAGES FROM UAZAPI ───────────────────────────────

async function fetchRecentMessages(inst: Instance, count: number = 50): Promise<any[]> {
  const baseUrl = inst.server_url || config.uazapi.baseUrl;

  // Strategy 1: /chat/messages
  try {
    const res = await fetch(`${baseUrl}/chat/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: inst.instance_token },
      body: JSON.stringify({ count, offset: 0 }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      const msgs = Array.isArray(data) ? data : data?.messages || data?.data || [];
      if (msgs.length > 0) return msgs;
    }
  } catch {}

  // Strategy 2: /message/list (fallback)
  try {
    const res = await fetch(`${baseUrl}/message/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: inst.instance_token },
      body: JSON.stringify({ count }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data?.messages || data?.data || [];
    }
  } catch {}

  return [];
}

// ── NORMALIZE MESSAGE FIELDS ─────────────────────────────────

function normalizeType(raw: string | undefined): string {
  if (!raw) return "text";
  const t = raw.toLowerCase();
  if (t.includes("image")) return "image";
  if (t.includes("video") || t === "ptv") return "video";
  if (t.includes("audio") || t === "ptt") return "audio";
  if (t.includes("document")) return "document";
  if (t.includes("sticker")) return "sticker";
  return "text";
}

function extractTimestamp(msg: any): Date | null {
  const ts = msg.messageTimestamp || msg.timestamp || msg.date;
  if (!ts) return null;
  if (typeof ts === "number") return new Date(ts > 1e12 ? ts : ts * 1000);
  return new Date(String(ts));
}

// ── IDEMPOTENT INSERT VIA RPC ────────────────────────────────

async function insertIdempotent(
  supabase: SupabaseClient,
  inst: Instance,
  msg: any
): Promise<"inserted" | "duplicate" | "error"> {
  const msgId = msg.key?.id || msg.id || msg.messageid || msg.messageId;
  if (!msgId) return "error";

  const remoteJid = msg.key?.remoteJid || msg.remoteJid || msg.chatid || msg.from;
  if (!remoteJid) return "error";

  const fromMe = msg.key?.fromMe ?? msg.fromMe ?? false;
  const body =
    msg.body || msg.text || msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text || msg.caption || null;
  const rawType = msg.messageType || msg.type || "";
  const msgDate = extractTimestamp(msg) || new Date();

  const { data, error } = await supabase.rpc("upsert_recovered_message", {
    p_instance_name: inst.instance_name,
    p_remote_jid: remoteJid,
    p_message_id: msgId,
    p_direction: fromMe ? "outgoing" : "incoming",
    p_type: normalizeType(rawType),
    p_body: body,
    p_media_url: msg.mediaUrl || msg.media?.url || null,
    p_caption: msg.caption || null,
    p_status: fromMe ? 1 : 3,
    p_raw_payload: msg,
    p_tenant_id: inst.tenant_id,
    p_created_at: msgDate.toISOString(),
  });

  if (error) {
    if (error.code === "23505") return "duplicate"; // Unique violation
    console.error(`[catchup] Insert error for ${msgId}:`, error.message);
    return "error";
  }

  return data === true ? "inserted" : "duplicate";
}

// ── MAIN CATCH-UP FUNCTION ───────────────────────────────────

export async function performCatchUp(
  inst: Instance,
  windowMinutes: number = 120
): Promise<RecoveryResult> {
  const start = Date.now();
  const result: RecoveryResult = {
    fetched: 0,
    recovered: 0,
    duplicates: 0,
    errors: 0,
    duration_ms: 0,
  };

  // 1. Fetch messages from uazapi
  const messages = await fetchRecentMessages(inst, 50);
  result.fetched = messages.length;

  if (messages.length === 0) {
    result.duration_ms = Date.now() - start;
    return result;
  }

  // 2. Filter by time window
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

  for (const msg of messages) {
    const msgDate = extractTimestamp(msg);
    if (msgDate && msgDate < cutoff) continue; // Too old, skip

    const status = await insertIdempotent(supabase, inst, msg);

    switch (status) {
      case "inserted":
        result.recovered++;
        break;
      case "duplicate":
        result.duplicates++;
        break;
      case "error":
        result.errors++;
        break;
    }
  }

  // 3. Update catch-up timestamp
  await supabase
    .from("whatsapp_instances")
    .update({ last_catchup_at: new Date().toISOString() })
    .eq("id", inst.id);

  result.duration_ms = Date.now() - start;

  console.log(
    `[catchup] ${inst.instance_name}: fetched=${result.fetched} recovered=${result.recovered} ` +
    `dupes=${result.duplicates} errors=${result.errors} ${result.duration_ms}ms`
  );

  return result;
}
