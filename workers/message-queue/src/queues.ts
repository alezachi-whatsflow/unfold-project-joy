import { Queue, QueueEvents } from "bullmq";
import { config } from "./config.js";

// ═══════════════════════════════════════════
// QUEUE DEFINITIONS
// ═══════════════════════════════════════════
//
// Architecture:
//   redis-core (16379)     → transactional: 1:1 messages, webhook replies, chatbot
//   redis-schedule (16380) → scheduled: agendamentos, follow-ups, lembretes
//   redis-campaign (16381) → campaigns: mass messaging 10k+, broadcasts
//
// Each queue has its own Redis to guarantee:
//   - Campaign traffic NEVER blocks transactional messages
//   - Scheduled jobs don't compete with real-time sends
//   - Independent failure domains
// ═══════════════════════════════════════════

const redisOpts = (r: typeof config.redis.core) => ({
  host: r.host,
  port: r.port,
  password: r.password,
  family: r.family,
  maxRetriesPerRequest: null,
});

// ── CORE: Transactional (real-time, 1:1) ──────────────────

export const coreQueue = new Queue("msg:transactional", {
  connection: redisOpts(config.redis.core),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 },   // 1h TTL + max 1000
    removeOnFail: { age: 86400, count: 5000 },       // 24h TTL + max 5000
  },
});

// ── SCHEDULE: Timed delivery ──────────────────────────────

export const scheduleQueue = new Queue("msg:scheduled", {
  connection: redisOpts(config.redis.schedule),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600, count: 500 },     // 1h TTL + max 500
    removeOnFail: { age: 86400, count: 2000 },        // 24h TTL + max 2000
  },
});

// ── CAMPAIGN: Mass messaging ──────────────────────────────

export const campaignQueue = new Queue("msg:campaign", {
  connection: redisOpts(config.redis.campaign),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 10000 },
    removeOnComplete: { age: 7200, count: 200 },     // 2h TTL + max 200
    removeOnFail: { age: 259200, count: 10000 },      // 72h TTL + max 10000 (analytics)
  },
});

// ── DLQ: Dead Letter Queue (on core redis) ────────────────

export const dlqQueue = new Queue("msg:dlq", {
  connection: redisOpts(config.redis.core),
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: false, // Keep forever for audit
    removeOnFail: false,
  },
});

// ── Queue Events (for monitoring) ─────────────────────────

export const coreEvents = new QueueEvents("msg:transactional", {
  connection: redisOpts(config.redis.core),
});

export const campaignEvents = new QueueEvents("msg:campaign", {
  connection: redisOpts(config.redis.campaign),
});
