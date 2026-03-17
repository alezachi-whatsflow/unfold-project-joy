import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNexus, NEXUS_ROLE_LABELS, type NexusRole } from '@/contexts/NexusContext';
import {
  ChevronLeft, ChevronRight, LogOut, Shield, Loader2, LayoutDashboard, Building2,
} from 'lucide-react';
import {
  IconDashboard, IconDocuments, IconFinance, IconClients, IconReports,
  IconSettings, IconMessages,
} from '@/components/ui/SidebarIcons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import whatsflowLogo from '@/assets/whatsflow-logo.png';

const ALL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: IconDashboard, path: '/nexus', end: true },
  { id: 'licencas', label: 'Licenças', icon: IconDocuments, path: '/nexus/licencas' },
  { id: 'financeiro', label: 'Financeiro', icon: IconFinance, path: '/nexus/financeiro' },
  { id: 'equipe', label: 'Equipe', icon: IconClients, path: '/nexus/equipe' },
  { id: 'auditoria', label: 'Auditoria', icon: IconReports, path: '/nexus/auditoria' },
  { id: 'flags', label: 'Feature Flags', icon: IconSettings, path: '/nexus/flags' },
  { id: 'tickets', label: 'Tickets', icon: IconMessages, path: '/nexus/tickets' },
  { id: 'configuracoes', label: 'Configurações', icon: IconSettings, path: '/nexus/configuracoes' },
];

const NAV_BY_ROLE: Record<NexusRole, string[]> = {
  nexus_superadmin: ['dashboard', 'licencas', 'financeiro', 'equipe', 'auditoria', 'flags', 'tickets', 'configuracoes'],
  nexus_dev_senior: ['dashboard', 'licencas', 'auditoria', 'flags', 'tickets'],
  nexus_suporte_senior: ['dashboard', 'licencas', 'tickets', 'auditoria'],
  nexus_financeiro: ['dashboard', 'financeiro', 'licencas'],
  nexus_suporte_junior: ['dashboard', 'licencas', 'tickets'],
  nexus_customer_success: ['dashboard', 'licencas', 'tickets'],
};

export default function NexusLayout() {
  const { signOut } = useAuth();
  const { nexusUser, isLoading, isAuthorized } = useNexus();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);

  const { data: tenants } = useQuery({
    queryKey: ['nexus-tenants-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('licenses')
        .select('id, tenant_id, plan, status, tenants(id, name, slug)')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAuthorized,
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'forest');
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/nexus/login" replace />;
  }

  const role = nexusUser!.role;
  const allowedIds = NAV_BY_ROLE[role] || [];
  const navItems = ALL_NAV_ITEMS.filter((item) => allowedIds.includes(item.id));

  async function handleLogout() {
    if (nexusUser) {
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser.id,
        actor_role: nexusUser.role,
        action: 'logout',
      });
    }
    await signOut();
    navigate('/nexus/login');
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-card transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo + badge */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <img src={whatsflowLogo} alt="Whatsflow" className="h-8 w-8 rounded-lg shrink-0" />
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">Whatsflow</span>
              <Badge
                variant="outline"
                className="text-[9px] shrink-0 border-emerald-500/50 text-emerald-400 font-bold tracking-wider"
              >
                NEXUS
              </Badge>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg mx-2 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
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
          {!collapsed && nexusUser && (
            <div className="px-1 pb-2">
              <p className="text-xs font-medium text-foreground truncate">{nexusUser.name}</p>
              <p className="text-[10px] text-muted-foreground">{NEXUS_ROLE_LABELS[nexusUser.role]}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground"
            onClick={() => setTenantPickerOpen(true)}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            {!collapsed && 'Portal Tenant'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5" />
            {!collapsed && 'Sair'}
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
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-foreground">Nexus Admin</span>
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-widest"
            >
              NEXUS
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{nexusUser?.email}</span>
            <div className="h-7 w-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
              {nexusUser?.name?.[0]?.toUpperCase()}
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
