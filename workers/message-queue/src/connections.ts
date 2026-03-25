import Redis from "ioredis";
import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { logger } from "./logger.js";

// ═══════════════════════════════════════════
// Redis Connections (IPv6)
// ═══════════════════════════════════════════

export function createRedisConnection(name: string, opts: { host: string; port: number; password: string; family: 6 }) {
  const conn = new Redis({
    host: opts.host,
    port: opts.port,
    password: opts.password,
    family: opts.family,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 500, 10000);
      logger.warn({ name, times, delay }, `Redis ${name} reconnecting...`);
      return delay;
    },
    lazyConnect: false,
  });

  conn.on("connect", () => logger.info(`Redis [${name}] connected via IPv6`));
  conn.on("error", (err) => logger.error({ err, name }, `Redis [${name}] error`));

  return conn;
}

// Pre-built connections
export const redisCore = createRedisConnection("core", config.redis.core);
export const redisSchedule = createRedisConnection("schedule", config.redis.schedule);
export const redisCampaign = createRedisConnection("campaign", config.redis.campaign);

// ═══════════════════════════════════════════
// Supabase (Service Role — full access)
// ═══════════════════════════════════════════

export const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
