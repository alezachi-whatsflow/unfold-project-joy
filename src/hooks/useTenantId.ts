import { useUserTenants } from "./useUserTenants";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized hook to get the current tenant ID.
 * Priority: URL slug → localStorage override → user's first tenant.
 * This allows Nexus admins to "Acessar como Admin" and see the correct tenant data.
 */
export function useTenantId(): string | undefined {
  const { slug } = useParams<{ slug?: string }>();
  const { data: tenants } = useUserTenants();

  // Resolve tenant_id from URL slug
  const { data: slugTenant } = useQuery({
    queryKey: ["tenant-by-slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      return data?.id || null;
    },
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });

  // Priority: URL slug → user's own tenant
  // Note: localStorage override removed — URL slug is the source of truth
  if (slugTenant) return slugTenant;

  return tenants?.[0]?.tenant_id;
}
