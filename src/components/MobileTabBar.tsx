import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Home, MessageSquare, TrendingUp, DollarSign, User, LayoutDashboard, CreditCard, Ticket, Bell, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface TabItem {
  icon: React.ElementType;
  label: string;
  route: string;
  badge?: number;
}

type Portal = "finance" | "nexus" | "wl";

function getPortal(pathname: string): Portal {
  if (pathname.startsWith("/nexus")) return "nexus";
  if (pathname.startsWith("/wl/")) return "wl";
  return "finance";
}

function getTabs(portal: Portal, slug?: string): TabItem[] {
  const base = portal === "finance" ? `/app/${slug || "whatsflow"}` : portal === "nexus" ? "/nexus" : `/wl/${slug}`;

  if (portal === "nexus") {
    return [
      { icon: LayoutDashboard, label: "Dashboard", route: "/nexus" },
      { icon: CreditCard, label: "Licenças", route: "/nexus/licencas" },
      { icon: Ticket, label: "Tickets", route: "/nexus/tickets" },
      { icon: Bell, label: "Alertas", route: "/nexus/auditoria" },
      { icon: User, label: "Eu", route: "/nexus/configuracoes" },
    ];
  }

  if (portal === "wl") {
    return [
      { icon: LayoutDashboard, label: "Dashboard", route: `${base}` },
      { icon: Users, label: "Clientes", route: `${base}/clientes` },
      { icon: CreditCard, label: "Licenças", route: `${base}/licencas` },
      { icon: Bell, label: "Alertas", route: `${base}/suporte` },
      { icon: User, label: "Eu", route: `${base}/config` },
    ];
  }

  // Finance portal
  return [
    { icon: Home, label: "Início", route: `${base}` },
    { icon: MessageSquare, label: "Conversas", route: `${base}/conversas` },
    { icon: TrendingUp, label: "CRM", route: `${base}/vendas` },
    { icon: DollarSign, label: "Dinheiro", route: `${base}/revenue` },
    { icon: User, label: "Eu", route: `${base}/perfil` },
  ];
}

export function MobileTabBar() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [scrolledDown, setScrolledDown] = useState(false);

  const portal = getPortal(location.pathname);
  const tabs = getTabs(portal, slug);

  const handleScroll = useCallback(() => {
    setScrolledDown(window.scrollY > 60);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (!isMobile) return null;

  // Don't show on login, signup, checkout pages
  if (["/login", "/signup", "/checkout", "/reset-password", "/forgot-password"].some(p => location.pathname.startsWith(p))) return null;
  // Don't show on standalone home page
  if (location.pathname === "/") return null;

  const isActive = (route: string) => {
    if (route === `/app/${slug}` || route === "/nexus" || route === `/wl/${slug}`) {
      return location.pathname === route;
    }
    return location.pathname.startsWith(route);
  };

  return (
    <nav
      className={cn(
        "fixed bottom-5 left-4 right-4 z-50 md:hidden glass-tabbar tabbar-shrink px-2 py-2",
        scrolledDown && "scrolled-down"
      )}
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const active = isActive(tab.route);
          return (
            <button
              key={tab.route}
              onClick={() => navigate(tab.route)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 relative min-w-[52px]",
                active
                  ? "bg-[rgba(37,211,102,0.20)] text-[#25D366]"
                  : "text-[rgba(255,255,255,0.5)]"
              )}
            >
              <tab.icon
                size={20}
                className={cn(
                  "transition-transform duration-150",
                  active && "scale-110"
                )}
              />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-0.5 right-1 w-2 h-2 rounded-full bg-[#25D366]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
