import { Worker, Queue } from "bullmq";
import { config } from "../config.js";
import { createClient } from "@supabase/supabase-js";

// ══════════════════════════════════════════════════════════════
// INSTANCE HEARTBEAT — Keep WhatsApp instances alive 24/7
//
// Problem: When no frontend is open, uazapiGO WebSocket sleeps.
//          Messages arriving during sleep are lost (no webhook).
//
// Solution: Every 3 minutes, ping all connected instances via
//           /instance/status endpoint. This keeps the WebSocket
//           alive server-side, independent of any browser tab.
//
// Bonus:   If an instance is found stale (ultimo_ping > 10 min
//          but status still "connected"), force a presence refresh
//          which often reactivates the socket.
//
// Catch-up: On reconnection events, fetch recent messages from
//           uazapi to recover anything missed during downtime.
// ══════════════════════════════════════════════════════════════

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

const redisOpts = {
  host: config.redis.core.host,
  port: config.redis.core.port,
  password: config.redis.core.password,
  family: config.redis.core.family,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// ── CONFIG ───────────────────────────────────────────────────

const PING_INTERVAL_CRON = "*/3 * * * *"; // Every 3 minutes
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes without ping = stale
const CATCHUP_WINDOW_MINUTES = 120; // Fetch last 2 hours on reconnect

// ── TYPES ────────────────────────────────────────────────────

interface Instance {
  id: string;
  instance_name: string;
  instance_token: string;
  server_url: string;
  status: string;
  ultimo_ping: string | null;
  tenant_id: string;
}

// ── HEARTBEAT: Ping all connected instances ──────────────────

async function pingInstance(inst: Instance): Promise<"alive" | "stale" | "dead" | "error"> {
  const baseUrl = inst.server_url || config.uazapi.baseUrl;

  try {
    // 1. Check status via API
    const statusRes = await fetch(`${baseUrl}/instance/status`, {
      method: "GET",
      headers: { token: inst.instance_token },
      signal: AbortSignal.timeout(8000), // 8s timeout
    });

    if (!statusRes.ok) {
      console.warn(`[heartbeat] ${inst.instance_name}: status ${statusRes.status}`);
      return "dead";
    }

    const statusData = await statusRes.json();
    const apiStatus = statusData?.status || statusData?.state || "unknown";

    // 2. If API says connected, refresh presence to keep socket alive
    if (apiStatus === "connected" || apiStatus === "open") {
      // Lightweight presence ping — keeps WebSocket from sleeping
      fetch(`${baseUrl}/instance/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: inst.instance_token },
        body: JSON.stringify({ presence: "available" }),
      }).catch(() => {}); // Fire and forget

      // Update ultimo_ping in DB
      await supabase
        .from("whatsapp_instances")
        .update({ ultimo_ping: new Date().toISOString(), status: "connected" })
        .eq("id", inst.id);

      return "alive";
    }

    // 3. If API says disconnected but DB says connected → mark as disconnected
    if (apiStatus === "disconnected" || apiStatus === "close") {
      await supabase
        .from("whatsapp_instances")
        .update({
          status: "disconnected",
          last_disconnect: new Date().toISOString(),
          last_disconnect_reason: "heartbeat_detected_offline",
        })
        .eq("id", inst.id);

      return "dead";
    }

    return "stale";
  } catch (e) {
    const msg = (e as Error).message;
    // Timeout or network error
    if (msg.includes("timeout") || msg.includes("abort")) {
      console.warn(`[heartbeat] ${inst.instance_name}: timeout (8s) — marking stale`);
    } else {
      console.error(`[heartbeat] ${inst.instance_name}: ${msg}`);
    }
    return "error";
  }
}

// ── STALE DETECTION: Find instances that stopped pinging ─────

async function detectStaleInstances(instances: Instance[]): Promise<Instance[]> {
  const now = Date.now();
  return instances.filter((inst) => {
    if (!inst.ultimo_ping) return true; // Never pinged
    const lastPing = new Date(inst.ultimo_ping).getTime();
    return now - lastPing > STALE_THRESHOLD_MS;
  });
}

// ── CATCH-UP: Recover missed messages after reconnection ─────

async function catchUpMessages(inst: Instance): Promise<number> {
  const baseUrl = inst.server_url || config.uazapi.baseUrl;

  try {
    // Fetch recent messages from uazapi history endpoint
    const res = await fetch(`${baseUrl}/chat/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: inst.instance_token },
      body: JSON.stringify({
        count: 100, // Last 100 messages
        offset: 0,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      // Try alternative endpoint
      const altRes = await fetch(`${baseUrl}/message/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: inst.instance_token },
        body: JSON.stringify({ count: 100 }),
        signal: AbortSignal.timeout(15000),
      });

      if (!altRes.ok) {
        console.warn(`[heartbeat] ${inst.instance_name}: catch-up endpoints unavailable`);
        return 0;
      }

      const altData = await altRes.json();
      return await processRecoveredMessages(inst, altData);
    }

    const data = await res.json();
    return await processRecoveredMessages(inst, data);
  } catch (e) {
    console.warn(`[heartbeat] ${inst.instance_name}: catch-up error: ${(e as Error).message}`);
    return 0;
  }
}

async function processRecoveredMessages(inst: Instance, apiData: any): Promise<number> {
  const messages = Array.isArray(apiData) ? apiData : apiData?.messages || apiData?.data || [];
  if (!messages.length) return 0;

  const cutoff = new Date(Date.now() - CATCHUP_WINDOW_MINUTES * 60 * 1000);
  let recovered = 0;

  for (const msg of messages) {
    // Extract message timestamp
    const ts = msg.messageTimestamp || msg.timestamp || msg.date;
    if (!ts) continue;

    const msgDate = new Date(typeof ts === "number" ? (ts > 1e12 ? ts : ts * 1000) : ts);
    if (msgDate < cutoff) continue; // Too old

    // Extract message ID
    const msgId = msg.key?.id || msg.id || msg.messageid || msg.messageId;
    if (!msgId) continue;

    // Check if message already exists in DB
    const { data: existing } = await supabase
      .from("whatsapp_messages")
      .select("id")
      .eq("message_id", msgId)
      .maybeSingle();

    if (existing) continue; // Already have it

    // Build normalized message for insert
    const remoteJid = msg.key?.remoteJid || msg.remoteJid || msg.chatid || msg.from;
    const fromMe = msg.key?.fromMe ?? msg.fromMe ?? false;
    const body =
      msg.body || msg.text || msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text || msg.caption || null;
    const type = msg.messageType || msg.type || "text";

    const { error } = await supabase.from("whatsapp_messages").insert({
      instance_name: inst.instance_name,
      remote_jid: remoteJid,
      message_id: msgId,
      direction: fromMe ? "outgoing" : "incoming",
      type: type.toLowerCase().includes("image") ? "image" :
            type.toLowerCase().includes("video") ? "video" :
            type.toLowerCase().includes("audio") ? "audio" :
            type.toLowerCase().includes("document") ? "document" : "text",
      body,
      media_url: msg.mediaUrl || msg.media?.url || null,
      caption: msg.caption || null,
      status: fromMe ? 1 : 3,
      raw_payload: msg,
      tenant_id: inst.tenant_id,
      created_at: msgDate.toISOString(),
    });

    if (!error) recovered++;
  }

  return recovered;
}

// ── MAIN HEARTBEAT FUNCTION ──────────────────────────────────

async function heartbeat() {
  const start = Date.now();

  // Fetch all instances that should be alive
  const { data: instances, error } = await supabase
    .from("whatsapp_instances")
    .select("id, instance_name, instance_token, server_url, status, ultimo_ping, tenant_id")
    .not("instance_token", "is", null)
    .neq("instance_token", "");

  if (error || !instances?.length) {
    console.log(`[heartbeat] No instances to check (${error?.message || "0 found"})`);
    return;
  }

  const results = { alive: 0, stale: 0, dead: 0, error: 0, recovered: 0 };

  // Detect stale instances first
  const staleInstances = await detectStaleInstances(
    instances.filter((i) => i.status === "connected")
  );

  if (staleInstances.length > 0) {
    console.warn(`[heartbeat] ${staleInstances.length} stale instances detected (>10min without ping)`);
  }

  // Ping all instances with tokens (parallel, max 10 concurrent)
  const BATCH_SIZE = 10;
  for (let i = 0; i < instances.length; i += BATCH_SIZE) {
    const batch = instances.slice(i, i + BATCH_SIZE);
    const pingResults = await Promise.allSettled(
      batch.map(async (inst) => {
        const result = await pingInstance(inst);
        results[result]++;

        // If instance was dead/stale and is now alive, run catch-up
        const wasStale = staleInstances.some((s) => s.id === inst.id);
        if (wasStale && result === "alive") {
          const recovered = await catchUpMessages(inst);
          results.recovered += recovered;
          if (recovered > 0) {
            console.log(`[heartbeat] ${inst.instance_name}: recovered ${recovered} missed messages`);
          }
        }

        return result;
      })
    );
  }

  const duration = Date.now() - start;
  const statusIcon =
    results.dead > 0 ? "🔴" :
    results.stale > 0 ? "🟡" :
    "🟢";

  console.log(
    `[heartbeat] ${statusIcon} ${instances.length} instances | ` +
    `alive:${results.alive} stale:${results.stale} dead:${results.dead} err:${results.error} | ` +
    `recovered:${results.recovered} msgs | ${duration}ms`
  );

  // Persist heartbeat summary to metrics
  await supabase.from("nexus_system_metrics").upsert([
    { metric_key: "heartbeat_alive", metric_value: results.alive, bucket_at: new Date().toISOString() },
    { metric_key: "heartbeat_dead", metric_value: results.dead, bucket_at: new Date().toISOString() },
    { metric_key: "heartbeat_recovered", metric_value: results.recovered, bucket_at: new Date().toISOString() },
  ], { onConflict: "metric_key,bucket_at" }).catch(() => {});
}

// ── WORKER SETUP ─────────────────────────────────────────────

export function startInstanceHeartbeat() {
  const hbQueue = new Queue("obs:heartbeat", {
    connection: redisOpts,
    defaultJobOptions: {
      removeOnComplete: { age: 300, count: 5 },
      removeOnFail: { age: 3600, count: 10 },
    },
  });

  // Schedule: every 3 minutes
  hbQueue.add(
    "ping-instances",
    {},
    {
      repeat: { pattern: PING_INTERVAL_CRON },
      jobId: "instance-heartbeat-repeat",
    }
  );

  const worker = new Worker(
    "obs:heartbeat",
    async () => {
      await heartbeat();
    },
    {
      connection: redisOpts,
      concurrency: 1,
    }
  );

  worker.on("failed", (job, err) => {
    console.error("[heartbeat] Job failed:", err.message);
  });

  console.log("[heartbeat] Started — pinging instances every 3 minutes");

  return { worker, queue: hbQueue };
}
