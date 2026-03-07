import { LayoutDashboard, PenLine, Users, Package, Radar, Receipt, DollarSign, Settings, LogOut, UserCheck, FileBarChart, TrendingUp, ChevronLeft, ChevronRight, Menu, X, FileText } from "lucide-react";
import whatsflowLogo from "@/assets/whatsflow-logo.png";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSidebarPrefs } from "@/contexts/SidebarPrefsContext";
import { useIsMobile } from "@/hooks/use-mobile";

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
      { title: "Fiscal", url: "/fiscal", icon: FileText },
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
  const isMobile = useIsMobile();
  const location = useLocation();

  const isRailLayout = prefs.layout === "rail";

  const [collapsed, setCollapsed] = useState(() => {
    if (isRailLayout) return true;
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved !== null) return saved === "collapsed";
      // "standard" layout defaults expanded; others default collapsed
      return prefs.layout !== "standard";
    } catch { return false; }
  });

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

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

  const itemStyle = useMemo(() => {
    const density = prefs.density;
    const isCompactLayout = prefs.layout === "compact";
    if (density === "comfortable") return { padding: isCompactLayout ? "7px 10px" : "10px 12px", fontSize: 14 };
    if (density === "compact") return { padding: "5px 10px", fontSize: 12 };
    return { padding: isCompactLayout ? "5px 10px" : "7px 10px", fontSize: 13 };
  }, [prefs.density, prefs.layout]);

  // Hover expand/collapse (not for Rail or mobile)
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = useCallback(() => {
    if (isMobile || isRailLayout) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverExpanded(true), 200);
  }, [isMobile, isRailLayout]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile || isRailLayout) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverExpanded(false), 300);
  }, [isMobile, isRailLayout]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const isCollapsed = isMobile ? false : ((collapsed || isRailLayout) && !hoverExpanded);
  const sidebarWidth = isCollapsed ? "w-16" : "w-60";

  const isItemActive = useCallback((url: string, end?: boolean) => {
    if (end) return location.pathname === url;
    return location.pathname.startsWith(url);
  }, [location.pathname]);

  const sidebarContent = (
    <aside
      role="navigation"
      aria-label="Menu principal"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "flex flex-col h-screen shrink-0 overflow-hidden",
        isMobile ? "w-60" : sidebarWidth
      )}
      style={{
        background: "#111118",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        transition: isMobile ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Header */}
      <div className="flex items-center px-3 py-4 relative" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className={cn("flex items-center gap-3 min-w-0", isCollapsed && !isMobile && "justify-center w-full")}>
          <img src={whatsflowLogo} alt="Whatsflow" className="h-8 w-8 rounded-lg shrink-0" />
          {(!isCollapsed || isMobile) && (
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold truncate" style={{ color: "rgba(255,255,255,0.93)" }}>Whatsflow</h2>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Finance</p>
            </div>
          )}
        </div>
        {isMobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md hover:[background:rgba(255,255,255,0.07)] transition-colors"
            style={{ width: 28, height: 28 }}
          >
            <X className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        ) : !isRailLayout ? (
          <button
            onClick={() => setCollapsed((p) => !p)}
            title={collapsed ? "Expandir menu" : "Colapsar menu"}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md hover:[background:rgba(255,255,255,0.07)] transition-colors"
            style={{ width: 24, height: 24, borderRadius: 6 }}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.4)" }} /> : <ChevronLeft className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />}
          </button>
        ) : null}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {(!isCollapsed || isMobile) && (
              <span className="select-none block" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", paddingTop: 16, paddingBottom: 4, paddingLeft: 8 }}>
                {group.label}
              </span>
            )}
            {isCollapsed && !isMobile && <div className="pt-3" />}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isItemActive(item.url, "end" in item ? item.end : false);
                return (
                  <li key={item.title}>
                    <RouterNavLink
                      to={item.url}
                      end={"end" in item ? item.end : false}
                      title={isCollapsed && !isMobile ? item.title : undefined}
                      aria-current={active ? "page" : undefined}
                      style={{
                        padding: isCollapsed && !isMobile ? "8px 0" : itemStyle.padding,
                        fontSize: isCollapsed && !isMobile ? 13 : itemStyle.fontSize,
                      }}
                      className={({ isActive }) => cn(menuItemBase, "rounded-lg", isCollapsed && !isMobile ? "justify-center" : "gap-2", isActive ? menuItemActive : menuItemDefault)}
                    >
                      <span className="relative shrink-0 flex items-center justify-center">
                        <item.icon className="h-4 w-4 opacity-60" />
                        {"badgeKey" in item && item.badgeKey === "overdue" && isCollapsed && !isMobile && overdueCount && overdueCount > 0 && (
                          <span className="absolute -top-1 -right-1 rounded-full" style={{ width: 8, height: 8, background: "#ef4444" }} />
                        )}
                      </span>
                      {(!isCollapsed || isMobile) && (
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
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {(!isCollapsed || isMobile) && <div className="mb-2 truncate text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{user?.email}</div>}
        <Button variant="ghost" size="sm" onClick={handleLogout} title={isCollapsed && !isMobile ? "Sair" : undefined} className={cn("w-full hover:text-foreground", isCollapsed && !isMobile ? "justify-center px-0" : "justify-start")} style={{ color: "rgba(255,255,255,0.4)" }}>
          <LogOut className={cn("h-4 w-4", (!isCollapsed || isMobile) && "mr-2")} /> {(!isCollapsed || isMobile) && "Sair"}
        </Button>
      </div>
    </aside>
  );

  // Mobile: drawer with overlay
  if (isMobile) {
    return (
      <>
        {/* Hamburger trigger in header */}
        <MobileTrigger onOpen={() => setMobileOpen(true)} />
        {/* Overlay + Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <div className="relative z-10 animate-slide-in-right" style={{ animationDuration: "200ms" }}>
              {sidebarContent}
            </div>
          </div>
        )}
      </>
    );
  }

  return sidebarContent;
}

/** Small hamburger button injected into the header area on mobile */
function MobileTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed top-3 left-3 z-40 flex items-center justify-center rounded-md md:hidden"
      style={{ width: 36, height: 36, background: "#111118", border: "1px solid rgba(255,255,255,0.1)" }}
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" style={{ color: "rgba(255,255,255,0.6)" }} />
    </button>
  );
}
