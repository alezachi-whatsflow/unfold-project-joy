import { Worker, Job } from "bullmq";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { dlqQueue } from "../queues.js";
import { supabase } from "../connections.js";
import { sendMessage, saveMessageToDb } from "../senders/index.js";
import type { CampaignJob, MessageJob, DLQEntry } from "../types.js";

// ═══════════════════════════════════════════
// CAMPAIGN WORKER — Mass Messaging (10k+)
//
// Processes: broadcasts, bulk sends, list campaigns
// Redis: redis-campaign (16381)
// Features:
//   - Chunking: splits recipients into batches
//   - Random delay: warm-up between messages
//   - DLQ: invalid numbers marked as bounce
//   - Progress tracking: updates campaign status in DB
//   - Tenant isolation: one campaign never blocks another
// ═══════════════════════════════════════════

const BOUNCE_CODES = ["400", "404", "131030", "131051", "131026"];

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startCampaignWorker() {
  const worker = new Worker<CampaignJob>(
    "msg:campaign",
    async (job: Job<CampaignJob>) => {
      const { data } = job;
      const { recipients, message, campaignId, tenantId, instanceToken, provider } = data;
      const delayMin = data.delayMinMs ?? config.worker.campaignDelayMin;
      const delayMax = data.delayMaxMs ?? config.worker.campaignDelayMax;
      const batchSize = data.batchSize ?? 50;

      logger.info({
        jobId: job.id,
        campaignId,
        total: recipients.length,
        delayMin,
        delayMax,
      }, "Starting campaign");

      let sent = 0;
      let failed = 0;
      let bounced = 0;

      for (let i = 0; i < recipients.length; i++) {
        const number = recipients[i];

        const msgJob: MessageJob = {
          ...message,
          number,
          tenantId,
          instanceToken,
          provider,
        } as MessageJob;

        const result = await sendMessage(msgJob);

        if (result.success) {
          sent++;
          await saveMessageToDb(msgJob, result);
        } else {
          failed++;

          // Bounce detection → DLQ
          if (result.errorCode && BOUNCE_CODES.includes(result.errorCode)) {
            bounced++;
            await dlqQueue.add("campaign-bounce", {
              originalJob: msgJob,
              error: result.error || "Bounce",
              errorCode: result.errorCode,
              failedAt: new Date().toISOString(),
              queue: "campaign",
              attempts: 1,
            } satisfies DLQEntry);

            // Mark contact as bounced in DB
            await supabase
              .from("whatsapp_contacts")
              .update({ status: "bounce" })
              .eq("phone", number)
              .eq("tenant_id", tenantId);
          }
        }

        // Progress update every batch
        if ((i + 1) % batchSize === 0 || i === recipients.length - 1) {
          const progress = Math.round(((i + 1) / recipients.length) * 100);
          await job.updateProgress(progress);

          logger.info({
            campaignId,
            progress: `${progress}%`,
            sent,
            failed,
            bounced,
            current: i + 1,
            total: recipients.length,
          }, "Campaign progress");
        }

        // Random delay between messages (warm-up / anti-spam)
        if (i < recipients.length - 1) {
          await randomDelay(delayMin, delayMax);
        }
      }

      // Update campaign status in DB
      await supabase
        .from("message_campaigns")
        .update({
          status: "completed",
          sent_count: sent,
          failed_count: failed,
          bounced_count: bounced,
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      logger.info({ campaignId, sent, failed, bounced }, "Campaign completed");
      return { sent, failed, bounced };
    },
    {
      connection: {
        host: config.redis.campaign.host,
        port: config.redis.campaign.port,
        password: config.redis.campaign.password,
        family: config.redis.campaign.family,
        maxRetriesPerRequest: null,
      },
      concurrency: 2, // Max 2 campaigns simultaneously
    }
  );

  worker.on("progress", (job, progress) => {
    logger.debug({ jobId: job.id, progress }, "Campaign progress event");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Campaign job failed");
  });

  logger.info("Campaign worker started (concurrency: 2, max 2 simultaneous campaigns)");
  return worker;
}
