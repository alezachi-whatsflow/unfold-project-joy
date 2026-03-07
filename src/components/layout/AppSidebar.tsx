import { LayoutDashboard, PenLine, Users, Package, Radar, Receipt, DollarSign, Settings, LogOut, UserCheck, FileBarChart, TrendingUp } from "lucide-react";
import whatsflowLogo from "@/assets/whatsflow-logo.png";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const menuGroups = [
  {
    label: "PRINCIPAL",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
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
      {/* Logo header */}
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
            {/* Group label */}
            <span
              className="select-none"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.25)",
                paddingTop: "16px",
                paddingBottom: "4px",
                paddingLeft: "12px",
                display: "block",
              }}
            >
              {group.label}
            </span>

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-2 rounded-lg text-[13px] transition-all duration-150 ease-in-out"
                        activeClassName="!bg-primary/15 !text-primary font-medium [&>svg]:opacity-100"
                        style={{
                          padding: "7px 10px",
                          color: "rgba(255,255,255,0.45)",
                        }}
                      >
                        <item.icon className="h-4 w-4 opacity-60" />
                        <span className="flex-1">{item.title}</span>
                        {"badgeKey" in item && item.badgeKey === "overdue" && overdueCount && overdueCount > 0 ? (
                          <Badge variant="destructive" className="ml-auto h-5 min-w-5 justify-center px-1.5 text-[10px] font-bold">
                            {overdueCount}
                          </Badge>
                        ) : null}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <div className="mt-auto border-t border-sidebar-border p-4">
        <div className="mb-2 truncate text-xs text-muted-foreground">{user?.email}</div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-muted-foreground hover:text-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </Sidebar>
  );
}
