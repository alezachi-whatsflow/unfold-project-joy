import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, LayoutDashboard, FileText, Users, ChevronLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function WhitelabelLayout() {
  const { whitelabelSlug } = useParams<{ whitelabelSlug: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: config, isLoading } = useQuery({
    queryKey: ['whitelabel-config', whitelabelSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whitelabel_config')
        .select('*, licenses!inner(id, tenant_id, license_type, status, whitelabel_slug)')
        .eq('slug', whitelabelSlug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!whitelabelSlug,
  });

  // Check authorization: user must be nexus user OR belong to this whitelabel's tenant
  const { data: authorized, isLoading: authChecking } = useQuery({
    queryKey: ['whitelabel-auth', whitelabelSlug, user?.id],
    queryFn: async () => {
      if (!user?.id || !config) return false;
      // Check if nexus user (can access any lab)
      const { data: nexus } = await supabase
        .from('nexus_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (nexus) return true;
      // Check if user belongs to this whitelabel's tenant
      const { data: ut } = await supabase
        .from('user_tenants')
        .select('id')
        .eq('user_id', user.id)
        .eq('tenant_id', config.licenses?.tenant_id)
        .maybeSingle();
      return !!ut;
    },
    enabled: !!user?.id && !!config,
  });

  if (isLoading || authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return <Navigate to="/acesso-negado" replace />;
  }

  if (authorized === false) {
    return <Navigate to="/acesso-negado" replace />;
  }

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: `/lab/${whitelabelSlug}`, end: true },
    { label: 'Licenças', icon: FileText, path: `/lab/${whitelabelSlug}/licencas` },
    { label: 'Equipe', icon: Users, path: `/lab/${whitelabelSlug}/equipe` },
  ];

  const primaryColor = config.primary_color || '#11BC76';

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex flex-col w-64 border-r border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          {config.logo_url ? (
            <img src={config.logo_url} alt={config.display_name} className="h-8 w-8 rounded-lg" />
          ) : (
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ background: primaryColor }}>
              {config.display_name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">{config.display_name}</span>
            <Badge variant="outline" className="text-[9px] shrink-0 border-blue-500/50 text-blue-400 font-bold tracking-wider">
              LAB
            </Badge>
          </div>
        </div>

        <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg mx-2 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-muted-foreground" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-muted-foreground" onClick={() => { signOut(); navigate('/login'); }}>
            <LogOut className="h-3.5 w-3.5" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{config.display_name}</span>
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px] font-bold tracking-widest">
              WHITELABEL
            </Badge>
          </div>
        </header>
        <div className="p-6">
          <Outlet context={{ config }} />
        </div>
      </main>
    </div>
  );
}
