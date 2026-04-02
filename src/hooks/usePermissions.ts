import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/types/roles';
import { DEFAULT_PERMISSIONS, SCOPED_MODULES, type PermissionAction, type PermissionMatrix } from '@/config/permissions';

export function usePermissions() {
  const { user, loading: isAuthLoading } = useAuth();

  const {
    data: profile,
    isLoading,
    error: permissionsError,
  } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role, custom_permissions')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !isAuthLoading,
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const userRole: UserRole = (profile?.role && profile.role in DEFAULT_PERMISSIONS
    ? (profile.role as UserRole)
    : 'consultor');

  const permissions = useMemo(() => {
    const base = DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.consultor;
    const custom = profile?.custom_permissions as PermissionMatrix | null | undefined;

    if (custom && typeof custom === 'object') {
      const merged: PermissionMatrix = {};
      for (const mod of Object.keys(base)) {
        merged[mod] = custom[mod] ? { ...base[mod], ...custom[mod] } : { ...base[mod] };
      }
      for (const mod of Object.keys(custom)) {
        if (!merged[mod]) merged[mod] = { ...custom[mod] };
      }

      // Backward compat: if legacy 'view' is set but 'view_all'/'view_owned' are not,
      // default to view_all=true for admin roles, view_owned=true for others
      for (const mod of Object.keys(merged)) {
        const p = merged[mod];
        if (p.view && p.view_all === undefined && p.view_owned === undefined) {
          if (['superadmin', 'admin', 'gestor'].includes(userRole)) {
            p.view_all = true;
          } else {
            p.view_owned = true;
          }
        }
      }

      return merged;
    }

    return base;
  }, [userRole, profile?.custom_permissions]);

  const isSuperAdmin = userRole === 'superadmin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;
  const isGestor = userRole === 'gestor';

  /**
   * Check if user has a specific permission.
   * Admins (superadmin/admin) always return true for view_all, view_owned, transfer.
   */
  const can = (module: string, action: PermissionAction): boolean => {
    if (isSuperAdmin) return true;
    if (isAdmin && ['view_all', 'view_owned', 'transfer'].includes(action)) return true;

    const mod = permissions[module];
    if (!mod) return false;

    // Backward compat: 'view' resolves to view_all for admins
    if (action === 'view_all' && mod.view_all === undefined) {
      return isGestor ? true : (mod.view ?? false);
    }
    if (action === 'view_owned' && mod.view_owned === undefined) {
      return mod.view ?? false;
    }

    return (mod as any)[action] ?? false;
  };

  /**
   * Check if user can only see their own records for a scoped module.
   * Returns true if user has view_owned but NOT view_all.
   */
  const isOwnedOnly = (module: string): boolean => {
    if (isSuperAdmin || isAdmin || isGestor) return false;
    const mod = permissions[module];
    if (!mod) return true;
    if (mod.view_all) return false;
    return mod.view_owned ?? false;
  };

  const canView = (module: string) => can(module, 'view');
  const canCreate = (module: string) => can(module, 'create');
  const canEdit = (module: string) => can(module, 'edit');
  const canDelete = (module: string) => can(module, 'delete');
  const canExport = (module: string) => can(module, 'export');
  const canViewAll = (module: string) => can(module, 'view_all');
  const canTransfer = (module: string) => can(module, 'transfer');

  return {
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canViewAll,
    canTransfer,
    isOwnedOnly,
    userRole,
    userId: user?.id,
    permissions,
    isSuperAdmin,
    isAdmin,
    isGestor,
    isPermissionsLoading: isAuthLoading || (Boolean(user?.id) && isLoading),
    permissionsError,
  };
}
