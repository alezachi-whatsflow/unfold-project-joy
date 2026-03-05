import { LayoutDashboard, PenLine, Users, Package, Radar, Receipt, DollarSign, Settings, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inserir Dados", url: "/input", icon: PenLine },
  { title: "Cobranças", url: "/cobrancas", icon: Receipt },
  { title: "Despesas", url: "/expenses", icon: DollarSign },
  { title: "Clientes", url: "/customers", icon: Users },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Intelligence", url: "/intelligence", icon: Radar },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { signOut, user } = useAuth();

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
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="font-display text-sm font-bold text-primary-foreground">W</span>
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-sidebar-foreground">Whatsflow</h2>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Finance</p>
        </div>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
