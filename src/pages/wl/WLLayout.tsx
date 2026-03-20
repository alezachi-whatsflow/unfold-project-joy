import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, KeyRound, Palette, ScrollText, Settings,
  LogOut, Menu, X, ChevronLeft, ChevronRight, Loader2
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
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  // Fetch role and verify
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('role, account_id').eq('id', user.id).single();
      return data;
    },
    enabled: !!user
  });

  // Fetch branding using the slug
  const { data: branding, isLoading: brandingLoading } = useQuery({
    queryKey: ['wl-branding', slug],
    queryFn: async () => {
      // Dummy response for layout purposes, representing SendHit
      return {
        app_name: "SendHit Pro",
        primary_color: "#0EA5E9", // sky-500
        secondary_color: "#1E293B", // slate-800
        accent_color: "#6366F1", // indigo-500
        background_color: "#0F172A", // slate-950
        logo_url: null,
      };
    }
  });

  useEffect(() => {
    if (branding) {
      document.documentElement.style.setProperty('--wl-primary', branding.primary_color);
      document.documentElement.style.setProperty('--wl-secondary', branding.secondary_color);
      document.documentElement.style.setProperty('--wl-accent', branding.accent_color);
      document.documentElement.style.setProperty('--wl-bg', branding.background_color);
    }
    return () => {
      document.documentElement.style.removeProperty('--wl-primary');
      document.documentElement.style.removeProperty('--wl-secondary');
      document.documentElement.style.removeProperty('--wl-accent');
      document.documentElement.style.removeProperty('--wl-bg');
    }
  }, [branding]);

  if (profileLoading || brandingLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (profile?.role !== "wl_admin" && profile?.role !== "wl_support" && profile?.role !== "god_admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen w-full transition-colors duration-300" style={{ backgroundColor: 'var(--wl-bg, #0F172A)' }}>
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r transition-all duration-300 z-20`}
        style={{ 
          backgroundColor: 'var(--wl-secondary, #1E293B)',
          borderColor: 'rgba(255,255,255,0.05)',
          width: collapsed ? "64px" : "256px" 
        }}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div 
            className="flex items-center justify-center shrink-0 rounded-lg text-white font-bold"
            style={{ backgroundColor: 'var(--wl-primary)', width: '32px', height: '32px' }}
          >
            {branding?.app_name?.charAt(0) || "W"}
          </div>
          {!collapsed && (
            <span className="text-sm font-bold text-white truncate truncate">{branding?.app_name || "WhiteLabel"}</span>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto hidden-scrollbar">
          {NAV.map((item) => {
            const path = `/wl/${slug}${item.to ? '/' + item.to : ''}`;
            return (
              <NavLink
                key={item.to}
                to={path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? "text-white font-medium"
                      : "text-white/60 hover:text-white"
                  }`
                }
                style={(navData) => ({
                  backgroundColor: navData.isActive ? 'var(--wl-primary)' : 'transparent',
                })}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t p-3 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-white/60 hover:text-white hover:bg-white/5"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Sair"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8 text-white/50 hover:bg-white/5"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--wl-bg)', borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white/90">Portal Administrativo</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/60 hidden sm:inline-block">
              {user?.email}
            </span>
            <div 
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: 'var(--wl-accent)' }}
            >
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet context={{ branding }} />
        </div>
      </main>
    </div>
  );
}
