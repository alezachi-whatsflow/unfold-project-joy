import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Building2, KeyRound, ScrollText, Settings,
  ChevronLeft, ChevronRight, LogOut, Shield, Loader2,
  Briefcase, Activity, Server, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import whatsflowLogo from "@/assets/whatsflow-logo.png";

const NAV = [
  { to: "/god-admin", icon: LayoutDashboard, label: "Dashboard Global", end: true },
  { to: "/god-admin/whitelabels", icon: Building2, label: "WhiteLabels" },
  { to: "/god-admin/direct-clients", icon: Briefcase, label: "Clientes Diretos" },
  { to: "/god-admin/licencas", icon: KeyRound, label: "Licenças" },
  { to: "/god-admin/ambientes", icon: Server, label: "Ambientes" },
  { to: "/god-admin/audit", icon: ScrollText, label: "Audit Log" },
  { to: "/god-admin/flags", icon: Target, label: "Feature Flags" },
  { to: "/god-admin/config", icon: Settings, label: "Configurações" },
];

export default function GodAdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState<"production" | "development" | "all">("production");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const checkRole = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setRole(data?.role || null);
      setLoading(false);
    };
    checkRole();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "god_admin" && role !== "god_support") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-card transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Logo + badge */}
        <div className="flex flex-col gap-3 px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <img src={whatsflowLogo} alt="Whatsflow" className="h-8 w-8 shrink-0" />
            {!collapsed && (
              <Badge className="bg-amber-600 hover:bg-amber-700 text-[10px] shrink-0">
                <Shield className="h-2.5 w-2.5 mr-1" />
                GOD ADMIN
              </Badge>
            )}
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-foreground truncate">Whatsflow Central</span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 ${
                  isActive
                    ? "bg-amber-500/10 text-amber-600 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border p-3 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground"
            onClick={() => navigate("/")}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            {!collapsed && "Voltar ao App"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="h-3.5 w-3.5" />
            {!collapsed && "Sair"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-7"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-foreground">Portal God Admin</span>
            
            <Select value={environment} onValueChange={(v: "production" | "development" | "all") => setEnvironment(v)}>
              <SelectTrigger className="w-[180px] h-8 text-xs font-semibold">
                <SelectValue placeholder="Selecione o ambiente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">PRODUÇÃO</SelectItem>
                <SelectItem value="development">DESENVOLVIMENTO</SelectItem>
                <SelectItem value="all">AMBOS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              {user?.email}
            </span>
            <div className="h-8 w-8 rounded-full bg-amber-600/20 flex items-center justify-center text-xs font-bold text-amber-600">
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-50">
          <Outlet context={{ environment, setEnvironment }} />
        </div>
      </main>
    </div>
  );
}
