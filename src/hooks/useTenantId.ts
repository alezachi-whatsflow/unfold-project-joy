import { useUserTenants } from "./useUserTenants";

/**
 * Centralized hook to get the current user's tenant ID.
 * Replaces all hardcoded "00000000-0000-0000-0000-000000000001" references.
 */
export function useTenantId(): string | undefined {
  const { data: tenants } = useUserTenants();
  return tenants?.[0]?.tenant_id;
}
