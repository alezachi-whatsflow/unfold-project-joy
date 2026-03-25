import { Worker, Job } from "bullmq";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { supabase } from "../connections.js";
import type { DLQEntry } from "../types.js";

// ═══════════════════════════════════════════
// DLQ PROCESSOR — Dead Letter Queue Handler
//
// Processes bounced/failed messages:
//   - Marks contacts as invalid in DB
//   - Logs failure for analytics
//   - Prevents future sends to invalid numbers
// ═══════════════════════════════════════════

export function startDLQProcessor() {
  const worker = new Worker<DLQEntry>(
    "msg:dlq",
    async (job: Job<DLQEntry>) => {
      const { data } = job;
      const { originalJob, error, errorCode, queue } = data;

      logger.warn({
        number: originalJob.number,
        tenantId: originalJob.tenantId,
        error,
        errorCode,
        queue,
      }, "Processing DLQ entry");

      // 1. Mark contact as bounced/invalid
      const { error: dbErr } = await supabase
        .from("whatsapp_contacts")
        .upsert(
          {
            phone: originalJob.number,
            tenant_id: originalJob.tenantId,
            status: "bounce",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "phone,tenant_id" }
        );

      if (dbErr) {
        logger.error({ dbErr }, "Failed to mark contact as bounced");
      }

      // 2. Log to audit table
      await supabase.from("message_dlq_log").insert({
        tenant_id: originalJob.tenantId,
        phone: originalJob.number,
        error_message: error,
        error_code: errorCode,
        original_queue: queue,
        original_type: originalJob.type,
        attempts: data.attempts,
        failed_at: data.failedAt,
      }).then(({ error: logErr }) => {
        if (logErr) logger.error({ logErr }, "Failed to log DLQ entry");
      });

      logger.info({ number: originalJob.number }, "DLQ entry processed — contact marked as bounce");
    },
    {
      connection: {
        host: config.redis.core.host,
        port: config.redis.core.port,
        password: config.redis.core.password,
        family: config.redis.core.family,
        maxRetriesPerRequest: null,
      },
      concurrency: 1,
    }
  );

  logger.info("DLQ processor started");
  return worker;
}
