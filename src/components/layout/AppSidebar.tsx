import { LayoutDashboard, PenLine, Users, Package, Radar, Receipt, DollarSign, Settings, LogOut, UserCheck, FileBarChart, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import whatsflowLogo from "@/assets/whatsflow-logo.png";
import { NavLink as RouterNavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { useSidebarPrefs } from "@/contexts/SidebarPrefsContext";

const COLLAPSE_KEY = "wf_sidebar_state";

const menuGroups = [
  {
    label: "PRINCIPAL",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
      { title: "Cobranças", url: "/cobrancas", icon: Receipt, badgeKey: "overdue" as const },
    ],
  },
  {
    label: "FINANCEIRO",
    items: [
      { title: "Inserir Dados", url: "/input", icon: PenLine },
      { title: "Receitas", url: "/revenue", icon: TrendingUp },
      { title: "Despesas", url: "/expenses", icon: DollarSign },
      { title: "Comissões", url: "/comissoes", icon: UserCheck },
    ],
  },
  {
    label: "CLIENTES & PRODUTOS",
    items: [
      { title: "Clientes", url: "/customers", icon: Users },
      { title: "Produtos", url: "/products", icon: Package },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { title: "Intelligence", url: "/intelligence", icon: Radar },
      { title: "Relatórios", url: "/reports", icon: FileBarChart },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { title: "Configurações", url: "/settings", icon: Settings },
    ],
  },
];

const menuItemBase = "flex items-center no-underline transition-all duration-150 ease-in-out";
const menuItemDefault = "[color:rgba(255,255,255,0.45)] hover:[background:rgba(255,255,255,0.05)] hover:[color:rgba(255,255,255,0.85)]";
const menuItemActive = "[background:rgba(74,222,128,0.10)] [border:1px_solid_rgba(74,222,128,0.18)] [color:#4ade80] font-medium [&>svg]:opacity-100";

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const { prefs } = useSidebarPrefs();

  // Rail layout = always collapsed, no toggle
  const isRailLayout = prefs.layout === "rail";

  const [collapsed, setCollapsed] = useState(() => {
    if (isRailLayout) return true;
    try { return localStorage.getItem(COLLAPSE_KEY) === "collapsed"; } catch { return false; }
  });

  useEffect(() => {
    if (isRailLayout) { setCollapsed(true); return; }
  }, [isRailLayout]);

  useEffect(() => {
    if (!isRailLayout) {
      try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "collapsed" : "expanded"); } catch {}
    }
  }, [collapsed, isRailLayout]);

  const { data: overdueCount } = useQuery({
    queryKey: ["overdue-payments-count"],
    queryFn: async () => {
      const { count } = await supabase.from("asaas_payments").select("*", { count: "exact", head: true }).eq("status", "OVERDUE");
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  const handleLogout = async () => {
    try { await signOut(); toast.success("Logout realizado"); } catch { toast.error("Erro ao sair"); }
  };

  // Derive padding & font-size from density + layout
  const itemStyle = useMemo(() => {
    const density = prefs.density;
    const isCompactLayout = prefs.layout === "compact";
    if (density === "comfortable") return { padding: isCompactLayout ? "7px 10px" : "10px 12px", fontSize: 14 };
    if (density === "compact") return { padding: "5px 10px", fontSize: 12 };
    // default
    return { padding: isCompactLayout ? "5px 10px" : "7px 10px", fontSize: 13 };
  }, [prefs.density, prefs.layout]);

  const isCollapsed = collapsed || isRailLayout;
  const sidebarWidth = isCollapsed ? "w-16" : "w-60";

  return (
    <aside
      className={cn("flex flex-col h-screen shrink-0 border-r border-sidebar-border bg-sidebar overflow-hidden", sidebarWidth)}
      style={{ transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1)" }}
    >
      {/* Header */}
      <div className="flex items-center border-b border-sidebar-border px-3 py-4 relative">
        <div className={cn("flex items-center gap-3 min-w-0", isCollapsed && "justify-center w-full")}>
          <img src={whatsflowLogo} alt="Whatsflow" className="h-8 w-8 rounded-lg shrink-0" />
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-sidebar-foreground truncate">Whatsflow</h2>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Finance</p>
            </div>
          )}
        </div>
        {!isRailLayout && (
          <button
            onClick={() => setCollapsed((p) => !p)}
            title={collapsed ? "Expandir menu" : "Colapsar menu"}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md hover:[background:rgba(255,255,255,0.07)] transition-colors"
            style={{ width: 24, height: 24, borderRadius: 6 }}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {!isCollapsed && (
              <span className="select-none block" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", paddingTop: 16, paddingBottom: 4, paddingLeft: 8 }}>
                {group.label}
              </span>
            )}
            {isCollapsed && <div className="pt-3" />}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.title}>
                  <RouterNavLink
                    to={item.url}
                    end={"end" in item ? item.end : false}
                    title={isCollapsed ? item.title : undefined}
                    style={{ padding: isCollapsed ? "8px 0" : itemStyle.padding, fontSize: isCollapsed ? 13 : itemStyle.fontSize }}
                    className={({ isActive }) => cn(menuItemBase, "rounded-lg", isCollapsed ? "justify-center" : "gap-2", isActive ? menuItemActive : menuItemDefault)}
                  >
                    <span className="relative shrink-0 flex items-center justify-center">
                      <item.icon className="h-4 w-4 opacity-60" />
                      {"badgeKey" in item && item.badgeKey === "overdue" && isCollapsed && overdueCount && overdueCount > 0 && (
                        <span className="absolute -top-1 -right-1 rounded-full" style={{ width: 8, height: 8, background: "#ef4444" }} />
                      )}
                    </span>
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.title}</span>
                        {"badgeKey" in item && item.badgeKey === "overdue" && overdueCount && overdueCount > 0 ? (
                          <span className="ml-auto flex items-center justify-center shrink-0" style={{ background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", lineHeight: 1 }}>
                            {overdueCount}
                          </span>
                        ) : null}
                      </>
                    )}
                  </RouterNavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-sidebar-border p-3">
        {!isCollapsed && <div className="mb-2 truncate text-xs text-muted-foreground">{user?.email}</div>}
        <Button variant="ghost" size="sm" onClick={handleLogout} title={isCollapsed ? "Sair" : undefined} className={cn("w-full text-muted-foreground hover:text-foreground", isCollapsed ? "justify-center px-0" : "justify-start")}>
          <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} /> {!isCollapsed && "Sair"}
        </Button>
      </div>
    </aside>
  );
}
