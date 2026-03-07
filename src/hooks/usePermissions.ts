import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/types/roles';
import { DEFAULT_PERMISSIONS, type PermissionAction, type AppModule, type ModulePermission, type PermissionMatrix } from '@/config/permissions';

export function usePermissions() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('role, custom_permissions')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const userRole: UserRole = (profile?.role as UserRole) || 'consultor';

  const permissions = useMemo(() => {
    const base = DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.consultor;
    // If custom_permissions exist, merge them over the base
    const custom = profile?.custom_permissions as PermissionMatrix | null | undefined;
    if (custom && typeof custom === 'object') {
      const merged: PermissionMatrix = {};
      for (const mod of Object.keys(base)) {
        merged[mod] = custom[mod] ? { ...base[mod], ...custom[mod] } : { ...base[mod] };
      }
      // Also include any modules only in custom
      for (const mod of Object.keys(custom)) {
        if (!merged[mod]) {
          merged[mod] = { ...custom[mod] };
        }
      }
      return merged;
    }
    return base;
  }, [userRole, profile?.custom_permissions]);

  const can = (module: string, action: PermissionAction): boolean => {
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
    isAdmin: userRole === 'admin',
    isGestor: userRole === 'gestor',
  };
}
