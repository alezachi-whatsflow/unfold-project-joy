import { useUserTenants } from "./useUserTenants";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized hook to get the current tenant ID.
 * Priority: URL slug (if found) → user's first tenant.
 * This allows Nexus admins to "Acessar como Admin" and see the correct tenant data.
 */
export function useTenantId(): string | undefined {
  const { slug } = useParams<{ slug?: string }>();
  const { data: tenants } = useUserTenants();
  const userTenantId = tenants?.[0]?.tenant_id;

  // Resolve tenant_id from URL slug
  const { data: slugTenantId, isLoading: slugLoading } = useQuery({
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

  // If URL has a slug and it resolved to a tenant, use it (Nexus admin access)
  if (slug && slugTenantId) return slugTenantId;

  // Otherwise always use the user's own tenant
  // (covers: no slug in URL, slug not found, slug still loading)
  return userTenantId;
}
