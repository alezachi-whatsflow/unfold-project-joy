import { usePermissions } from '@/hooks/usePermissions';
import type { PermissionAction } from '@/config/permissions';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  module: string;
  action?: PermissionAction;
  inline?: boolean;
  children: React.ReactNode;
}

export function ProtectedRoute({ module, action = 'view', inline = false, children }: ProtectedRouteProps) {
  const { can } = usePermissions();

  if (!can(module, action)) {
    if (inline) {
      return <AccessDeniedInline />;
    }
    return <Navigate to="/acesso-negado" replace />;
  }

  return <>{children}</>;
}

function AccessDeniedInline() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full p-4 mb-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground">Acesso Restrito</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Você não tem permissão para acessar esta área.
      </p>
    </div>
  );
}
