/**
 * Redis Configuration — Lane Isolation
 *
 * 3 Redis instances on the same host, different ports:
 * - Core (16379): transactional messages, fast-path
 * - Schedule (16380): scheduled sends, delayed jobs
 * - Campaign (16381): mass sends, bulk operations
 *
 * For the new Backend, we add 2 logical lanes on Core:
 * - fast-messages: high-throughput Meta/uazapi message processing
 * - ai-processing: isolated OpenAI/Anthropic calls (slow, never blocks fast)
 */
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null; // Required by BullMQ
}

// ── Redis Instances (physical separation) ──
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const REDIS_CORE: RedisConfig = {
  host: process.env.REDIS_CORE_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_CORE_PORT || 16379),
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

export const REDIS_SCHEDULE: RedisConfig = {
  host: process.env.REDIS_SCHEDULE_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_SCHEDULE_PORT || 16380),
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

export const REDIS_CAMPAIGN: RedisConfig = {
  host: process.env.REDIS_CAMPAIGN_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_CAMPAIGN_PORT || 16381),
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// ── Redis Connection Factory ──
export function createRedisConnection(config: RedisConfig): Redis {
  const conn = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    retryStrategy: (times) => Math.min(times * 200, 5000),
    enableReadyCheck: true,
    lazyConnect: false,
  });

  conn.on("connect", () => console.log(`[redis] Connected to ${config.host}:${config.port}`));
  conn.on("error", (err) => console.error(`[redis] Error on ${config.host}:${config.port}:`, err.message));

  return conn;
}
