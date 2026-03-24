import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/types/roles';
import { DEFAULT_PERMISSIONS, type PermissionAction, type PermissionMatrix } from '@/config/permissions';

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
      return merged;
    }

    return base;
  }, [userRole, profile?.custom_permissions]);

  const isSuperAdmin = userRole === 'superadmin';

  const can = (module: string, action: PermissionAction): boolean => {
    if (isSuperAdmin) return true; // superadmin has unrestricted access to everything
    const mod = permissions[module];
    if (!mod) return false;
    return mod[action] ?? false;
  };

  const canView = (module: string) => can(module, 'view');
  const canCreate = (module: string) => can(module, 'create');
  const canEdit = (module: string) => can(module, 'edit');
  const canDelete = (module: string) => can(module, 'delete');
  const canExport = (module: string) => can(module, 'export');

  return {
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    userRole,
    permissions,
    isSuperAdmin: userRole === 'superadmin',
    isAdmin: userRole === 'admin' || userRole === 'superadmin',
    isGestor: userRole === 'gestor',
    isPermissionsLoading: isAuthLoading || (Boolean(user?.id) && isLoading),
    permissionsError,
  };
}

