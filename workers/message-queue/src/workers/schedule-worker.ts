import { Worker, Job } from "bullmq";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { sendMessage, saveMessageToDb } from "../senders/index.js";
import type { ScheduledMessageJob } from "../types.js";

// ═══════════════════════════════════════════
// SCHEDULE WORKER — Timed Message Delivery
//
// Processes: follow-ups, reminders, timed campaigns
// Redis: redis-schedule (16380)
// Uses BullMQ delayed jobs — job.delay = ms until scheduledFor
// ═══════════════════════════════════════════

export function startScheduleWorker() {
  const worker = new Worker<ScheduledMessageJob>(
    "msg:scheduled",
    async (job: Job<ScheduledMessageJob>) => {
      const { data } = job;
      logger.info({ jobId: job.id, number: data.number, scheduledFor: data.scheduledFor }, "Processing scheduled message");

      const result = await sendMessage(data);

      if (!result.success) {
        throw new Error(result.error || "Scheduled send failed");
      }

      await saveMessageToDb(data, result);
      logger.info({ jobId: job.id, messageId: result.messageId }, "Scheduled message sent");
    },
    {
      connection: {
        host: config.redis.schedule.host,
        port: config.redis.schedule.port,
        password: config.redis.schedule.password,
        family: config.redis.schedule.family,
        maxRetriesPerRequest: null,
      },
      concurrency: 3,
      limiter: {
        max: 20,
        duration: 1000,
      },
    }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Schedule job failed");
  });

  logger.info("Schedule worker started (concurrency: 3)");
  return worker;
}
