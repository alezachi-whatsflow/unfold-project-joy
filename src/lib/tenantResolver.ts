/**
 * Resolve tenant_id from authenticated user session.
 * Use this in non-React contexts (services, queries).
 * For React components, prefer useTenantId() hook.
 */
import { supabase } from "@/integrations/supabase/client";

let _cachedTenantId: string | null = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000; // 1 min

export async function getTenantId(): Promise<string> {
  // Check memory cache
  if (_cachedTenantId && Date.now() - _cacheTs < CACHE_TTL) {
    return _cachedTenantId;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario nao autenticado.");

  const { data } = await supabase
    .from("user_tenants")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!data?.tenant_id) throw new Error("Tenant nao encontrado.");

  _cachedTenantId = data.tenant_id;
  _cacheTs = Date.now();
  return data.tenant_id;
}

/** Clear cache (call on logout) */
export function clearTenantCache() {
  _cachedTenantId = null;
  _cacheTs = 0;
}
