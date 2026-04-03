/**
 * Supabase Client Factory — JWT-aware
 *
 * RULE: Never use Service Role for client-facing operations.
 * The Backend receives the user's JWT in the Authorization header
 * and creates a Supabase client scoped to that user's RLS context.
 *
 * Service Role is ONLY used for:
 * - Webhook processing (no user context)
 * - Background jobs (scheduled tasks)
 * - System operations (lifecycle, encryption)
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://supabase.whatsflow.com.br";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

/**
 * Create a Supabase client scoped to a user's JWT.
 * RLS policies will enforce tenant isolation automatically.
 */
export function createUserClient(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
  });
}

/**
 * Service Role client — ONLY for webhooks and background jobs.
 * Bypasses RLS. Use with extreme caution.
 */
export function createServiceClient(): SupabaseClient {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}
