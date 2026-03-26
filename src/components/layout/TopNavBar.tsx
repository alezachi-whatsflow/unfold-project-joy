import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeSwitcher } from "./ThemeSwitcher";
import {
  PenLine, TrendingUp, DollarSign, Receipt, FileText, UserCheck,
  Users, Package, ShoppingCart, BarChart3,
  FileBarChart, Brain, Radar, Settings, CreditCard,
  LayoutDashboard, Puzzle,
} from "lucide-react";
import whatsflowLogo from "@/assets/whatsflow-logo.png";

const NAV_ITEMS: { route: string; icon: typeof Home; label: string; group: string }[] = [
  { route: "/input",       icon: PenLine,         label: "Inserir",        group: "fin" },
  { route: "/revenue",     icon: TrendingUp,      label: "Receitas",       group: "fin" },
  { route: "/expenses",    icon: DollarSign,       label: "Despesas",       group: "fin" },
  { route: "/cobrancas",   icon: Receipt,          label: "Cobranças",      group: "fin" },
  { route: "/fiscal",      icon: FileText,         label: "Fiscal",         group: "fin" },
  { route: "/comissoes",   icon: UserCheck,         label: "Comissões",      group: "fin" },
  { route: "/customers",   icon: Users,            label: "Clientes",       group: "crm" },
  { route: "/products",    icon: Package,          label: "Produtos",       group: "crm" },
  { route: "/vendas",      icon: ShoppingCart,      label: "Vendas",         group: "crm" },
  { route: "/dashboard",   icon: LayoutDashboard,  label: "Dashboard",      group: "crm" },
  { route: "/analytics",   icon: BarChart3,         label: "Analytics",      group: "ana" },
  { route: "/reports",     icon: FileBarChart,      label: "Relatórios",     group: "ana" },
  { route: "/ia",          icon: Brain,             label: "IA",             group: "ana" },
  { route: "/intelligence",icon: Radar,             label: "Int. Digital",   group: "ana" },
  { route: "/usuarios",    icon: Users,             label: "Usuários",       group: "sys" },
  { route: "/integracoes", icon: Puzzle,            label: "Integrações",    group: "sys" },
  { route: "/assinatura",  icon: CreditCard,        label: "Assinatura",     group: "sys" },
  { route: "/settings",    icon: Settings,          label: "Config",         group: "sys" },
];

export function TopNavBar() {
  const { slug } = useParams<{ slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = slug ? `/app/${slug}` : "";

  return (
    <div
      style={{
        height: 40,
        background: "var(--bg-surface, hsl(var(--card)))",
        borderBottom: "1px solid var(--border, hsl(var(--border)))",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        flexShrink: 0,
      }}
    >

      {/* Centered nav items */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        overflowX: "auto",
      }}>
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const fullRoute = basePath + item.route;
          const isActive = location.pathname === fullRoute || location.pathname.startsWith(fullRoute + "/");
          const prevGroup = i > 0 ? NAV_ITEMS[i - 1].group : null;
          const showSep = prevGroup && prevGroup !== item.group;

          return (
            <span key={item.route} style={{ display: "flex", alignItems: "center" }}>
              {showSep && <div style={{ width: 1, height: 20, background: "var(--border, #E8E5DF)", margin: "0 4px", flexShrink: 0 }} />}
              <div className="relative group" style={{ display: "inline-flex" }}>
                <button
                  onClick={() => navigate(fullRoute)}
                  className={`nav-icon-hover ${isActive ? "active" : ""}`}
                  style={{ width: 32, height: 32, border: "none" }}
                >
                  <Icon size={16} />
                </button>
                <div className="nav-icon-tooltip">{item.label}</div>
              </div>
            </span>
          );
        })}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 18, background: "var(--border, #E8E5DF)", margin: "0 8px", flexShrink: 0 }} />

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <ThemeSwitcher />
      </div>
    </div>
  );
}
