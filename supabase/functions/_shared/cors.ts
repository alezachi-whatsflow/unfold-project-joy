/**
 * Shared CORS configuration for all Edge Functions.
 *
 * Usage:
 *   import { corsHeaders, handleCors } from "../_shared/cors.ts";
 *
 *   // At top of handler:
 *   if (req.method === "OPTIONS") return handleCors();
 *
 *   // In responses:
 *   return new Response(body, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
 */

const ALLOWED_ORIGINS = [
  "https://unfold-project-joy-production.up.railway.app",
  "https://app.whatsflow.com.br",
  "https://whatsflow.com.br",
  "http://localhost:5173",
  "http://localhost:8080",
];

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-service-key",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

/** Wide-open CORS for webhook receivers (Meta, Asaas, Telegram, etc.) */
export const webhookCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/** Default CORS headers (restricted to known origins) */
export const corsHeaders = getCorsHeaders();

/** Pre-flight OPTIONS response */
export function handleCors(req?: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) });
}

/** Pre-flight OPTIONS response for webhooks (open) */
export function handleWebhookCors(): Response {
  return new Response(null, { headers: webhookCorsHeaders });
}
