import { useState, useEffect } from "react";
import { Outlet, NavLink, useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, KeyRound, Palette, ScrollText, Settings,
  LogOut, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "clientes", icon: Users, label: "Meus Clientes" },
  { to: "licencas", icon: KeyRound, label: "Licenças" },
  { to: "branding", icon: Palette, label: "Branding" },
  { to: "suporte", icon: ScrollText, label: "Suporte / Audit" },
  { to: "config", icon: Settings, label: "Configurações" },
];

export default function WLLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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

  if (profileLoading || configLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  const ALLOWED_ROLES = ['wl_admin', 'wl_support', 'god_admin', 'nexus_superadmin', 'nexus_dev_senior', 'nexus_suporte_senior'];
  if (!ALLOWED_ROLES.includes(profile?.role || '')) {
    return <Navigate to="/" replace />;
  }

  const branding = {
    app_name: wlConfig?.display_name || slug || 'WhiteLabel',
    primary_color: wlConfig?.primary_color || '#11BC76',
    logo_url: wlConfig?.logo_url || null,
  };
  const wlLicenseId = wlConfig?.license_id || null;

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: 'var(--wl-bg, #0F172A)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col border-r transition-all duration-300 z-20 shrink-0"
        style={{
          backgroundColor: 'var(--wl-secondary, #1E293B)',
          borderColor: 'rgba(255,255,255,0.05)',
          width: collapsed ? '64px' : '240px',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div
            className="flex items-center justify-center shrink-0 rounded-lg text-white font-bold text-sm"
            style={{ backgroundColor: 'var(--wl-primary)', width: 32, height: 32 }}
          >
            {branding.app_name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <span className="text-sm font-bold text-white truncate">{branding.app_name}</span>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const path = `/wl/${slug}${item.to ? '/' + item.to : ''}`;
            return (
              <NavLink
                key={item.to}
                to={path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all ${
                    isActive ? 'text-white font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`
                }
                style={(navData) => ({
                  backgroundColor: navData.isActive ? 'var(--wl-primary)' : undefined,
                })}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t p-3 space-y-1" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-white/60 hover:text-white hover:bg-white/5"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && 'Sair'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8 text-white/40 hover:bg-white/5"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="sticky top-0 z-10 border-b px-6 py-3 flex items-center justify-between"
          style={{ backgroundColor: 'var(--wl-bg)', borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <span className="text-sm font-semibold text-white/80">Portal Administrativo</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 hidden sm:block">{user?.email}</span>
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--wl-accent)' }}
            >
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ branding, wlLicenseId }} />
        </div>
      </main>
    </div>
  );
}
