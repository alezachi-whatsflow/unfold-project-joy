import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import { config } from "../config.js";
import { createClient } from "@supabase/supabase-js";

// ══════════════════════════════════════════════════════════════
// OBS:ALERTER — Proactive system health notifier
// Runs every 1 minute, reads nexus_health_snapshot,
// evaluates thresholds, sends alerts via WhatsApp/Slack webhook.
// Anti-spam: 15-minute cooldown per alert level via Redis TTL.
// ══════════════════════════════════════════════════════════════

// ── CONFIG ───────────────────────────────────────────────────

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || "";
const ALERT_WHATSAPP_NUMBER = process.env.ALERT_WHATSAPP_NUMBER || "";
const ALERT_COOLDOWN_SECONDS = 900; // 15 minutes

// Thresholds
const THRESHOLDS = {
  WARNING: {
    error_rate_1m: 5,          // ≥ 5 errors per minute
    disconnected_pct: 10,     // ≥ 10% instances disconnected
    dlq_size: 50,             // ≥ 50 dead letters
    open_tickets: 10,         // ≥ 10 open tickets
  },
  CRITICAL: {
    error_rate_1m: 20,         // ≥ 20 errors per minute
    disconnected_pct: 30,     // ≥ 30% instances offline
    dlq_size: 200,            // ≥ 200 dead letters
    blocked_licenses: 5,      // ≥ 5 licenses blocked
  },
} as const;

// ── TYPES ────────────────────────────────────────────────────

type AlertLevel = "ok" | "warning" | "critical";

interface HealthSnapshot {
  total_licenses: number;
  active_licenses: number;
  mrr_total: number;
  inactive_licenses: number;
  blocked_licenses: number;
  expiring_30d: number;
  critical_15d: number;
  total_instances: number;
  connected_instances: number;
  disconnected_instances: number;
  no_webhook_instances: number;
  open_tickets: number;
  error_rate_1m: number;
  dlq_size: number;
  whitelabel_count: number;
  snapshot_at: string;
}

// ── SUPABASE + REDIS ─────────────────────────────────────────

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

const redisOpts = {
  host: config.redis.core.host,
  port: config.redis.core.port,
  password: config.redis.core.password,
  family: config.redis.core.family,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// ── CORE LOGIC ───────────────────────────────────────────────

async function getHealthSnapshot(): Promise<HealthSnapshot | null> {
  const { data, error } = await supabase
    .from("nexus_health_snapshot")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[obs-alerter] Snapshot read error:", error.message);
    return null;
  }
  return data as HealthSnapshot;
}

function evaluateHealth(snap: HealthSnapshot): {
  level: AlertLevel;
  reasons: string[];
} {
  const reasons: string[] = [];
  let level: AlertLevel = "ok";

  const disconnectedPct =
    snap.total_instances > 0
      ? (snap.disconnected_instances / snap.total_instances) * 100
      : 0;

  // ── CRITICAL checks (override warning) ──
  if (snap.error_rate_1m >= THRESHOLDS.CRITICAL.error_rate_1m) {
    level = "critical";
    reasons.push(`Erros/min: ${snap.error_rate_1m} (limite: ${THRESHOLDS.CRITICAL.error_rate_1m})`);
  }
  if (disconnectedPct >= THRESHOLDS.CRITICAL.disconnected_pct) {
    level = "critical";
    reasons.push(`Instancias offline: ${snap.disconnected_instances}/${snap.total_instances} (${disconnectedPct.toFixed(0)}%)`);
  }
  if (snap.dlq_size >= THRESHOLDS.CRITICAL.dlq_size) {
    level = "critical";
    reasons.push(`DLQ: ${snap.dlq_size} mensagens mortas (limite: ${THRESHOLDS.CRITICAL.dlq_size})`);
  }
  if (snap.blocked_licenses >= THRESHOLDS.CRITICAL.blocked_licenses) {
    level = "critical";
    reasons.push(`Licencas bloqueadas: ${snap.blocked_licenses}`);
  }

  // ── WARNING checks (only if not already critical) ──
  if (level !== "critical") {
    if (snap.error_rate_1m >= THRESHOLDS.WARNING.error_rate_1m) {
      level = "warning";
      reasons.push(`Erros/min: ${snap.error_rate_1m} (limite: ${THRESHOLDS.WARNING.error_rate_1m})`);
    }
    if (disconnectedPct >= THRESHOLDS.WARNING.disconnected_pct) {
      level = "warning";
      reasons.push(`Instancias offline: ${disconnectedPct.toFixed(0)}%`);
    }
    if (snap.dlq_size >= THRESHOLDS.WARNING.dlq_size) {
      level = "warning";
      reasons.push(`DLQ: ${snap.dlq_size} mensagens`);
    }
    if (snap.open_tickets >= THRESHOLDS.WARNING.open_tickets) {
      level = "warning";
      reasons.push(`Tickets abertos: ${snap.open_tickets}`);
    }
  }

  return { level, reasons };
}

