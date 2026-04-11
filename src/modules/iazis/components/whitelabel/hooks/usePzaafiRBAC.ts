import { useState, useEffect, useCallback } from 'react';
import {
  type PzaafiRole,
  type PzaafiPermission,
  getUserRole,
  hasPermission,
  getRolePermissions,
} from '../services/rbacService';

interface UsePzaafiRBACReturn {
  role: PzaafiRole | null;
  loading: boolean;
  error: string | null;
  can: (permission: PzaafiPermission) => boolean;
  permissions: PzaafiPermission[];
  refetch: () => void;
}

/**
 * React hook for Pzaafi RBAC permission checks.
 */
export function usePzaafiRBAC(orgId: string | null): UsePzaafiRBACReturn {
  const [role, setRole] = useState<PzaafiRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = useCallback(async () => {
    if (!orgId) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userRole = await getUserRole(orgId);
      setRole(userRole);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch user role');
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  const can = useCallback(
    (permission: PzaafiPermission): boolean => {
      if (!role) return false;
      return hasPermission(role, permission);
    },
    [role]
  );

  const permissions = role ? getRolePermissions(role) : [];

  return { role, loading, error, can, permissions, refetch: fetchRole };
}
