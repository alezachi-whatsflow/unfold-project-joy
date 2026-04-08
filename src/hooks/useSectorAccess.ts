/**
 * useSectorAccess — Central sector-based access control hook.
 *
 * Determines which departments/sectors the current user can access.
 * Used across: Caixa de Entrada, Vendas, Atividades, Inteligencia Digital, Suporte.
 *
 * Access Rules:
 * 1. super_admin = true → access all
 * 2. view_all_chats = true → access all
 * 3. user has no department assignments → access all (legacy behavior)
 * 4. user has department assignments → access only those departments + unassigned
 * 5. Otherwise → deny
 */
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useTenantId } from "@/hooks/useTenantId"
import { usePermissions } from "@/hooks/usePermissions"

interface SectorAccess {
  /** Whether the user can see all sectors (admin, view_all, or no assignments) */
  canViewAll: boolean
  /** List of department IDs the user is assigned to (empty = all) */
  departmentIds: string[]
  /** Whether the user has any sector restrictions */
  isRestricted: boolean
  /** Check if user can access a specific department */
  canAccessDepartment: (departmentId: string | null | undefined) => boolean
  /** Filter an array of items by their department_id */
  filterBySector: <T extends { department_id?: string | null }>(items: T[]) => T[]
  /** Loading state */
  isLoading: boolean
}

export function useSectorAccess(): SectorAccess {
  const { user } = useAuth()
  const tenantId = useTenantId()
  const { isSuperAdmin, isAdmin } = usePermissions()

  // Fetch user's profile for view_all_chats flag
  const { data: profile } = useQuery({
    queryKey: ["sector-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data } = await supabase
        .from("profiles")
        .select("view_all_chats, role")
        .eq("id", user.id)
        .maybeSingle()
      return data
    },
    enabled: !!user?.id,
    staleTime: 120_000,
  })

  // Fetch user's department assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["sector-assignments", user?.id, tenantId],
    queryFn: async () => {
      if (!user?.id || !tenantId) return []
      const { data } = await (supabase as any)
        .from("agent_departments")
        .select("department_id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
      return (data || []).map((d: any) => d.department_id) as string[]
    },
    enabled: !!user?.id && !!tenantId,
    staleTime: 120_000,
  })

  const departmentIds = assignments || []

  // Determine if user can view all
  const canViewAll =
    isSuperAdmin ||
    isAdmin ||
    !!profile?.view_all_chats ||
    departmentIds.length === 0 // No assignments = legacy: see all

  const isRestricted = !canViewAll && departmentIds.length > 0

  // Check access to a specific department
  const canAccessDepartment = (departmentId: string | null | undefined): boolean => {
    if (canViewAll) return true
    if (!departmentId) return true // Unassigned items always visible
    return departmentIds.includes(departmentId)
  }

  // Filter array by sector
  const filterBySector = <T extends { department_id?: string | null }>(items: T[]): T[] => {
    if (canViewAll) return items
    return items.filter(item => canAccessDepartment(item.department_id))
  }

  return {
    canViewAll,
    departmentIds,
    isRestricted,
    canAccessDepartment,
    filterBySector,
    isLoading,
  }
}
