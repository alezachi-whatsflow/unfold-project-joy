import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNexus, NEXUS_ROLE_LABELS, type NexusRole } from '@/contexts/NexusContext';
import {
  ChevronLeft, ChevronRight, LogOut, Shield, Loader2, LayoutDashboard, Building2, ShoppingCart, Globe, DatabaseZap, Search, Menu, X,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
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
  { id: 'dashboard',      label: 'Dashboard',     icon: IconDashboard, path: '/nexus',                  end: true },
  { id: 'licencas',       label: 'Licenças',       icon: IconDocuments, path: '/nexus/licencas' },
  { id: 'whitelabels',    label: 'WhiteLabels',    icon: Globe,         path: '/nexus/whitelabels' },
  { id: 'checkouts',      label: 'Checkouts',      icon: ShoppingCart,  path: '/nexus/checkouts' },
  { id: 'financeiro',     label: 'Financeiro',     icon: IconFinance,   path: '/nexus/financeiro' },
  { id: 'equipe',         label: 'Equipe',         icon: IconClients,   path: '/nexus/equipe' },
  { id: 'auditoria',      label: 'Auditoria',      icon: IconReports,   path: '/nexus/auditoria' },
  { id: 'flags',          label: 'Feature Flags',  icon: IconSettings,  path: '/nexus/flags' },
  { id: 'tickets',        label: 'Tickets',        icon: IconMessages,  path: '/nexus/tickets' },
  { id: 'lifecycle',      label: 'Lifecycle de Dados', icon: DatabaseZap, path: '/nexus/lifecycle' },
  { id: 'configuracoes',  label: 'Configurações',  icon: IconSettings,  path: '/nexus/configuracoes' },
];

const NAV_BY_ROLE: Record<NexusRole, string[]> = {
  nexus_superadmin:    ['dashboard', 'licencas', 'whitelabels', 'checkouts', 'financeiro', 'equipe', 'auditoria', 'lifecycle', 'flags', 'tickets', 'configuracoes'],
  nexus_dev_senior:    ['dashboard', 'licencas', 'whitelabels', 'lifecycle', 'auditoria', 'flags', 'tickets'],
  nexus_suporte_senior:['dashboard', 'licencas', 'whitelabels', 'tickets', 'auditoria'],
  nexus_financeiro:    ['dashboard', 'financeiro', 'licencas', 'checkouts'],
  nexus_suporte_junior:['dashboard', 'licencas', 'tickets'],
  nexus_customer_success: ['dashboard', 'licencas', 'whitelabels', 'tickets'],
};

