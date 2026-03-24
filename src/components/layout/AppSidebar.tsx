import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { NavLink as RouterNavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { LogOut, User, Moon, Sun, ChevronLeft, ChevronRight, X, Menu, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useSidebarPrefs } from "@/contexts/SidebarPrefsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { ROLE_COLORS, ROLE_LABELS } from "@/types/roles";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_NAV_CATEGORIES } from "@/config/navigation";
import { WIDTH_MAP } from "@/types/sidebar";
import type { NavCategory, NavItem } from "@/types/sidebar";
import { getIcon } from "@/lib/iconMap";
import { sidebarIconMap } from "@/components/ui/SidebarIcons";
import whatsflowLogo from "@/assets/whatsflow-logo.png";

// ──────────────────────── shared styles ────────────────────────
const menuItemBase = "flex items-center no-underline transition-all duration-150 ease-in-out";
const menuItemDefault = "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground";
const menuItemActive = "bg-black/[0.06] text-primary font-semibold [&>svg]:opacity-100";

// ──────────────────────── badge queries ────────────────────────
function useBadges() {
  const { data: overdueCount } = useQuery({
    queryKey: ["overdue-payments-count"],
    queryFn: async () => {
      const { count } = await supabase.from("asaas_payments").select("*", { count: "exact", head: true }).eq("status", "OVERDUE");
      return count ?? 0;
    },
    refetchInterval: 60000,
  });
  const { data: vendasBadgeCount } = useQuery({
    queryKey: ["vendas-badge-count"],
    queryFn: async () => {
      const { count } = await supabase.from("negocios").select("*", { count: "exact", head: true }).in("status", ["proposta", "negociacao"]);
      return count ?? 0;
    },
    refetchInterval: 60000,
  });
  const badgeMap: Record<string, number> = {
    cobrancas: overdueCount ?? 0,
    vendas: vendasBadgeCount ?? 0,
  };
  return badgeMap;
}

// ──────────────────────── helpers ────────────────────────
function useFilteredCategories() {
  const { canView } = usePermissions();
  const { prefs, categories } = useSidebarPrefs();
  return useMemo(() => {
    const cats = (prefs.categoryOrganization === 'custom' && prefs.customCategories?.length)
      ? prefs.customCategories
      : categories;
    return cats
      .filter(c => c.visible !== false)
      .map(c => ({
        ...c,
        items: c.items.filter(item => item.visible !== false && canView(item.module)),
      }))
      .filter(c => c.items.length > 0);
  }, [canView, prefs.categoryOrganization, prefs.customCategories, categories]);
}

function usePinnedItems() {
  const { prefs } = useSidebarPrefs();
  const { canView } = usePermissions();
  const allItems = useMemo(() => {
    const items: NavItem[] = [];
    for (const cat of DEFAULT_NAV_CATEGORIES) {
      for (const item of cat.items) items.push(item);
    }
    return items;
  }, []);
  return useMemo(() => {
    if (!prefs.pinnedItems?.length) return [];
    return prefs.pinnedItems
      .map(id => allItems.find(i => i.id === id))
      .filter((i): i is NavItem => !!i && canView(i.module));
  }, [prefs.pinnedItems, allItems, canView]);
}

// ──────────────────────── user footer ────────────────────────
function UserFooter({ collapsed, isMobile }: { collapsed: boolean; isMobile: boolean }) {
  const { signOut, user } = useAuth();
  const { userRole } = usePermissions();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const roleColor = ROLE_COLORS[userRole] || '#888';
  const isCollapsed = collapsed && !isMobile;
  const emailDomain = user?.email?.split('@')[1];
  const companyName = emailDomain ? emailDomain.split('.')[0].charAt(0).toUpperCase() + emailDomain.split('.')[0].slice(1) : '';

  // Check if user has Nexus access
  const { data: isNexusUser } = useQuery({
    queryKey: ["is-nexus-user", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('nexus_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  const handleLogout = async () => {
    try { await signOut(); toast.success("Logout realizado"); } catch { toast.error("Erro ao sair"); }
  };

  return (
    <div className={cn("border-t border-black/[0.06]", isCollapsed ? "p-1" : "p-3")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn("flex items-center w-full rounded-lg transition-colors hover:bg-muted", isCollapsed ? "justify-center p-2" : "gap-3 p-2")}>
            <span className="flex items-center justify-center rounded-full text-[11px] font-bold shrink-0 bg-primary/10 text-primary" style={{ width: 32, height: 32 }}>
              {userName.charAt(0).toUpperCase()}
            </span>
            {!isCollapsed && (
              <div className="min-w-0 text-left flex-1">
                <p className="text-xs font-semibold truncate text-foreground">{userName}</p>
                <p className="text-[10px] truncate" style={{ color: roleColor }}>{ROLE_LABELS[userRole] || userRole}</p>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right" sideOffset={12} className="w-48 mb-2">
          <DropdownMenuItem onClick={() => navigate("/perfil")}><User className="mr-2 h-4 w-4" /> Meu Perfil</DropdownMenuItem>
          {isNexusUser && (
            <DropdownMenuItem onClick={() => navigate("/nexus")}>
              <Shield className="mr-2 h-4 w-4 text-emerald-400" /> Nexus Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setTheme(theme === "sapphire" ? "slate" : theme === "slate" ? "forest" : "sapphire")}>
            {theme === "sapphire" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Alternar Tema
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" /> Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ──────────────────────── sidebar header ────────────────────────
function SidebarHeader({ collapsed, isMobile, onCollapse, onCloseMobile }: { collapsed: boolean; isMobile: boolean; onCollapse: () => void; onCloseMobile: () => void }) {
  const isCollapsed = collapsed && !isMobile;
  return (
    <div className="flex items-center px-4 py-5 relative border-b border-black/[0.06]">
      <div className={cn("flex items-center gap-3 min-w-0", isCollapsed && "justify-center w-full")}>
        <img src={whatsflowLogo} alt="Whatsflow" className="h-8 w-8 rounded-lg shrink-0" />
        {!isCollapsed && (
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold truncate text-foreground">Whatsflow</h2>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Finance</p>
          </div>
        )}
      </div>
      {isMobile ? (
        <button onClick={onCloseMobile} className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md hover:bg-muted" style={{ width: 28, height: 28 }}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      ) : (
        <button onClick={onCollapse} title={collapsed ? "Expandir" : "Colapsar"} className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md hover:bg-muted" style={{ width: 24, height: 24 }}>
          {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      )}
    </div>
  );
}

// ──────────────────────── nav item renderer ────────────────────────
function NavItemRow({ item, collapsed, isMobile, badgeCount, density }: { item: NavItem; collapsed: boolean; isMobile: boolean; badgeCount: number; density: string }) {
  const { slug } = useParams<{ slug?: string }>();
  const basePath = slug ? `/app/${slug}` : '';
  const resolvedRoute = basePath + (item.route === '/' ? '' : item.route);

  // Use custom sidebar icon if available, fallback to Lucide
  const CustomIcon = sidebarIconMap[item.icon];
  const LucideIcon = getIcon(item.icon);
  const isCollapsed = collapsed && !isMobile;
  const location = useLocation();
  const isActive = location.pathname === resolvedRoute || location.pathname.startsWith(resolvedRoute + '/');

  const padding = density === 'comfortable' ? "10px 12px" : density === 'compact' ? "5px 10px" : "7px 10px";
  const fontSize = density === 'comfortable' ? 14 : density === 'compact' ? 12 : 13;

  return (
    <li>
      <RouterNavLink
        to={resolvedRoute}
        end={item.route === '/'}
        title={isCollapsed ? item.label : undefined}
        style={{ padding: isCollapsed ? "8px 0" : padding, fontSize: isCollapsed ? 13 : fontSize }}
        className={() => cn(menuItemBase, "rounded-lg", isCollapsed ? "justify-center" : "gap-2", isActive ? menuItemActive : menuItemDefault)}
      >
        <span className="relative shrink-0 flex items-center justify-center" style={{ minWidth: '1.8rem' }}>
          {CustomIcon ? <CustomIcon size={15} /> : <LucideIcon className="h-[15px] w-[15px]" />}
          {isCollapsed && badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 rounded-full w-2 h-2 bg-destructive" />
          )}
        </span>
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {badgeCount > 0 && (
              <span className="ml-auto flex items-center justify-center shrink-0 bg-destructive text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full">
                {badgeCount}
              </span>
            )}
          </>
        )}
      </RouterNavLink>
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT 1: GROUPED CARDS (default)
// ═══════════════════════════════════════════════════════════════
function SidebarGroupedCards({ collapsed, isMobile }: { collapsed: boolean; isMobile: boolean }) {
  const filteredGroups = useFilteredCategories();
  const badges = useBadges();
  const pinnedItems = usePinnedItems();
  const { prefs } = useSidebarPrefs();
  const isCollapsed = collapsed && !isMobile;

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1">
      {/* Pinned items section */}
      {pinnedItems.length > 0 && (
        <div className="mb-1">
          {!isCollapsed && (
            <span className="block pt-3 pb-1 px-3 text-[9px] font-bold tracking-wider uppercase text-muted-foreground">
              📌 Fixados
            </span>
          )}
          <ul className="flex flex-col gap-0.5">
            {pinnedItems.map(item => (
              <NavItemRow key={item.id} item={item} collapsed={collapsed} isMobile={isMobile} badgeCount={badges[item.id] || 0} density={prefs.density} />
            ))}
          </ul>
        </div>
      )}

      {filteredGroups.map((group) => (
        <div key={group.id}>
          {!isCollapsed ? (
            <div className="mt-3 mb-1 mx-1">
              {prefs.showLabels && (
                <span className="block px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/60">
                  {group.label}
                </span>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavItemRow key={item.id} item={item} collapsed={collapsed} isMobile={isMobile} badgeCount={badges[item.id] || 0} density={prefs.density} />
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="pt-3" />
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavItemRow key={item.id} item={item} collapsed={collapsed} isMobile={isMobile} badgeCount={badges[item.id] || 0} density={prefs.density} />
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT 2: DUAL RAIL
// ═══════════════════════════════════════════════════════════════
function SidebarDualRail({ isMobile }: { collapsed: boolean; isMobile: boolean }) {
  const filteredGroups = useFilteredCategories();
  const badges = useBadges();
  const { prefs } = useSidebarPrefs();
  const location = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const basePath = slug ? `/app/${slug}` : '';

  const [activeCatId, setActiveCatId] = useState(() => {
    for (const cat of filteredGroups) {
      for (const item of cat.items) {
        const resolvedRoute = basePath + (item.route === '/' ? '' : item.route);
        const match = location.pathname === resolvedRoute || location.pathname.startsWith(resolvedRoute + '/');
        if (match) return cat.id;
      }
    }
    return filteredGroups[0]?.id || '';
  });

  const activeCat = filteredGroups.find(c => c.id === activeCatId) || filteredGroups[0];

  // Category badge: sum of item badges
  const catBadge = (cat: NavCategory) => cat.items.reduce((sum, item) => sum + (badges[item.id] || 0), 0);

  return (
    <div className="flex h-full">
      {/* Rail */}
      <div className="flex flex-col items-center py-3 shrink-0 border-r border-border" style={{ width: 58 }}>
        <img src={whatsflowLogo} alt="" className="h-7 w-7 rounded-lg mb-4" />
        <div className="flex-1 flex flex-col gap-1">
          {filteredGroups.filter(c => c.id !== 'sistema').map(cat => {
            const CatIcon = getIcon(cat.icon || 'LayoutDashboard');
            const isActive = cat.id === activeCatId;
            const badge = catBadge(cat);
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCatId(cat.id)}
                title={cat.label}
                className={cn("flex items-center justify-center rounded-lg transition-colors relative", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                style={{ width: 40, height: 40 }}
              >
                <CatIcon className="h-4.5 w-4.5" />
                {badge > 0 && <span className="absolute top-1 right-1 rounded-full w-[7px] h-[7px] bg-destructive" />}
              </button>
            );
          })}
        </div>
        {/* System icons at bottom */}
        {filteredGroups.filter(c => c.id === 'sistema').map(cat => cat.items.map(item => {
          const Icon = getIcon(item.icon);
          const resolvedRoute = basePath + (item.route === '/' ? '' : item.route);
          const isActive = location.pathname === resolvedRoute || location.pathname.startsWith(resolvedRoute + '/');
          return (
            <RouterNavLink key={item.id} to={resolvedRoute} title={item.label}
              className={() => cn("flex items-center justify-center rounded-lg mb-1 transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
              style={{ width: 40, height: 40 }}>
              <Icon className="h-4 w-4" />
            </RouterNavLink>
          );
        }))}
      </div>
      {/* Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 pt-4 pb-2">
          <span className="text-[10px] font-bold tracking-wider uppercase text-primary">
            {activeCat?.label}
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2">
          <ul className="flex flex-col gap-0.5" key={activeCatId} style={{ animation: "fadeIn 150ms ease" }}>
            {activeCat?.items.map(item => (
              <NavItemRow key={item.id} item={item} collapsed={false} isMobile={isMobile} badgeCount={badges[item.id] || 0} density={prefs.density} />
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT 3: SPOTLIGHT
// ═══════════════════════════════════════════════════════════════
function SidebarSpotlight({ collapsed, isMobile }: { collapsed: boolean; isMobile: boolean }) {
  const filteredGroups = useFilteredCategories();
  const badges = useBadges();
  const { prefs, updateCategoryCollapsed } = useSidebarPrefs();
  const isCollapsed = collapsed && !isMobile;
  const { slug } = useParams<{ slug?: string }>();
  const basePath = slug ? `/app/${slug}` : '';

  // Get collapsed state from customCategories or default false
  const getCatCollapsed = (catId: string) => {
    const custom = prefs.customCategories?.find(c => c.id === catId);
    return custom?.collapsed ?? false;
  };

  // Top-level items (first category)
  const topItems = filteredGroups[0]?.items || [];
  const accordionGroups = filteredGroups.slice(1);

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1">
      {/* Search bar placeholder */}
      {!isCollapsed && (
        <button
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 mt-2 mb-3 text-xs transition-colors bg-muted border border-border text-muted-foreground"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
          }}
        >
          <span>⌕</span>
          <span className="flex-1 text-left">Buscar ou navegar...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-background">⌘K</kbd>
        </button>
      )}

      {/* Top-level items */}
      <ul className="flex flex-col gap-0.5 mb-1">
        {topItems.map(item => (
          <NavItemRow key={item.id} item={item} collapsed={collapsed} isMobile={isMobile} badgeCount={badges[item.id] || 0} density={prefs.density} />
        ))}
      </ul>

      {!isCollapsed && <hr className="border-0 my-2 border-t border-border" />}

      {/* Accordion groups */}
      {accordionGroups.map(group => {
        const isGroupCollapsed = getCatCollapsed(group.id);
        const GroupIcon = getIcon(group.icon || 'LayoutDashboard');
        return (
          <div key={group.id} className="mb-0.5">
            {!isCollapsed ? (
              <>
                <button
                  onClick={() => updateCategoryCollapsed(group.id, !isGroupCollapsed)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg transition-colors hover:bg-muted"
                >
                  <span
                    className="transition-transform duration-200 text-[10px] text-muted-foreground"
                    style={{ transform: isGroupCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                  >
                    ▶
                  </span>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                    {group.label}
                  </span>
                </button>
                {!isGroupCollapsed && (
                  <div className="relative ml-4 pl-3 border-l border-border">
                    <ul className="flex flex-col gap-0.5 animate-fade-in">
                      {group.items.map(item => (
                        <NavItemRow key={item.id} item={item} collapsed={false} isMobile={isMobile} badgeCount={badges[item.id] || 0} density={prefs.density} />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {group.items.map(item => (
                  <NavItemRow key={item.id} item={item} collapsed={true} isMobile={isMobile} badgeCount={badges[item.id] || 0} density={prefs.density} />
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {/* Quick Actions */}
      {!isCollapsed && prefs.showQuickActions && prefs.quickActions.length > 0 && (
        <>
          <hr className="border-0 my-2 border-t border-border" />
          <div className="flex flex-wrap gap-1.5 px-1">
            {prefs.quickActions.map(id => {
              const allItems = DEFAULT_NAV_CATEGORIES.flatMap(c => c.items);
              const item = allItems.find(i => i.id === id);
              if (!item) return null;
              const resolvedRoute = basePath + (item.route === '/' ? '' : item.route);
              return (
                <RouterNavLink key={id} to={resolvedRoute}
                  className="text-[11px] px-2.5 py-1 rounded-full transition-colors bg-primary/10 text-primary border border-primary/15"
                >
                  + {item.label}
                </RouterNavLink>
              );
            })}
          </div>
        </>
      )}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT 4: CUSTOM (same as GroupedCards but with custom order)
// ═══════════════════════════════════════════════════════════════
function SidebarCustom({ collapsed, isMobile }: { collapsed: boolean; isMobile: boolean }) {
  // Custom layout uses same rendering as GroupedCards but reads from customCategories
  return <SidebarGroupedCards collapsed={collapsed} isMobile={isMobile} />;
}

// ═══════════════════════════════════════════════════════════════
// ROOT SIDEBAR — selects layout
// ═══════════════════════════════════════════════════════════════
export function AppSidebar() {
  const { prefs, setPrefs } = useSidebarPrefs();
  const isMobile = useIsMobile();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("wf_sidebar_state");
      if (saved !== null) return saved === "collapsed";
    } catch {}
    return false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    try { localStorage.setItem("wf_sidebar_state", collapsed ? "collapsed" : "expanded"); } catch {}
  }, [collapsed]);

  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = useCallback(() => {
    if (isMobile) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverExpanded(true), 200);
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverExpanded(false), 300);
  }, [isMobile]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const isCollapsed = isMobile ? false : (collapsed && !hoverExpanded);
  const isDualRail = prefs.layout === 'dual_rail';
  const sidebarW = isDualRail ? (isCollapsed ? 58 : 248) : (isCollapsed ? 64 : WIDTH_MAP[prefs.width]);

  const renderLayout = () => {
    switch (prefs.layout) {
      case 'dual_rail':    return <SidebarDualRail collapsed={isCollapsed} isMobile={isMobile} />;
      case 'spotlight':    return <SidebarSpotlight collapsed={isCollapsed} isMobile={isMobile} />;
      case 'custom':       return <SidebarCustom collapsed={isCollapsed} isMobile={isMobile} />;
      default:             return <SidebarGroupedCards collapsed={isCollapsed} isMobile={isMobile} />;
    }
  };

  const sidebarContent = (
    <aside
      role="navigation"
      aria-label="Menu principal"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col h-screen shrink-0 overflow-x-hidden overflow-y-auto"
      style={{
        width: isMobile ? 260 : sidebarW,
        background: "rgba(var(--sidebar-glass-rgb, 255,255,255), var(--sidebar-glass-alpha, 0.65))",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 8px 40px rgba(0,0,0,0.08)",
        borderRight: "1px solid rgba(var(--sidebar-glass-rgb, 255,255,255), 0.3)",
        transition: isMobile ? "none" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 999,
      }}
    >
      {!isDualRail && (
        <SidebarHeader
          collapsed={isCollapsed}
          isMobile={isMobile}
          onCollapse={() => setCollapsed(p => !p)}
          onCloseMobile={() => setMobileOpen(false)}
        />
      )}
      {renderLayout()}
      <UserFooter collapsed={isCollapsed} isMobile={isMobile} />
    </aside>
  );

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 flex items-center justify-center rounded-lg bg-card border border-border shadow-md"
          style={{ width: 40, height: 40 }}
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />
            <div className="fixed left-0 top-0 bottom-0 z-50">{sidebarContent}</div>
          </>
        )}
      </>
    );
  }

  return sidebarContent;
}
