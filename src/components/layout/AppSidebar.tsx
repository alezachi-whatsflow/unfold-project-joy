import { LayoutDashboard, PenLine, Users, Package, Radar, Receipt, DollarSign, Settings, LogOut, UserCheck, FileBarChart, TrendingUp } from "lucide-react";
import whatsflowLogo from "@/assets/whatsflow-logo.png";
import { NavLink as RouterNavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

const menuItemBase = "flex items-center gap-2 rounded-lg text-[13px] no-underline transition-all duration-150 ease-in-out";
const menuItemDefault = "[color:rgba(255,255,255,0.45)] hover:[background:rgba(255,255,255,0.05)] hover:[color:rgba(255,255,255,0.85)]";
const menuItemActive = "[background:rgba(74,222,128,0.10)] [border:1px_solid_rgba(74,222,128,0.18)] [color:#4ade80] font-medium [&>svg]:opacity-100";

export function AppSidebar() {
  const { signOut, user } = useAuth();

  const { data: overdueCount } = useQuery({
    queryKey: ["overdue-payments-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("asaas_payments")
        .select("*", { count: "exact", head: true })
        .eq("status", "OVERDUE");
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logout realizado");
    } catch {
      toast.error("Erro ao sair");
    }
  };

  return (
    <Sidebar>
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-5">
        <img src={whatsflowLogo} alt="Whatsflow" className="h-9 w-9 rounded-lg" />
        <div>
          <h2 className="font-display text-sm font-bold text-sidebar-foreground">Whatsflow</h2>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Finance</p>
        </div>
      </div>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <span
              className="select-none block"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.25)",
                paddingTop: 16,
                paddingBottom: 4,
                paddingLeft: 12,
              }}
            >
              {group.label}
            </span>

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <RouterNavLink
                      to={item.url}
                      end={"end" in item ? item.end : false}
                      style={{ padding: "7px 10px" }}
                      className={({ isActive }) =>
                        cn(
                          menuItemBase,
                          isActive ? menuItemActive : menuItemDefault
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0 opacity-60" />
                      <span className="flex-1">{item.title}</span>
                      {"badgeKey" in item && item.badgeKey === "overdue" && overdueCount && overdueCount > 0 ? (
                        <span
                          className="ml-auto flex items-center justify-center shrink-0"
                          style={{
                            background: "#ef4444",
                            color: "white",
                            fontSize: 10,
                            fontWeight: 700,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            lineHeight: 1,
                          }}
                        >
                          {overdueCount}
                        </span>
                      ) : null}
                    </RouterNavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <div className="mt-auto border-t border-sidebar-border p-4">
        <div className="mb-2 truncate text-xs text-muted-foreground">{user?.email}</div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-muted-foreground hover:text-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </Sidebar>
  );
}
