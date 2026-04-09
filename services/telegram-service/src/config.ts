/**
 * Configuration — all from environment variables.
 */
export const config = {
  port: parseInt(process.env.PORT || "3100", 10),
  internalApiKey: process.env.INTERNAL_API_KEY || "",

  // Telegram API credentials (from https://my.telegram.org)
  telegramApiId: parseInt(process.env.TELEGRAM_API_ID || "0", 10),
  telegramApiHash: process.env.TELEGRAM_API_HASH || "",

  // Supabase (service role for DB writes)
  supabaseUrl: process.env.SUPABASE_URL || "http://supabase-kong:8000",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  // Webhook target (Edge Function — internal Docker network)
  webhookUrl:
    process.env.TELEGRAM_WEBHOOK_URL ||
    "http://supabase-kong:8000/functions/v1/telegram-webhook",
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",

  // Reconnect settings
  reconnectDelayMs: 5_000,
  maxReconnectAttempts: 20,
};

export function validateConfig() {
  const required: (keyof typeof config)[] = [
    "internalApiKey",
    "telegramApiId",
    "telegramApiHash",
    "supabaseServiceKey",
  ];
  const missing = required.filter((k) => !config[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
