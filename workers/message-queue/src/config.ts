import "dotenv/config";

export const config = {
  redis: {
    core: {
      host: process.env.REDIS_CORE_HOST || "filascore.whatsflow.com.br",
      port: parseInt(process.env.REDIS_CORE_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || "",
      family: 0 as const, // 0 = auto-detect IPv4/IPv6 via DNS
    },
    schedule: {
      host: process.env.REDIS_SCHEDULE_HOST || "filasschedule.whatsflow.com.br",
      port: parseInt(process.env.REDIS_SCHEDULE_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || "",
      family: 0 as const,
    },
    campaign: {
      host: process.env.REDIS_CAMPAIGN_HOST || "filascampaign.whatsflow.com.br",
      port: parseInt(process.env.REDIS_CAMPAIGN_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || "",
      family: 0 as const,
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
