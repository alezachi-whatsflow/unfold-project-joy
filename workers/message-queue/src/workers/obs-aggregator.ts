import { Worker, Queue } from "bullmq";
import { config } from "../config.js";
import { createClient } from "@supabase/supabase-js";
import Redis from "ioredis";

// ══════════════════════════════════════════════════════════════
// OBS:AGGREGATOR — System health metrics collector
// Runs every 1 minute as a BullMQ repeatable job
// Collects: error rates, DLQ size, instance health, queue depths
// Writes to: nexus_system_metrics (service_role only)
// ══════════════════════════════════════════════════════════════

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

const redisOpts = (r: typeof config.redis.core) => ({
  host: r.host,
  port: r.port,
  password: r.password,
  family: r.family,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Collect metrics from Redis queues
async function collectQueueMetrics(): Promise<Record<string, number>> {
  const metrics: Record<string, number> = {};

  const connections = [
    { name: "core", opts: redisOpts(config.redis.core) },
    { name: "schedule", opts: redisOpts(config.redis.schedule) },
    { name: "campaign", opts: redisOpts(config.redis.campaign) },
  ];

  for (const conn of connections) {
    const redis = new Redis(conn.opts);
    try {
      // Queue depth (waiting + active)
      const waiting = await redis.llen(`bull:msg:${conn.name === "core" ? "transactional" : conn.name === "schedule" ? "scheduled" : "campaign"}:wait`);
      const active = await redis.llen(`bull:msg:${conn.name === "core" ? "transactional" : conn.name === "schedule" ? "scheduled" : "campaign"}:active`);

      metrics[`queue_depth_${conn.name}`] = waiting + active;
      metrics[`queue_waiting_${conn.name}`] = waiting;
      metrics[`queue_active_${conn.name}`] = active;
    } catch (e) {
      console.error(`[obs-aggregator] Redis ${conn.name} error:`, (e as Error).message);
      metrics[`queue_depth_${conn.name}`] = -1; // Error indicator
    } finally {
      redis.disconnect();
    }
  }

  // DLQ size (on core redis)
  const dlqRedis = new Redis(redisOpts(config.redis.core));
  try {
    const dlqWaiting = await dlqRedis.llen("bull:msg:dlq:wait");
    const dlqFailed = await dlqRedis.zcard("bull:msg:dlq:failed");
    metrics.dlq_size = dlqWaiting + dlqFailed;
  } catch (e) {
    console.error("[obs-aggregator] DLQ error:", (e as Error).message);
    metrics.dlq_size = -1;
  } finally {
    dlqRedis.disconnect();
  }

  return metrics;
}

// Collect instance health from Supabase
async function collectInstanceHealth(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("whatsapp_instances")
    .select("status", { count: "exact" });

  if (error) {
    console.error("[obs-aggregator] Instance health error:", error.message);
    return { connected_instances: -1, disconnected_instances: -1 };
  }

  const connected = (data || []).filter((i: any) => i.status === "connected").length;
  const disconnected = (data || []).filter((i: any) => i.status !== "connected").length;

  return {
    connected_instances: connected,
    disconnected_instances: disconnected,
    total_instances: connected + disconnected,
  };
}

// Calculate error rate from recent failed jobs
async function collectErrorRate(): Promise<number> {
  const redis = new Redis(redisOpts(config.redis.core));
  try {
    // Count failed jobs in the last 60 seconds
    const now = Date.now();
    const oneMinAgo = now - 60_000;
    const failedCount = await redis.zcount("bull:msg:transactional:failed", oneMinAgo, now);
    return failedCount;
  } catch {
    return 0;
  } finally {
    redis.disconnect();
  }
}

// Upsert metrics into nexus_system_metrics
async function persistMetrics(metrics: Record<string, number>) {
  const bucket = new Date();
  bucket.setSeconds(0, 0); // Round to minute

  const rows = Object.entries(metrics).map(([key, value]) => ({
    metric_key: key,
    metric_value: value,
    bucket_at: bucket.toISOString(),
  }));

  const { error } = await supabase
    .from("nexus_system_metrics")
    .upsert(rows, { onConflict: "metric_key,bucket_at" });

  if (error) {
    console.error("[obs-aggregator] Persist error:", error.message);
  } else {
    console.log(`[obs-aggregator] Persisted ${rows.length} metrics at ${bucket.toISOString()}`);
  }
}

// Main aggregation function
async function aggregate() {
  const start = Date.now();

  const [queueMetrics, instanceHealth, errorRate] = await Promise.all([
    collectQueueMetrics(),
    collectInstanceHealth(),
    collectErrorRate(),
  ]);

  const allMetrics = {
    ...queueMetrics,
    ...instanceHealth,
    error_rate_1m: errorRate,
    aggregation_duration_ms: Date.now() - start,
  };

  await persistMetrics(allMetrics);

  // Log summary
  const status =
    errorRate >= 20 ? "🔴 CRITICAL" :
    errorRate >= 5 ? "🟡 WARNING" :
    "🟢 OK";

  console.log(
    `[obs-aggregator] ${status} | errors/min: ${errorRate} | ` +
    `instances: ${instanceHealth.connected_instances}/${instanceHealth.total_instances} | ` +
    `dlq: ${queueMetrics.dlq_size} | ${Date.now() - start}ms`
  );
}

// ── WORKER SETUP ─────────────────────────────────────────────

export function startObsAggregator() {
  // Create a dedicated queue for the aggregator
  const obsQueue = new Queue("obs:aggregator", {
    connection: redisOpts(config.redis.core),
    defaultJobOptions: {
      removeOnComplete: { age: 300, count: 5 },
      removeOnFail: { age: 3600, count: 10 },
    },
  });

  // Schedule repeatable job: every 1 minute
  obsQueue.add(
    "aggregate",
    {},
    {
      repeat: { pattern: "*/1 * * * *" },
      jobId: "obs-aggregator-repeat",
    }
  );

  // Worker processes the job
  const worker = new Worker(
    "obs:aggregator",
    async () => {
      await aggregate();
    },
    {
      connection: redisOpts(config.redis.core),
      concurrency: 1, // Only 1 aggregation at a time
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[obs-aggregator] Job failed:`, err.message);
  });

  console.log("[obs-aggregator] Started — collecting metrics every 1 minute");

  return { worker, queue: obsQueue };
}
