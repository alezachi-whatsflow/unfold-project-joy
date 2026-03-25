import "dotenv/config";

export const config = {
  redis: {
    core: {
      url: process.env.REDIS_CORE_URL!,
      host: process.env.REDIS_CORE_HOST || "2804:8fbc:0:5::a152",
      port: parseInt(process.env.REDIS_CORE_PORT || "16379"),
      password: process.env.REDIS_PASSWORD || "rD9!vQ2#xL7@pN4$zT8&kM6^yF3*",
      family: 6 as const, // IPv6
    },
    schedule: {
      host: process.env.REDIS_SCHEDULE_HOST || "2804:8fbc:0:5::a152",
      port: parseInt(process.env.REDIS_SCHEDULE_PORT || "16380"),
      password: process.env.REDIS_PASSWORD || "rD9!vQ2#xL7@pN4$zT8&kM6^yF3*",
      family: 6 as const,
    },
    campaign: {
      host: process.env.REDIS_CAMPAIGN_HOST || "2804:8fbc:0:5::a152",
      port: parseInt(process.env.REDIS_CAMPAIGN_PORT || "16381"),
      password: process.env.REDIS_PASSWORD || "rD9!vQ2#xL7@pN4$zT8&kM6^yF3*",
      family: 6 as const,
    },
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  uazapi: {
    baseUrl: process.env.UAZAPI_BASE_URL || "https://whatsflow.uazapi.com",
    adminToken: process.env.UAZAPI_ADMIN_TOKEN!,
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5"),
    campaignDelayMin: parseInt(process.env.CAMPAIGN_DELAY_MIN_MS || "1500"),
    campaignDelayMax: parseInt(process.env.CAMPAIGN_DELAY_MAX_MS || "4000"),
  },
} as const;
