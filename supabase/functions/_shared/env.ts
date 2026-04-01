/**
 * Centralized environment variable resolver.
 * Tries Deno.env first, then falls back to ai_configurations or
 * platform_settings tables in the database.
 *
 * Usage:
 *   import { getSecret } from "../_shared/env.ts";
 *   const key = await getSecret("FIRECRAWL_API_KEY", "firecrawl");
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let _supabase: any = null;
function getServiceClient() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

/**
 * Get a secret/config value.
 * @param envVar - Deno.env key to check first
 * @param dbProvider - provider name in ai_configurations (e.g., "firecrawl", "openai", "apify")
 * @param dbField - which column to return (default: "api_key")
 */
export async function getSecret(
  envVar: string,
  dbProvider?: string,
  dbField: string = "api_key",
): Promise<string | null> {
  // 1. Try env var
  const envVal = Deno.env.get(envVar);
  if (envVal) return envVal;

  // 2. Try ai_configurations table
  if (dbProvider) {
    try {
      const sb = getServiceClient();
      const { data } = await sb
        .from("ai_configurations")
        .select(dbField)
        .eq("provider", dbProvider)
        .eq("is_active", true)
        .order("is_global", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.[dbField]) return data[dbField];
    } catch (e) {
      console.warn(`[env] Failed to fetch ${envVar} from DB (provider=${dbProvider}):`, e);
    }
  }

  return null;
}

/**
 * Get a secret for a specific tenant (checks tenant-specific first, then global).
 */
export async function getTenantSecret(
  envVar: string,
  dbProvider: string,
  tenantId?: string,
  dbField: string = "api_key",
): Promise<string | null> {
  // 1. Try env var
  const envVal = Deno.env.get(envVar);
  if (envVal) return envVal;

  try {
    const sb = getServiceClient();

    // 2. Try tenant-specific config
    if (tenantId) {
      const { data: tenantData } = await sb
        .from("ai_configurations")
        .select(dbField)
        .eq("provider", dbProvider)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (tenantData?.[dbField]) return tenantData[dbField];
    }

    // 3. Try global config
    const { data: globalData } = await sb
      .from("ai_configurations")
      .select(dbField)
      .eq("provider", dbProvider)
      .eq("is_global", true)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (globalData?.[dbField]) return globalData[dbField];
  } catch (e) {
    console.warn(`[env] Failed to fetch ${envVar} from DB:`, e);
  }

  return null;
}

/**
 * Get the Asaas API key from asaas_connections table.
 */
export async function getAsaasKey(tenantId?: string, environment: string = "production"): Promise<string | null> {
  const envVal = Deno.env.get("ASAAS_API_KEY");
  if (envVal) return envVal;

  if (!tenantId) return null;

  try {
    const sb = getServiceClient();
    const { data } = await sb
      .from("asaas_connections")
      .select("api_key_hint")
      .eq("tenant_id", tenantId)
      .eq("environment", environment)
      .eq("is_active", true)
      .maybeSingle();
    // Note: asaas_connections stores api_key_hint (last 4 chars only).
    // The actual key should be in env or in encrypted_credentials.
    // For now, fallback to env only.
    return null;
  } catch {
    return null;
  }
}

/**
 * Get APP_URL with fallback.
 */
export function getAppUrl(): string {
  return Deno.env.get("APP_URL")
    || Deno.env.get("VITE_APP_URL")
    || "https://unfold-project-joy-production.up.railway.app";
}

/**
 * Get UAZAPI base URL with fallback.
 */
export function getUazapiBaseUrl(): string {
  return Deno.env.get("UAZAPI_BASE_URL") || "https://whatsflow.uazapi.com";
}
