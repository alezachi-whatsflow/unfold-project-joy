import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeSwitcher } from "./ThemeSwitcher";
import {
  Home, PenLine, TrendingUp, DollarSign, Receipt, FileText, UserCheck,
  Users, Package, CheckSquare, ShoppingCart, LayoutDashboard, BarChart3,
  FileBarChart, Brain, Radar, MessageCircle, Settings, CreditCard,
} from "lucide-react";

// Compact icon map for horizontal nav
const NAV_ICONS: { route: string; icon: typeof Home; label: string; group: string }[] = [
  // Financeiro
  { route: "/input",       icon: PenLine,          label: "Inserir Dados",       group: "fin" },
  { route: "/revenue",     icon: TrendingUp,       label: "Receitas",            group: "fin" },
  { route: "/expenses",    icon: DollarSign,        label: "Despesas",            group: "fin" },
  { route: "/cobrancas",   icon: Receipt,           label: "Cobranças",           group: "fin" },
  { route: "/fiscal",      icon: FileText,          label: "Fiscal",              group: "fin" },
  { route: "/comissoes",   icon: UserCheck,          label: "Comissões",           group: "fin" },
  // Clientes & Produtos
  { route: "/customers",   icon: Users,             label: "Clientes",            group: "crm" },
  { route: "/products",    icon: Package,           label: "Produtos",            group: "crm" },
  { route: "/vendas",      icon: ShoppingCart,       label: "Vendas",              group: "crm" },
  { route: "/dashboard",   icon: LayoutDashboard,   label: "Dashboard",           group: "crm" },
  { route: "/analytics",   icon: BarChart3,          label: "Analytics",           group: "ana" },
  { route: "/reports",     icon: FileBarChart,       label: "Relatórios",          group: "ana" },
  { route: "/ia",          icon: Brain,              label: "IA Composable",       group: "ana" },
];

export function TopNavBar() {
  const { slug } = useParams<{ slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = slug ? `/app/${slug}` : "";

  return (
    <div
      className="flex items-center shrink-0 px-3 gap-1 overflow-x-auto"
      style={{
        height: 42,
        background: "var(--bg-surface, hsl(var(--card)))",
        borderBottom: "1px solid var(--border, hsl(var(--border)))",
      }}
    >
      {/* Home / Dashboard */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate(`${basePath}/dashboard`)}
            className="flex items-center justify-center rounded-md transition-colors shrink-0"
            style={{
              width: 32, height: 32,
              background: "var(--acc-bg, hsl(var(--primary) / 0.1))",
              color: "var(--acc, hsl(var(--primary)))",
            }}
          >
            <Home size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Painel de Controle</TooltipContent>
      </Tooltip>

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: "var(--border, #E8E5DF)", margin: "0 4px", flexShrink: 0 }} />

      {/* Nav items as icons */}
      {NAV_ICONS.map((item, i) => {
        const Icon = item.icon;
        const fullRoute = basePath + item.route;
        const isActive = location.pathname === fullRoute || location.pathname.startsWith(fullRoute + "/");
        const prevGroup = i > 0 ? NAV_ICONS[i - 1].group : null;
        const showSep = prevGroup && prevGroup !== item.group;

        return (
          <span key={item.route} className="flex items-center">
            {showSep && <div style={{ width: 1, height: 20, background: "var(--border, #E8E5DF)", margin: "0 4px", flexShrink: 0 }} />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(fullRoute)}
                  className="flex items-center justify-center rounded-md transition-all shrink-0"
                  style={{
                    width: 30, height: 30,
                    background: isActive ? "var(--inbox-active-bg, rgba(14,138,92,0.08))" : "transparent",
                    color: isActive ? "var(--inbox-active-color, #0E8A5C)" : "var(--text-muted, #A09888)",
                    border: isActive ? "1px solid var(--inbox-active-border, rgba(14,138,92,0.25))" : "1px solid transparent",
                  }}
                >
                  <Icon size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{item.label}</TooltipContent>
            </Tooltip>
          </span>
        );
      })}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <ThemeSwitcher />
      </div>
    </div>
  );
}
