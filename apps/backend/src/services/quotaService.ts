/**
 * QuotaService — Cascading Pool Management
 *
 * Validates that child license allocations do not exceed the parent's pool.
 * Used by Nexus (setting WL pools) and WhiteLabel (distributing to tenants).
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── Types ────────────────────────────────────────────────────────────────────

export interface PoolLimits {
  attendants: number;
  devices_web: number;
  devices_meta: number;
  messages: number;
  storage_gb: number;
  ai_agents: number;
}

export interface PoolStatus extends PoolLimits {
  total_licenses: number;
  ai_modules: number;
}

export interface QuotaValidationRequest {
  parent_license_id: string;
  child_license_id?: string | null; // null for new license
  attendants: number;
  devices_web: number;
  devices_meta: number;
  messages?: number;
  storage_gb?: number;
  ai_agents?: number;
  has_ai_module?: boolean;
}

export interface QuotaValidationResult {
  valid: boolean;
  error?: string;
  available?: PoolLimits;
  consumed?: PoolStatus;
}

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get consumed resources across all active child licenses of a parent.
 */
export async function getPoolConsumed(parentLicenseId: string): Promise<PoolStatus> {
  const { data, error } = await supabase.rpc("get_pool_consumed", {
    parent_id: parentLicenseId,
  });

  if (error) throw new Error(`Failed to get pool consumed: ${error.message}`);

  return {
    attendants: data?.attendants ?? 0,
    devices_web: data?.devices_web ?? 0,
    devices_meta: data?.devices_meta ?? 0,
    messages: data?.messages ?? 0,
    storage_gb: data?.storage_gb ?? 0,
    ai_agents: data?.ai_agents ?? 0,
    ai_modules: data?.ai_modules ?? 0,
    total_licenses: data?.total_licenses ?? 0,
  };
}

/**
 * Get available (remaining) pool for a parent license.
 */
export async function getPoolAvailable(parentLicenseId: string): Promise<PoolLimits & { max_licenses: number }> {
  const { data, error } = await supabase.rpc("get_pool_available", {
    parent_id: parentLicenseId,
  });

  if (error) throw new Error(`Failed to get pool available: ${error.message}`);

  return {
    attendants: data?.attendants ?? 0,
    devices_web: data?.devices_web ?? 0,
    devices_meta: data?.devices_meta ?? 0,
    messages: data?.messages ?? 0,
    storage_gb: data?.storage_gb ?? 0,
    ai_agents: data?.ai_agents ?? 0,
    max_licenses: data?.max_licenses ?? 0,
  };
}

/**
 * The Golden Rule: Validate that a child license allocation fits within the parent pool.
 * Returns { valid: true } or { valid: false, error: "..." }
 */
export async function validateQuotaAllocation(
  req: QuotaValidationRequest,
): Promise<QuotaValidationResult> {
  const { data: validationError, error } = await supabase.rpc(
    "validate_quota_allocation",
    {
      p_parent_id: req.parent_license_id,
      p_child_license_id: req.child_license_id ?? null,
      p_attendants: req.attendants,
      p_devices_web: req.devices_web,
      p_devices_meta: req.devices_meta,
      p_messages: req.messages ?? 0,
      p_storage_gb: req.storage_gb ?? 0,
      p_ai_agents: req.ai_agents ?? 0,
      p_has_ai: req.has_ai_module ?? false,
    },
  );

  if (error) throw new Error(`Quota validation failed: ${error.message}`);

  if (validationError) {
    // Also fetch current available for client-side display
    const available = await getPoolAvailable(req.parent_license_id);
    const consumed = await getPoolConsumed(req.parent_license_id);

    return {
      valid: false,
      error: validationError,
      available,
      consumed,
    };
  }

  return { valid: true };
}

/**
 * Get parent license module permissions.
 * A child cannot enable a module that the parent doesn't have.
 */
export async function getParentModules(
  parentLicenseId: string,
): Promise<Record<string, boolean>> {
  const { data: wlConfig } = await supabase
    .from("whitelabel_config")
    .select(
      "modules_crm, modules_financeiro, modules_mensageria, modules_ia, modules_pzaafi, modules_intelligence",
    )
    .eq("license_id", parentLicenseId)
    .maybeSingle();

  if (!wlConfig) {
    // Fallback: check parent license directly
    const { data: parentLicense } = await supabase
      .from("licenses")
      .select("has_ai_module, pool_enabled_modules")
      .eq("id", parentLicenseId)
      .maybeSingle();

    return {
      crm: true,
      financeiro: true,
      mensageria: true,
      ia: parentLicense?.has_ai_module ?? false,
      pzaafi: false,
      intelligence: parentLicense?.has_ai_module ?? false,
    };
  }

  return {
    crm: wlConfig.modules_crm ?? true,
    financeiro: wlConfig.modules_financeiro ?? true,
    mensageria: wlConfig.modules_mensageria ?? true,
    ia: wlConfig.modules_ia ?? false,
    pzaafi: wlConfig.modules_pzaafi ?? false,
    intelligence: wlConfig.modules_intelligence ?? false,
  };
}

/**
 * Get the full pool status for a WhiteLabel: limits, consumed, available, modules.
 */
export async function getPoolStatus(parentLicenseId: string) {
  const [consumed, available, modules] = await Promise.all([
    getPoolConsumed(parentLicenseId),
    getPoolAvailable(parentLicenseId),
    getParentModules(parentLicenseId),
  ]);

  // Get parent pool limits
  const { data: parentLicense } = await supabase
    .from("licenses")
    .select(
      "pool_max_attendants, pool_max_devices_web, pool_max_devices_meta, pool_max_messages, pool_max_storage_gb, pool_max_ai_agents",
    )
    .eq("id", parentLicenseId)
    .maybeSingle();

  return {
    limits: {
      attendants: parentLicense?.pool_max_attendants ?? 0,
      devices_web: parentLicense?.pool_max_devices_web ?? 0,
      devices_meta: parentLicense?.pool_max_devices_meta ?? 0,
      messages: parentLicense?.pool_max_messages ?? 0,
      storage_gb: parentLicense?.pool_max_storage_gb ?? 0,
      ai_agents: parentLicense?.pool_max_ai_agents ?? 0,
    },
    consumed,
    available,
    modules,
  };
}
