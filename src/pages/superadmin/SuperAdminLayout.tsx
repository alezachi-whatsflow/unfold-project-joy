import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  LayoutDashboard, Building2, KeyRound, ScrollText, Settings,
  ChevronLeft, ChevronRight, LogOut, Shield, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigate } from "react-router-dom";
import whatsflowLogo from "@/assets/whatsflow-logo.png";

const NAV = [
  { to: "/superadmin", icon: LayoutDashboard, label: "Dashboard Global", end: true },
  { to: "/superadmin/tenants", icon: Building2, label: "Tenants" },
  { to: "/superadmin/licencas", icon: KeyRound, label: "Licenças" },
  { to: "/superadmin/audit", icon: ScrollText, label: "Audit Log" },
  { to: "/superadmin/config", icon: Settings, label: "Configurações" },
];

export default function SuperAdminLayout() {
  const { user, signOut } = useAuth();
  const { isSuperAdmin, isPermissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (isPermissionsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
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
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <img src={whatsflowLogo} alt="Whatsflow" className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">Whatsflow</span>
              <Badge variant="destructive" className="text-[9px] shrink-0">
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                SUPER
              </Badge>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
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
            {!collapsed && "Portal Tenant"}
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
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-foreground">Portal SuperAdmin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {user?.email}
            </span>
            <div className="h-7 w-7 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold text-destructive">
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
