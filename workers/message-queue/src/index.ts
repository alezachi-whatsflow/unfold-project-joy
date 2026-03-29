import { logger } from "./logger.js";
import { redisCore, redisSchedule, redisCampaign } from "./connections.js";
import { startCoreWorker } from "./workers/core-worker.js";
import { startScheduleWorker } from "./workers/schedule-worker.js";
import { startCampaignWorker } from "./workers/campaign-worker.js";
import { startDLQProcessor } from "./workers/dlq-processor.js";
import { startObsAggregator } from "./workers/obs-aggregator.js";
import { startObsAlerter } from "./workers/obs-alerter.js";
import { startInstanceHeartbeat } from "./workers/instance-heartbeat.js";

// ═══════════════════════════════════════════
// Whatsflow Message Queue — Main Entry Point
//
// Architecture:
//   ┌────────────────────────────────────────┐
//   │  Redis Core (16379)                    │
//   │  └─ msg:transactional (1:1, chatbot)   │
//   │  └─ msg:dlq (dead letters)             │
//   ├────────────────────────────────────────┤
//   │  Redis Schedule (16380)                │
//   │  └─ msg:scheduled (timed delivery)     │
//   ├────────────────────────────────────────┤
//   │  Redis Campaign (16381)                │
//   │  └─ msg:campaign (mass 10k+)           │
//   └────────────────────────────────────────┘
//
//   All connections via IPv6: 2804:8fbc:0:5::a152
// ═══════════════════════════════════════════

async function main() {
  logger.info("═══ Whatsflow Message Queue Worker ═══");
  logger.info("Connecting to Redis instances via IPv6...");

  // Wait for all Redis connections
  await Promise.all([
    new Promise<void>((resolve) => redisCore.once("ready", resolve)),
    new Promise<void>((resolve) => redisSchedule.once("ready", resolve)),
    new Promise<void>((resolve) => redisCampaign.once("ready", resolve)),
  ]).catch((err) => {
    logger.fatal({ err }, "Failed to connect to Redis — aborting");
    process.exit(1);
  });

  logger.info("All Redis connections established");

  // Start all workers
  const coreWorker = startCoreWorker();
  const scheduleWorker = startScheduleWorker();
  const campaignWorker = startCampaignWorker();
  const dlqProcessor = startDLQProcessor();
  const { worker: obsWorker } = startObsAggregator();
  const { worker: alertWorker } = startObsAlerter();
  const { worker: heartbeatWorker } = startInstanceHeartbeat();

  logger.info("All workers running (5 workers + obs + alerter + heartbeat). Waiting for jobs...");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully...");

    await Promise.allSettled([
      coreWorker.close(),
      scheduleWorker.close(),
      campaignWorker.close(),
      dlqProcessor.close(),
      obsWorker.close(),
      alertWorker.close(),
      heartbeatWorker.close(),
    ]);

    await Promise.allSettled([
      redisCore.quit(),
      redisSchedule.quit(),
      redisCampaign.quit(),
    ]);

    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal error");
  process.exit(1);
});
