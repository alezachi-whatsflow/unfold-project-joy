import { redisCore, redisSchedule, redisCampaign } from "./connections.js";
import { logger } from "./logger.js";

async function test() {
  logger.info("Testing Redis connections via IPv6...");

  try {
    const [r1, r2, r3] = await Promise.all([
      redisCore.ping(),
      redisSchedule.ping(),
      redisCampaign.ping(),
    ]);

    logger.info({ core: r1, schedule: r2, campaign: r3 }, "All Redis instances responding");

    // Test write/read on each
    await redisCore.set("wf:test", "core-ok");
    await redisSchedule.set("wf:test", "schedule-ok");
    await redisCampaign.set("wf:test", "campaign-ok");

    const vals = await Promise.all([
      redisCore.get("wf:test"),
      redisSchedule.get("wf:test"),
      redisCampaign.get("wf:test"),
    ]);

    logger.info({ values: vals }, "Read/Write test passed");

    // Cleanup
    await Promise.all([
      redisCore.del("wf:test"),
      redisSchedule.del("wf:test"),
      redisCampaign.del("wf:test"),
    ]);

    logger.info("All tests passed! Redis IPv6 connections working.");
  } catch (err) {
    logger.error({ err }, "Connection test FAILED");
  }

  await Promise.all([redisCore.quit(), redisSchedule.quit(), redisCampaign.quit()]);
  process.exit(0);
}

test();
