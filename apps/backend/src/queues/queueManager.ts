/**
 * Queue Manager — Lane Isolation Architecture
 *
 * Two isolated lanes on Redis Core instance:
 *
 * ┌─────────────────────────────────────────────────────┐
 * │                   REDIS CORE (:16379)               │
 * │                                                     │
 * │  ┌──────────────────┐  ┌──────────────────────┐    │
 * │  │ FAST LANE        │  │ AI LANE              │    │
 * │  │                  │  │                      │    │
 * │  │ fast-messages    │  │ ai-processing        │    │
 * │  │ • Meta webhook   │  │ • Vision AI (GPT-4o) │    │
 * │  │ • uazapi webhook │  │ • Whisper (audio)    │    │
 * │  │ • Status updates │  │ • Assistants v2      │    │
 * │  │ • Contact sync   │  │ • Playbook execution │    │
 * │  │                  │  │                      │    │
 * │  │ Target: <100ms   │  │ Target: <30s         │    │
 * │  │ Concurrency: 50  │  │ Concurrency: 10      │    │
 * │  └──────────────────┘  └──────────────────────┘    │
 * └─────────────────────────────────────────────────────┘
 *
 * ┌───────────────────┐  ┌───────────────────┐
 * │ REDIS SCHEDULE    │  │ REDIS CAMPAIGN    │
 * │ (:16380)          │  │ (:16381)          │
 * │ • Scheduled sends │  │ • Mass sends      │
 * │ • Delayed jobs    │  │ • Bulk operations │
 * └───────────────────┘  └───────────────────┘
 *
 * KEY PRINCIPLE: AI never blocks messaging.
 * If OpenAI takes 15 seconds, fast-messages keeps flowing at <100ms.
 */

import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { REDIS_CORE, REDIS_SCHEDULE, REDIS_CAMPAIGN, createRedisConnection } from "../config/redis.js";

// ── Queue Names ──
export const QUEUE_NAMES = {
  FAST_MESSAGES: "fast-messages",
  AI_PROCESSING: "ai-processing",
  SCHEDULED_SENDS: "msg:scheduled",
  CAMPAIGNS: "msg:campaign",
} as const;

// ── Job Types ──
export interface FastMessageJob {
  type: "incoming_message" | "outgoing_message" | "status_update" | "connection_event" | "contact_sync";
  instance: string;
  tenantId?: string;
  payload: Record<string, any>;
  timestamp: number;
}

export interface AIProcessingJob {
  type: "expense_extraction" | "audio_transcription" | "content_summary" | "playbook_step" | "assistant_response";
  tenantId: string;
  userId?: string;
  input: {
    imageUrl?: string;
    audioUrl?: string;
    text?: string;
    contactJid?: string;
    instanceName?: string;
    playbookId?: string;
    sessionId?: string;
  };
  metadata?: Record<string, any>;
}

// ── Queue Manager ──
export class QueueManager {
  // Queues
  public fastMessages: Queue<FastMessageJob>;
  public aiProcessing: Queue<AIProcessingJob>;
  public scheduledSends: Queue;
  public campaigns: Queue;

  // Queue Events (for monitoring)
  public fastMessagesEvents: QueueEvents;
  public aiProcessingEvents: QueueEvents;

  constructor() {
    // ── FAST LANE: Messages (Redis Core) ──
    this.fastMessages = new Queue<FastMessageJob>(QUEUE_NAMES.FAST_MESSAGES, {
      connection: createRedisConnection(REDIS_CORE),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { count: 1000 }, // Keep last 1000 completed
        removeOnFail: { count: 5000 },     // Keep last 5000 failed for debugging
      },
    });

    // ── AI LANE: Processing (Redis Core, isolated prefix) ──
    this.aiProcessing = new Queue<AIProcessingJob>(QUEUE_NAMES.AI_PROCESSING, {
      connection: createRedisConnection(REDIS_CORE),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 5000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
        timeout: 60_000, // 60s max for AI calls
      },
    });

    // ── SCHEDULED SENDS (Redis Schedule) ──
    this.scheduledSends = new Queue(QUEUE_NAMES.SCHEDULED_SENDS, {
      connection: createRedisConnection(REDIS_SCHEDULE),
    });

    // ── CAMPAIGNS (Redis Campaign) ──
    this.campaigns = new Queue(QUEUE_NAMES.CAMPAIGNS, {
      connection: createRedisConnection(REDIS_CAMPAIGN),
    });

    // ── Events for monitoring ──
    this.fastMessagesEvents = new QueueEvents(QUEUE_NAMES.FAST_MESSAGES, {
      connection: createRedisConnection(REDIS_CORE),
    });
    this.aiProcessingEvents = new QueueEvents(QUEUE_NAMES.AI_PROCESSING, {
      connection: createRedisConnection(REDIS_CORE),
    });

    this.setupMonitoring();
  }

  private setupMonitoring() {
    this.fastMessagesEvents.on("completed", ({ jobId }) => {
      // Metrics: track fast-lane throughput
    });
    this.fastMessagesEvents.on("failed", ({ jobId, failedReason }) => {
      console.error(`[fast-messages] Job ${jobId} failed:`, failedReason);
    });

    this.aiProcessingEvents.on("completed", ({ jobId }) => {
      // Metrics: track AI processing time
    });
    this.aiProcessingEvents.on("failed", ({ jobId, failedReason }) => {
      console.error(`[ai-processing] Job ${jobId} failed:`, failedReason);
    });
  }

  // ── Enqueue Helpers ──

  async enqueueMessage(job: FastMessageJob): Promise<string> {
    const added = await this.fastMessages.add(job.type, job, {
      priority: job.type === "incoming_message" ? 1 : 2, // Incoming = highest priority
    });
    return added.id!;
  }

  async enqueueAI(job: AIProcessingJob): Promise<string> {
    const added = await this.aiProcessing.add(job.type, job, {
      priority: job.type === "expense_extraction" ? 1 : 3, // Expenses = high priority
    });
    return added.id!;
  }

  // ── Health Check ──
  async getHealth() {
    const [fastWaiting, fastActive, aiWaiting, aiActive] = await Promise.all([
      this.fastMessages.getWaitingCount(),
      this.fastMessages.getActiveCount(),
      this.aiProcessing.getWaitingCount(),
      this.aiProcessing.getActiveCount(),
    ]);

    return {
      fastMessages: { waiting: fastWaiting, active: fastActive },
      aiProcessing: { waiting: aiWaiting, active: aiActive },
      status: fastWaiting < 100 && aiWaiting < 50 ? "healthy" : "degraded",
    };
  }

  // ── Graceful Shutdown ──
  async shutdown() {
    console.log("[queues] Shutting down...");
    await Promise.all([
      this.fastMessages.close(),
      this.aiProcessing.close(),
      this.scheduledSends.close(),
      this.campaigns.close(),
      this.fastMessagesEvents.close(),
      this.aiProcessingEvents.close(),
    ]);
    console.log("[queues] All queues closed.");
  }
}

// Singleton
let _instance: QueueManager | null = null;

export function getQueueManager(): QueueManager {
  if (!_instance) {
    _instance = new QueueManager();
  }
  return _instance;
}
