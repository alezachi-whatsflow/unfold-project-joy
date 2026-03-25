import { Worker, Job } from "bullmq";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { dlqQueue } from "../queues.js";
import { sendMessage, saveMessageToDb } from "../senders/index.js";
import type { MessageJob, DLQEntry } from "../types.js";

// ═══════════════════════════════════════════
// CORE WORKER — Transactional Messages
//
// Processes: 1:1 messages, webhook replies, chatbot responses
// Redis: redis-core (16379)
// Priority: HIGHEST — never blocked by campaigns
// Concurrency: 5 (adjustable via WORKER_CONCURRENCY)
// ═══════════════════════════════════════════

const PERMANENT_FAIL_CODES = ["400", "404", "131030", "131051"];

export function startCoreWorker() {
  const worker = new Worker<MessageJob>(
    "msg:transactional",
    async (job: Job<MessageJob>) => {
      const { data } = job;
      logger.info({ jobId: job.id, number: data.number, type: data.type }, "Processing transactional message");

      const result = await sendMessage(data);

      if (!result.success) {
        // Permanent failures go to DLQ immediately
        if (result.errorCode && PERMANENT_FAIL_CODES.includes(result.errorCode)) {
          await dlqQueue.add("dead-letter", {
            originalJob: data,
            error: result.error || "Unknown",
            errorCode: result.errorCode,
            failedAt: new Date().toISOString(),
            queue: "transactional",
            attempts: job.attemptsMade + 1,
          } satisfies DLQEntry);

          logger.warn({ jobId: job.id, error: result.error }, "Permanent failure → DLQ");
          return; // Don't retry
        }

        throw new Error(result.error || "Send failed"); // Triggers retry
      }

      // Save successful message to DB
      await saveMessageToDb(data, result);
      logger.info({ jobId: job.id, messageId: result.messageId }, "Transactional message sent");
    },
    {
      connection: {
        host: config.redis.core.host,
        port: config.redis.core.port,
        password: config.redis.core.password,
        family: config.redis.core.family,
        maxRetriesPerRequest: null,
      },
      concurrency: config.worker.concurrency,
      limiter: {
        max: 30,    // 30 messages
        duration: 1000, // per second (uazapi safe limit)
      },
    }
  );

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Core job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message, attempts: job?.attemptsMade }, "Core job failed");
  });

  logger.info(`Core worker started (concurrency: ${config.worker.concurrency})`);
  return worker;
}
