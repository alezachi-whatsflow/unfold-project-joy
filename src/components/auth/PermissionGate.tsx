import { usePermissions } from '@/hooks/usePermissions';
import type { PermissionAction } from '@/config/permissions';

interface PermissionGateProps {
  module: string;
  action: PermissionAction;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ module, action, fallback = null, children }: PermissionGateProps) {
  const { can, isPermissionsLoading } = usePermissions();

  if (isPermissionsLoading) {
    return <>{fallback}</>;
  }

  if (!can(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