export default function NexusLayout() {
  const { signOut } = useAuth();
  const { nexusUser, isLoading, isAuthorized } = useNexus();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');

  const { data: tenants } = useQuery({
    queryKey: ['nexus-tenants-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('licenses')
        .select('id, tenant_id, plan, status, license_type, parent_license_id, whitelabel_slug, tenants(id, name, slug)')
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
    <div className="flex h-screen glass-ambient-bg">
      {/* Mobile hamburger */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 flex items-center justify-center rounded-lg bg-card border border-border shadow-md"
          style={{ width: 40, height: 40 }}
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
      )}
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />
      )}
      {/* Sidebar */}
      <aside
        className={`flex flex-col glass-sidebar transition-all duration-200 ${
          isMobile
            ? `fixed inset-y-0 left-0 z-50 w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
            : collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo + badge */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border relative">
          <img src={whatsflowLogo} alt="Whatsflow" className="h-8 w-8 rounded-lg shrink-0" />
          {(!collapsed || isMobile) && (
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
          {isMobile && (
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.end}
              onClick={() => isMobile && setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg mx-2 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border p-3 space-y-2">
          {!collapsed && nexusUser && (
            <div className="flex items-center gap-2 px-1 pb-2 min-w-0">
              {nexusUser.avatar_url ? (
                <img src={nexusUser.avatar_url} alt={nexusUser.name} className="h-7 w-7 rounded-full shrink-0 object-cover" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-primary">
                    {nexusUser.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate leading-tight">{nexusUser.name}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">
                  {nexusUser.email?.split('@')[1] ? nexusUser.email.split('@')[1].split('.')[0].charAt(0).toUpperCase() + nexusUser.email.split('@')[1].split('.')[0].slice(1) : nexusUser.email}
                </p>
              </div>
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
        <header className="sticky top-0 z-10 glass-header px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && <div className="w-8" />}
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-foreground hidden sm:inline">Nexus Admin</span>
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

        <div className="p-3 sm:p-6">
          <Outlet />
        </div>
      </main>

      {/* Tenant Picker Dialog */}
      <Dialog open={tenantPickerOpen} onOpenChange={(o) => { setTenantPickerOpen(o); if (!o) setTenantSearch(''); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Acessar Portal Tenant
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Selecione a licença/empresa que deseja acessar:
          </p>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar por nome..."
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {(() => {
              if (!tenants || tenants.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma licença encontrada.</p>;
              }
              const q = tenantSearch.trim().toLowerCase();
              const matchTenant = (l: any) => !q || (l.tenants?.name || '').toLowerCase().includes(q);

              // Group: internal first, then whitelabels with children, then standalone individual
              const internal = tenants.filter((l: any) => l.license_type === 'internal' && matchTenant(l));
              const whitelabels = tenants.filter((l: any) => l.license_type === 'whitelabel');
              const individuals = tenants.filter((l: any) => l.license_type === 'individual' && !l.parent_license_id && matchTenant(l));
              const children = tenants.filter((l: any) => l.parent_license_id && matchTenant(l));

              const typeLabel = (t: string) => {
                if (t === 'internal') return 'INTERNO';
                if (t === 'whitelabel') return 'WHITELABEL';
                return 'INDIVIDUAL';
              };
              const typeColor = (t: string) => {
                if (t === 'internal') return 'text-blue-400 border-blue-500/30';
                if (t === 'whitelabel') return 'text-purple-400 border-purple-500/30';
                return 'text-emerald-400 border-emerald-500/30';
              };
              const avatarColor = (t: string) => {
                if (t === 'internal') return 'bg-blue-500/20 text-blue-400';
                if (t === 'whitelabel') return 'bg-purple-500/20 text-purple-400';
                return 'bg-emerald-500/20 text-emerald-400';
              };

              const renderTenantButton = (lic: any, indent = false) => {
                const tenant = lic.tenants as any;
                if (!tenant) return null;
                return (
                  <button
                    key={lic.id}
                    onClick={() => {
                      localStorage.setItem('whatsflow_default_tenant_id', tenant.id);
                      window.dispatchEvent(new Event('tenant-changed'));
                      setTenantPickerOpen(false);
                      if (lic.license_type === 'whitelabel' && lic.whitelabel_slug) {
                        navigate(`/lab/${lic.whitelabel_slug}`);
                      } else {
                        navigate('/');
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left ${indent ? 'ml-6' : ''}`}
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(lic.license_type)}`}>
                      {tenant.name?.[0]?.toUpperCase() || 'T'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{tenant.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-[9px] font-bold tracking-wider ${typeColor(lic.license_type)}`}>
                          {typeLabel(lic.license_type)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{lic.plan}</span>
                        <span className={`text-[11px] ${lic.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {lic.status === 'active' ? 'Ativo' : lic.status}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              };

              return (
                <>
                  {/* Internal licenses */}
                  {internal.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold tracking-widest text-blue-400/70 uppercase px-1">Interno</p>
                      {internal.map((lic: any) => renderTenantButton(lic))}
                    </div>
                  )}
                  {/* Whitelabel licenses with children */}
                  {whitelabels.filter((wl: any) => matchTenant(wl) || children.some((c: any) => c.parent_license_id === wl.id)).map((wl: any) => {
                    const wlChildren = children.filter((c: any) => c.parent_license_id === wl.id);
                    return (
                      <div key={wl.id} className="space-y-1.5">
                        <p className="text-[10px] font-bold tracking-widest text-purple-400/70 uppercase px-1">Whitelabel</p>
                        {renderTenantButton(wl)}
                        {wlChildren.length > 0 && (
                          <div className="space-y-1 border-l-2 border-purple-500/20 ml-4">
                            {wlChildren.map((c: any) => renderTenantButton(c, true))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Standalone individual licenses */}
                  {individuals.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold tracking-widest text-emerald-400/70 uppercase px-1">Individual</p>
                      {individuals.map((lic: any) => renderTenantButton(lic))}
                    </div>
                  )}
                  {/* No results */}
                  {internal.length === 0 && individuals.length === 0 &&
                    whitelabels.filter((wl: any) => matchTenant(wl) || children.some((c: any) => c.parent_license_id === wl.id)).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma empresa encontrada.</p>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
