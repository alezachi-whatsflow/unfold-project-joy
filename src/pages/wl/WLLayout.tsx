import { useState, useEffect } from "react";
import { Outlet, NavLink, useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, KeyRound, Palette, ScrollText, Settings,
  LogOut, ChevronLeft, ChevronRight, Loader2, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV = [
  { to: "", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "clientes", icon: Users, label: "Meus Clientes" },
  { to: "licencas", icon: KeyRound, label: "Licencas" },
  { to: "branding", icon: Palette, label: "Branding" },
  { to: "suporte", icon: ScrollText, label: "Suporte / Audit" },
  { to: "config", icon: Settings, label: "Configuracoes" },
];

export default function WLLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['wl-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('role, account_id, license_id')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: nexusUser, isLoading: nexusLoading } = useQuery({
    queryKey: ['wl-nexus-user', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('nexus_users')
        .select('role, is_active')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: wlConfig, isLoading: configLoading } = useQuery({
    queryKey: ['wl-config', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('whitelabel_config')
        .select('id, display_name, logo_url, primary_color, support_email, support_whatsapp, license_id')
        .eq('slug', slug)
        .single();
      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    const color = wlConfig?.primary_color || '#11BC76';
    document.documentElement.style.setProperty('--wl-primary', color);
    document.documentElement.style.setProperty('--wl-secondary', '#1E293B');
    document.documentElement.style.setProperty('--wl-accent', '#6366F1');
    document.documentElement.style.setProperty('--wl-bg', '#0F172A');
    return () => {
      ['--wl-primary', '--wl-secondary', '--wl-accent', '--wl-bg'].forEach(v =>
        document.documentElement.style.removeProperty(v)
      );
    };
  }, [wlConfig?.primary_color]);

  if (profileLoading || configLoading || nexusLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isNexusUser = !!nexusUser?.is_active;
  const ALLOWED_ROLES = ['wl_admin', 'wl_support', 'god_admin'];
  if (!isNexusUser && !ALLOWED_ROLES.includes(profile?.role || '')) {
    return <Navigate to="/" replace />;
  }

  const branding = {
    app_name: wlConfig?.display_name || slug || 'WhiteLabel',
    primary_color: wlConfig?.primary_color || '#11BC76',
    logo_url: wlConfig?.logo_url || null,
  };
  const wlLicenseId = wlConfig?.license_id || null;

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Mobile hamburger */}
      {isMobile && !mobileOpen && (
        <button onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 flex items-center justify-center bg-card border border-border rounded-md"
          style={{ width: 40, height: 40 }}>
          <Menu className="h-5 w-5 text-foreground" />
        </button>
      )}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-card transition-all duration-300 z-50 shrink-0 ${
          isMobile ? `fixed inset-y-0 left-0 w-[240px] ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}` : ''
        }`}
        style={{
          width: isMobile ? 240 : collapsed ? 64 : 240,
        }}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div
            className="flex items-center justify-center shrink-0 text-white font-bold text-sm rounded-md"
            style={{ backgroundColor: 'var(--wl-primary)', width: 32, height: 32 }}
          >
            {branding.app_name.charAt(0).toUpperCase()}
          </div>
          {(!collapsed || isMobile) && (
            <span className="text-sm font-bold text-foreground truncate">{branding.app_name}</span>
          )}
          {isMobile && (
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const path = `/partners/${slug}${item.to ? '/' + item.to : ''}`;
            return (
              <NavLink
                key={item.to}
                to={path}
                end={item.end}
                onClick={() => isMobile && setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm transition-all ${
                    isActive ? 'text-white font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }
                style={(navData) => ({
                  backgroundColor: navData.isActive ? 'var(--wl-primary)' : undefined,
                })}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {(!collapsed || isMobile) && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && 'Sair'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8 text-muted-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-10 bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{isMobile && <span className="inline-block w-8" />}Portal Administrativo</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--wl-accent)' }}
            >
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-background">
          <Outlet context={{ branding, wlLicenseId }} />
        </div>
      </main>
    </div>
  );
}
