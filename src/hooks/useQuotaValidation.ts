/**
 * useQuotaValidation — Fetches parent pool availability
 * and provides max limits for child license forms.
 */
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

interface PoolAvailable {
  attendants: number
  devices_web: number
  devices_meta: number
  messages: number
  storage_gb: number
  ai_agents: number
  max_licenses: number
}

interface PoolLimits {
  pool_max_attendants: number
  pool_max_devices_web: number
  pool_max_devices_meta: number
  pool_max_messages: number
  pool_max_storage_gb: number
  pool_max_ai_agents: number
}

interface PoolConsumed {
  attendants: number
  devices_web: number
  devices_meta: number
  messages: number
  storage_gb: number
  ai_agents: number
  ai_modules: number
  total_licenses: number
}

interface ParentModules {
  modules_crm: boolean
  modules_financeiro: boolean
  modules_mensageria: boolean
  modules_ia: boolean
  modules_pzaafi: boolean
  modules_intelligence: boolean
}

export function useQuotaValidation(parentLicenseId: string | null) {
  // Fetch parent pool limits
  const { data: parentLimits } = useQuery({
    queryKey: ["quota-parent-limits", parentLicenseId],
    queryFn: async () => {
      if (!parentLicenseId) return null
      const { data } = await supabase
        .from("licenses")
        .select("pool_max_attendants, pool_max_devices_web, pool_max_devices_meta, pool_max_messages, pool_max_storage_gb, pool_max_ai_agents, has_ai_module")
        .eq("id", parentLicenseId)
        .maybeSingle()
      return data as (PoolLimits & { has_ai_module: boolean }) | null
    },
    enabled: !!parentLicenseId,
    staleTime: 30_000,
  })

  // Fetch consumed via DB function
  const { data: consumed } = useQuery({
    queryKey: ["quota-consumed", parentLicenseId],
    queryFn: async () => {
      if (!parentLicenseId) return null
      const { data } = await (supabase as any).rpc("get_pool_consumed", { parent_id: parentLicenseId })
      return data as PoolConsumed | null
    },
    enabled: !!parentLicenseId,
    staleTime: 30_000,
  })

  // Fetch available via DB function
  const { data: available } = useQuery({
    queryKey: ["quota-available", parentLicenseId],
    queryFn: async () => {
      if (!parentLicenseId) return null
      const { data } = await (supabase as any).rpc("get_pool_available", { parent_id: parentLicenseId })
      return data as PoolAvailable | null
    },
    enabled: !!parentLicenseId,
    staleTime: 30_000,
  })

  // Fetch module permissions from whitelabel_config
  const { data: parentModules } = useQuery({
    queryKey: ["quota-parent-modules", parentLicenseId],
    queryFn: async () => {
      if (!parentLicenseId) return null
      const { data } = await supabase
        .from("whitelabel_config")
        .select("modules_crm, modules_financeiro, modules_mensageria, modules_ia, modules_pzaafi, modules_intelligence")
        .eq("license_id", parentLicenseId)
        .maybeSingle()
      return data as ParentModules | null
    },
    enabled: !!parentLicenseId,
    staleTime: 60_000,
  })

  /**
   * Get the maximum value a child can allocate for a given resource,
   * optionally adding back the current child's allocation (for edits).
   */
  function getMaxForChild(
    resource: keyof PoolAvailable,
    currentChildValue: number = 0,
  ): number {
    if (!available) return 999 // no limits loaded yet
    const avail = available[resource] ?? 999
    return avail + currentChildValue
  }

  /**
   * Validate that a requested allocation fits.
   * Returns null if OK, or error string.
   */
  function validateAllocation(
    attendants: number,
    devicesWeb: number,
    devicesMeta: number,
    hasAi: boolean,
    currentChildId?: string,
  ): string | null {
    if (!parentLimits || !available) return null // can't validate yet

    const errors: string[] = []

    if (parentLimits.pool_max_attendants > 0 && attendants > (available.attendants ?? 999)) {
      errors.push(`Atendentes: maximo disponivel ${available.attendants}`)
    }
    if (parentLimits.pool_max_devices_web > 0 && devicesWeb > (available.devices_web ?? 999)) {
      errors.push(`Dispositivos Web: maximo disponivel ${available.devices_web}`)
    }
    if (parentLimits.pool_max_devices_meta > 0 && devicesMeta > (available.devices_meta ?? 999)) {
      errors.push(`Dispositivos Meta: maximo disponivel ${available.devices_meta}`)
    }
    if (hasAi && !parentLimits.has_ai_module) {
      errors.push("Modulo I.A. nao habilitado na licenca pai")
    }

    return errors.length > 0 ? errors.join("; ") : null
  }

  return {
    parentLimits,
    consumed,
    available,
    parentModules,
    getMaxForChild,
    validateAllocation,
    isPoolConfigured: !!parentLimits && (
      (parentLimits.pool_max_attendants ?? 0) > 0 ||
      (parentLimits.pool_max_devices_web ?? 0) > 0
    ),
  }
}