// ── ANTI-SPAM (Redis TTL cooldown) ───────────────────────────

async function shouldSendAlert(level: AlertLevel): Promise<boolean> {
  if (level === "ok") return false;

  const redis = new Redis(redisOpts);
  try {
    const key = `obs:alert:cooldown:${level}`;
    const exists = await redis.exists(key);
    if (exists) return false; // Still in cooldown

    // Set cooldown
    await redis.setex(key, ALERT_COOLDOWN_SECONDS, "1");
    return true;
  } finally {
    redis.disconnect();
  }
}

// ── NOTIFICATION DISPATCH ────────────────────────────────────

function formatAlertMessage(
  level: AlertLevel,
  snap: HealthSnapshot,
  reasons: string[]
): string {
  const icon = level === "critical" ? "CRITICO" : "ATENCAO";
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return [
    `*[NEXUS ALERT] ${icon}*`,
    `Horario: ${now}`,
    ``,
    `*Resumo:*`,
    ...reasons.map((r) => `- ${r}`),
    ``,
    `*Metricas:*`,
    `Licencas ativas: ${snap.active_licenses}/${snap.total_licenses}`,
    `MRR: R$ ${Number(snap.mrr_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    `Instancias: ${snap.connected_instances}/${snap.total_instances} online`,
    `Tickets abertos: ${snap.open_tickets}`,
    `Erros/min: ${snap.error_rate_1m}`,
    `DLQ: ${snap.dlq_size}`,
    ``,
    `_Whatsflow Nexus - Torre de Controle_`,
  ].join("\n");
}

async function sendSlackWebhook(message: string, level: AlertLevel) {
  if (!ALERT_WEBHOOK_URL) return;

  try {
    const color = level === "critical" ? "#dc2626" : "#f59e0b";
    await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [
          {
            color,
            text: message.replace(/\*/g, "*"), // Slack uses same bold
            fallback: `[NEXUS] ${level.toUpperCase()} alert`,
          },
        ],
      }),
    });
    console.log(`[obs-alerter] Slack webhook sent (${level})`);
  } catch (e) {
    console.error("[obs-alerter] Slack webhook error:", (e as Error).message);
  }
}

async function sendWhatsAppAlert(message: string) {
  if (!ALERT_WHATSAPP_NUMBER) return;

  try {
    await fetch(`${config.uazapi.baseUrl}/send/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        token: config.uazapi.adminToken,
      },
      body: JSON.stringify({
        number: ALERT_WHATSAPP_NUMBER,
        text: message,
      }),
    });
    console.log(`[obs-alerter] WhatsApp alert sent to ${ALERT_WHATSAPP_NUMBER}`);
  } catch (e) {
    console.error("[obs-alerter] WhatsApp send error:", (e as Error).message);
  }
}

// ── MAIN ALERT FUNCTION ──────────────────────────────────────

async function checkAndAlert() {
  const snap = await getHealthSnapshot();
  if (!snap) {
    console.warn("[obs-alerter] No health snapshot available — skipping");
    return;
  }

  const { level, reasons } = evaluateHealth(snap);

  if (level === "ok") {
    console.log(
      `[obs-alerter] OK | instances: ${snap.connected_instances}/${snap.total_instances} | ` +
      `errs: ${snap.error_rate_1m} | dlq: ${snap.dlq_size}`
    );
    return;
  }

  const canSend = await shouldSendAlert(level);
  if (!canSend) {
    console.log(`[obs-alerter] ${level.toUpperCase()} detected but in cooldown (15min)`);
    return;
  }

  const message = formatAlertMessage(level, snap, reasons);

  // Dispatch both channels in parallel
  await Promise.allSettled([
    sendSlackWebhook(message, level),
    sendWhatsAppAlert(message),
  ]);

  // Log the alert to nexus_audit_logs
  await supabase.from("nexus_audit_logs").insert({
    actor_id: null,
    actor_role: "system",
    action: `alert_${level}`,
    target_entity: "system_health",
    old_value: null,
    new_value: { level, reasons, snapshot_at: snap.snapshot_at },
  });
}

// ── WORKER SETUP ─────────────────────────────────────────────

export function startObsAlerter() {
  const alertQueue = new Queue("obs:alerter", {
    connection: redisOpts,
    defaultJobOptions: {
      removeOnComplete: { age: 300, count: 5 },
      removeOnFail: { age: 3600, count: 10 },
    },
  });

  // Schedule: every 1 minute
  alertQueue.add(
    "check-health",
    {},
    {
      repeat: { pattern: "*/1 * * * *" },
      jobId: "obs-alerter-repeat",
    }
  );

  const worker = new Worker(
    "obs:alerter",
    async () => {
      await checkAndAlert();
    },
    {
      connection: redisOpts,
      concurrency: 1,
    }
  );

  worker.on("failed", (job, err) => {
    console.error("[obs-alerter] Job failed:", err.message);
  });

  console.log("[obs-alerter] Started — monitoring health every 1 minute (cooldown: 15min)");

  return { worker, queue: alertQueue };
}
