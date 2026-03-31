import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Loader2, Plus, Search, ChevronLeft, ChevronRight, Upload, Download,
  MoreHorizontal, Eye, Edit, ExternalLink, Trash2,
  LayoutDashboard, LayoutGrid, List, TrendingUp, Users, DollarSign, Cpu, ListFilter,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import LicenseFormModal from '@/components/nexus/LicenseFormModal';
import CSVImportModal from '@/components/nexus/CSVImportModal';

type Layout = 'analytics' | 'cards' | 'operational';

const PAGE_SIZE_OPTIONS = [10, 50, 100, 500, 1000];

const STATUS_BADGES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-muted text-muted-foreground',
  blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  suspended: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  trial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo', inactive: 'Inativo', blocked: 'Bloqueado', suspended: 'Suspenso', trial: 'Trial',
  ativado: 'Ativo', ativo: 'Ativo', inativo: 'Inativo', bloqueado: 'Bloqueado', suspenso: 'Suspenso',
  Ativo: 'Ativo', Inativo: 'Inativo', Bloqueado: 'Bloqueado', Suspenso: 'Suspenso', Trial: 'Trial',
};

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  internal:   { label: 'Interno',    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  whitelabel: { label: 'WhiteLabel', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  individual: { label: 'Individual', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

function fmtDate(val: string | null): string {
  return val ? new Date(val).toLocaleDateString('pt-BR') : '—';
}

function getColValue(l: any, col: string, wlMap?: Record<string, string>): string {
  switch (col) {
    case 'status':      return STATUS_LABELS[l.status] || l.status || '—';
    case 'whitelabel':  return (wlMap && l.parent_license_id ? wlMap[l.parent_license_id] : null) || l.parent?.tenants?.name || '—';
    case 'starts_at':   return fmtDate(l.starts_at);
    case 'cancelled_at':return fmtDate(l.cancelled_at);
    case 'blocked_at':  return fmtDate(l.blocked_at);
    case 'unblocked_at':return fmtDate(l.unblocked_at);
    case 'expires_at':  return fmtDate(l.expires_at);
    case 'payment_type':return l.payment_type || '—';
    case 'payment_condition': return l.payment_condition || '—';
    default: return '—';
  }
}

export default function NexusLicenses() {
  const { can, nexusUser } = useNexus();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [layout, setLayout] = useState<Layout>('operational');
  const [licenses, setLicenses] = useState<any[]>([]);
  const [allLicenses, setAllLicenses] = useState<any[]>([]); // for analytics (no pagination)
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [editLicense, setEditLicense] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, Set<string>>>({});
  const [wlNameMap, setWlNameMap] = useState<Record<string, string>>({});

  // Load WhiteLabel parent names once
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('whitelabel_config')
        .select('license_id, display_name, slug');
      const map: Record<string, string> = {};
      (data || []).forEach((wl: any) => {
        if (wl.license_id) map[wl.license_id] = wl.display_name || wl.slug || '—';
      });
      setWlNameMap(map);
    })();
  }, []);

  // Debounce search: wait 400ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    loadLicenses();
    setSelectedIds(new Set());
    setColFilters({});
  }, [page, pageSize, statusFilter, typeFilter, debouncedSearch]);

  useEffect(() => {
    loadAllLicenses();
  }, []);

  async function loadAllLicenses() {
    const { data } = await supabase
      .from('licenses')
      .select('id, monthly_value, status, plan, license_type, has_ai_module, has_ia_auditor, has_ia_copiloto, has_ia_closer, created_at')
      .order('created_at', { ascending: true });
    setAllLicenses(data || []);
  }

  async function loadLicenses() {
    setLoading(true);
    let query = supabase
      .from('licenses')
      .select(`
        *,
        tenants(name, slug, email, cpf_cnpj)
      `, { count: 'exact' });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (typeFilter !== 'all') {
      query = query.eq('license_type', typeFilter);
    }
    if (debouncedSearch.trim()) {
      const q = `%${debouncedSearch.trim()}%`;
      query = query.or(`name.ilike.${q},email.ilike.${q}`, { referencedTable: 'tenants' });
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('loadLicenses error:', error);
      toast({ title: 'Erro ao carregar licenças', description: error.message, variant: 'destructive' });
    } else {
      setLicenses(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let result = licenses;
    for (const [col, values] of Object.entries(colFilters)) {
      if (!values || values.size === 0) continue;
      result = result.filter((l: any) => values.has(getColValue(l, col, wlNameMap)));
    }
    return result;
  }, [licenses, colFilters]);

  const activeColFilters = Object.values(colFilters).filter(s => s.size > 0).length;

  function colUniqueValues(col: string): string[] {
    // For other columns, derive from current page + allLicenses (analytics dataset)
    const fromAll = allLicenses.map((l: any) => getColValue(l, col, wlNameMap));
    const fromPage = licenses.map((l: any) => getColValue(l, col, wlNameMap));
    if (col === 'status') {
      // Merge hardcoded defaults with actual DB-derived values so nothing is missing
      const defaults = ['Ativo', 'Inativo', 'Bloqueado', 'Suspenso', 'Trial'];
      return [...new Set([...defaults, ...fromAll, ...fromPage])].filter(Boolean).sort();
    }
    return [...new Set([...fromAll, ...fromPage])].filter(Boolean).sort();
  }

  function setColFilter(col: string, values: Set<string>) {
    setColFilters(prev => ({ ...prev, [col]: values }));
  }

  // Analytics data computed from allLicenses (no filters)
  const analytics = useMemo(() => {
    const active = allLicenses.filter((l) => l.status === 'active');
    const mrr = active.reduce((s, l) => s + Number(l.monthly_value || 0), 0);
    const withAI = allLicenses.filter((l) => l.has_ai_module || l.has_ia_auditor || l.has_ia_copiloto || l.has_ia_closer).length;

    // Status breakdown
    const byStatus = ['active', 'inactive', 'blocked', 'suspended', 'trial'].map((s) => ({
      name: { active: 'Ativo', inactive: 'Inativo', blocked: 'Bloqueado', suspended: 'Suspenso', trial: 'Trial' }[s] || s,
      value: allLicenses.filter((l) => l.status === s).length,
    })).filter((d) => d.value > 0);

    // Plan distribution
    const planCounts: Record<string, number> = {};
    allLicenses.forEach((l) => { planCounts[l.plan || 'N/A'] = (planCounts[l.plan || 'N/A'] || 0) + 1; });
    const byPlan = Object.entries(planCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // MRR trend: group by month of creation
    const mrrByMonth: Record<string, number> = {};
    allLicenses
      .filter((l) => l.status === 'active')
      .forEach((l) => {
        const mo = new Date(l.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        mrrByMonth[mo] = (mrrByMonth[mo] || 0) + Number(l.monthly_value || 0);
      });
    const mrrTrend = Object.entries(mrrByMonth).map(([month, mrr]) => ({ month, mrr })).slice(-12);

    // AI adoption by type
    const aiAdoption = [
      { name: 'Auditor', value: allLicenses.filter((l) => l.has_ia_auditor).length },
      { name: 'Copiloto', value: allLicenses.filter((l) => l.has_ia_copiloto).length },
      { name: 'Closer', value: allLicenses.filter((l) => l.has_ia_closer).length },
      { name: 'Módulo I.A.', value: allLicenses.filter((l) => l.has_ai_module).length },
    ].filter((d) => d.value > 0);

    return { mrr, active: active.length, total: allLicenses.length, withAI, byStatus, byPlan, mrrTrend, aiAdoption };
  }, [allLicenses]);

  function exportCSV() {
    const rows = filtered.map((l: any) => [
      l.tenants?.name, l.tenants?.email, l.plan, l.status,
      Number(l.monthly_value || 0).toFixed(2),
      l.expires_at ? new Date(l.expires_at).toLocaleDateString('pt-BR') : '',
      l.has_ia_auditor ? 'SIM' : 'NÃO',
      l.has_ia_copiloto ? 'SIM' : 'NÃO',
      l.has_ia_closer ? 'SIM' : 'NÃO',
    ].join(';'));
    const csv = ['Empresa;Email;Plano;Status;Valor;Vencimento;Auditor;Copiloto;Closer', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'licencas.csv'; a.click();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // 1. Delete sub-licenses first (no cascade on parent_license_id)
      await supabase.from('licenses').delete().eq('parent_license_id', deleteTarget.id);
      // 2. Delete license (cascades whitelabel_config)
      await supabase.from('licenses').delete().eq('id', deleteTarget.id);
      // 3. Delete tenant (cascades all tenant data)
      if (deleteTarget.tenant_id) {
        await supabase.from('tenants').delete().eq('id', deleteTarget.tenant_id);
      }
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
        action: 'license_delete', license_id: deleteTarget.id,
      });
      toast({ title: 'Licença e dados excluídos com sucesso' });
      setDeleteTarget(null);
      loadLicenses();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0 });

  async function handleBulkDelete() {
    setDeleting(true);
    const ids = Array.from(selectedIds);
    const BATCH = 25;
    setBulkDeleteProgress({ current: 0, total: ids.length });
    let done = 0;
    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);

        // Get tenant_ids for this batch
        const { data: licData } = await supabase
          .from('licenses').select('id, tenant_id').in('id', batch);

        // Delete sub-licenses of this batch
        await supabase.from('licenses').delete().in('parent_license_id', batch);
        // Delete licenses
        await supabase.from('licenses').delete().in('id', batch);
        // Delete tenants
        const tenantIds = (licData || []).map((l: any) => l.tenant_id).filter(Boolean);
        if (tenantIds.length > 0) {
          await supabase.from('tenants').delete().in('id', tenantIds);
        }

        done += batch.length;
        setBulkDeleteProgress({ current: done, total: ids.length });
      }

      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
        action: 'bulk_license_delete',
        target_entity: `${ids.length} licenças excluídas`,
      });
      toast({ title: `${ids.length} licença(s) excluída(s) com sucesso` });
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      loadLicenses();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setBulkDeleteProgress({ current: 0, total: 0 });
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Licenças</h1>
          <p className="text-sm text-muted-foreground">{total} licenças no total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Layout toggle */}
          <div className="flex border border-border overflow-hidden">
            {([
              { id: 'analytics', icon: LayoutDashboard, label: 'Analytics' },
              { id: 'cards', icon: LayoutGrid, label: 'Cards' },
              { id: 'operational', icon: List, label: 'Operacional' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setLayout(id)}
                title={label}
                className={`px-3 py-1.5 flex items-center gap-1.5 text-xs transition-colors ${
                  layout === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          {can(['nexus_superadmin', 'nexus_suporte_senior']) && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowCSV(true)}>
                <Upload className="h-4 w-4 mr-1" /> Importar CSV
              </Button>
              <Button size="sm" onClick={() => { setEditLicense(null); setShowForm(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Nova Licença
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      {/* ── LAYOUT 1: ANALYTICS ── */}
      {layout === 'analytics' && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={DollarSign} label="MRR" value={`R$ ${analytics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="emerald" />
            <KpiCard icon={Users} label="Licenças Ativas" value={String(analytics.active)} color="blue" />
            <KpiCard icon={TrendingUp} label="Total de Licenças" value={String(analytics.total)} color="purple" />
            <KpiCard icon={Cpu} label="Com I.A." value={`${analytics.withAI} (${analytics.total ? Math.round(analytics.withAI / analytics.total * 100) : 0}%)`} color="amber" />
          </div>

          {/* Charts row 1 */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">MRR por Mês de Ativação</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analytics.mrrTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'MRR']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="mrr" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Distribuição por Plano</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={analytics.byPlan} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {analytics.byPlan.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2 */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Status das Licenças</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics.byStatus} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" name="Licenças" radius={[4, 4, 0, 0]}>
                      {analytics.byStatus.map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Adoção de I.A.</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.aiAdoption.length === 0 ? (
                  <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">Nenhum módulo de I.A. ativado</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={analytics.aiAdoption} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" name="Licenças" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── LAYOUT 2: CARDS ── */}
      {layout === 'cards' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por empresa ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="whitelabel">WhiteLabel</SelectItem>
                <SelectItem value="internal">Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((l: any) => {
                  const tc = TYPE_CONFIG[l.license_type] || TYPE_CONFIG.individual;
                  const totalDevices = (l.base_devices_web || 0) + (l.extra_devices_web || 0) + (l.base_devices_meta || 0) + (l.extra_devices_meta || 0);
                  const totalAtt = (l.base_attendants || 0) + (l.extra_attendants || 0);
                  return (
                    <Card
                      key={l.id}
                      className="bg-card/50 border-border/50 hover:border-primary/40 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/nexus/licencas/${l.id}`)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{l.tenants?.name || '—'}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{l.tenants?.email || ''}</p>
                          </div>
                          <Badge className={`text-[9px] shrink-0 ${STATUS_BADGES[l.status] || ''}`}>
                            {STATUS_LABELS[l.status] || l.status}
                          </Badge>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <Badge className={`text-[9px] ${tc.className}`}>{tc.label}</Badge>
                          <Badge variant="outline" className="text-[9px]">{l.plan === 'profissional' ? 'Prof.' : l.plan === 'solo_pro' ? 'Solo Pro' : l.plan}</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs font-bold text-foreground">{totalAtt}</p>
                            <p className="text-[10px] text-muted-foreground">Atend.</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{totalDevices}</p>
                            <p className="text-[10px] text-muted-foreground">Disp.</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-400">
                              R${Number(l.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[10px] text-muted-foreground">/mês</p>
                          </div>
                        </div>
                        {(l.has_ia_auditor || l.has_ia_copiloto || l.has_ia_closer || l.has_ai_module) && (
                          <div className="flex gap-1 flex-wrap">
                            {l.has_ia_auditor && <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px]">Auditor</Badge>}
                            {l.has_ia_copiloto && <Badge className="bg-blue-500/20 text-blue-400 border-none text-[9px]">Copiloto</Badge>}
                            {l.has_ia_closer && <Badge className="bg-purple-500/20 text-purple-400 border-none text-[9px]">Closer</Badge>}
                            {l.has_ai_module && <Badge className="bg-zinc-500/20 text-zinc-400 border-none text-[9px]">I.A.</Badge>}
                          </div>
                        )}
                        {l.expires_at && (
                          <p className="text-[10px] text-muted-foreground">
                            Venc: {new Date(l.expires_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground text-sm">Nenhuma licença encontrada</div>
                )}
              </div>
              <PaginationBar page={page} totalPages={totalPages} total={total} onPrev={() => setPage(page - 1)} onNext={() => setPage(page + 1)} />
            </>
          )}
        </div>
      )}

      {/* ── LAYOUT 3: OPERATIONAL TABLE ── */}
      {layout === 'operational' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por empresa ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="whitelabel">WhiteLabel</SelectItem>
                <SelectItem value="internal">Interno</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(n => (
                  <SelectItem key={n} value={String(n)}>{n} por página</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeColFilters > 0 && (
              <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 text-amber-400 border-amber-500/40" onClick={() => setColFilters({})}>
                <ListFilter className="h-3.5 w-3.5" />
                {activeColFilters} filtro(s) de coluna — Limpar
              </Button>
            )}
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-accent/30 border border-border">
              <span className="text-sm text-foreground font-medium">{selectedIds.size} selecionado(s)</span>
              {can(['nexus_superadmin']) && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => setShowBulkDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir selecionados
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setSelectedIds(new Set())}
              >
                Desmarcar todos
              </Button>
            </div>
          )}

          {/* Table */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                  <Table className="min-w-[1400px]">
                    <TableHeader>
                      <TableRow className="text-[11px]">
                        <TableHead className="w-10 sticky left-0 bg-card z-10">
                          <Checkbox
                            checked={filtered.length > 0 && filtered.every((l: any) => selectedIds.has(l.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds(new Set([...selectedIds, ...filtered.map((l: any) => l.id)]));
                              } else {
                                const newSet = new Set(selectedIds);
                                filtered.forEach((l: any) => newSet.delete(l.id));
                                setSelectedIds(newSet);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="sticky left-0 bg-card z-10 min-w-[180px]">Empresa / Titular</TableHead>
                        <TableHead className="min-w-[180px]">Email</TableHead>
                        <TableHead className="min-w-[120px]"><div className="flex items-center gap-1">WhiteLabel<ColFilter col="whitelabel" values={colUniqueValues('whitelabel')} selected={colFilters['whitelabel'] || new Set()} onChange={setColFilter} /></div></TableHead>
                        <TableHead className="min-w-[90px]"><div className="flex items-center gap-1">Status<ColFilter col="status" values={colUniqueValues('status')} selected={colFilters['status'] || new Set()} onChange={setColFilter} /></div></TableHead>
                        <TableHead className="min-w-[90px]"><div className="flex items-center gap-1">Ativação<ColFilter col="starts_at" values={colUniqueValues('starts_at')} selected={colFilters['starts_at'] || new Set()} onChange={setColFilter} /></div></TableHead>
                        <TableHead className="min-w-[90px]"><div className="flex items-center gap-1">Cancelado<ColFilter col="cancelled_at" values={colUniqueValues('cancelled_at')} selected={colFilters['cancelled_at'] || new Set()} onChange={setColFilter} /></div></TableHead>
                        <TableHead className="min-w-[90px]"><div className="flex items-center gap-1">Bloqueio<ColFilter col="blocked_at" values={colUniqueValues('blocked_at')} selected={colFilters['blocked_at'] || new Set()} onChange={setColFilter} /></div></TableHead>
                        <TableHead className="min-w-[90px]"><div className="flex items-center gap-1">Desbloqueio<ColFilter col="unblocked_at" values={colUniqueValues('unblocked_at')} selected={colFilters['unblocked_at'] || new Set()} onChange={setColFilter} /></div></TableHead>
                        <TableHead className="min-w-[90px]"><div className="flex items-center gap-1">Vencimento<ColFilter col="expires_at" values={colUniqueValues('expires_at')} selected={colFilters['expires_at'] || new Set()} onChange={setColFilter} /></div></TableHead>
                        <TableHead className="min-w-[70px] text-center">Disp. Oficial</TableHead>
                        <TableHead className="min-w-[80px] text-center">Disp. Não Of.</TableHead>
                        <TableHead className="min-w-[70px] text-center">Atend.</TableHead>
                        <TableHead className="min-w-[100px]">Adicional</TableHead>
                        <TableHead className="min-w-[80px]">Checkout</TableHead>
                        <TableHead className="min-w-[80px]">Pzaafi</TableHead>
                        <TableHead className="min-w-[100px]">Receita</TableHead>
                        <TableHead className="min-w-[90px]"><div className="flex items-center gap-1">Tipo Pgto<ColFilter col="payment_type" values={colUniqueValues('payment_type')} selected={colFilters['payment_type'] || new Set()} onChange={setColFilter} /></div></TableHead>
                        <TableHead className="min-w-[80px]"><div className="flex items-center gap-1">Condição<ColFilter col="payment_condition" values={colUniqueValues('payment_condition')} selected={colFilters['payment_condition'] || new Set()} onChange={setColFilter} /></div></TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((l: any) => (
                        <TableRow
                          key={l.id}
                          className={`hover:bg-accent/30 cursor-pointer text-xs ${selectedIds.has(l.id) ? 'bg-accent/20' : ''}`}
                          onClick={() => navigate(`/nexus/licencas/${l.id}`)}
                        >
                          {/* Checkbox */}
                          <TableCell className="sticky left-0 bg-card z-10 w-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(l.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedIds);
                                if (checked) newSet.add(l.id);
                                else newSet.delete(l.id);
                                setSelectedIds(newSet);
                              }}
                            />
                          </TableCell>
                          {/* Empresa */}
                          <TableCell className="sticky left-0 bg-card z-10">
                            <p className="font-medium text-foreground truncate max-w-[160px]">{l.tenants?.name || '—'}</p>
                          </TableCell>
                          {/* Email */}
                          <TableCell>
                            <p className="text-muted-foreground truncate max-w-[180px]">{l.tenants?.email || l.tenants?.slug?.includes('@') ? l.tenants?.email : '—'}</p>
                          </TableCell>
                          {/* WhiteLabel */}
                          <TableCell>
                            {(l.parent_license_id && wlNameMap[l.parent_license_id])
                              ? <span className="text-purple-400 font-medium">{wlNameMap[l.parent_license_id]}</span>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          {/* Status */}
                          <TableCell>
                            <Badge className={`text-[9px] ${STATUS_BADGES[l.status] || ''}`}>
                              {STATUS_LABELS[l.status] || l.status}
                            </Badge>
                          </TableCell>
                          {/* Ativação */}
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {l.starts_at ? new Date(l.starts_at).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          {/* Cancelado */}
                          <TableCell className="whitespace-nowrap">
                            {l.cancelled_at
                              ? <span className="text-red-400">{new Date(l.cancelled_at).toLocaleDateString('pt-BR')}</span>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          {/* Bloqueio */}
                          <TableCell className="whitespace-nowrap">
                            {l.blocked_at
                              ? <span className="text-amber-400">{new Date(l.blocked_at).toLocaleDateString('pt-BR')}</span>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          {/* Desbloqueio */}
                          <TableCell className="whitespace-nowrap">
                            {l.unblocked_at
                              ? <span className="text-emerald-400">{new Date(l.unblocked_at).toLocaleDateString('pt-BR')}</span>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          {/* Vencimento */}
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {l.expires_at ? new Date(l.expires_at).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          {/* Disp. Oficial (Meta) */}
                          <TableCell className="text-center">
                            {(l.base_devices_meta || 0) + (l.extra_devices_meta || 0)}
                          </TableCell>
                          {/* Disp. Não Oficial (Web) */}
                          <TableCell className="text-center">
                            {(l.base_devices_web || 0) + (l.extra_devices_web || 0)}
                          </TableCell>
                          {/* Atendentes */}
                          <TableCell className="text-center">
                            {(l.base_attendants || 0) + (l.extra_attendants || 0)}
                          </TableCell>
                          {/* Adicional (I.A.) */}
                          <TableCell>
                            <div className="flex gap-0.5 flex-wrap">
                              {l.has_ia_auditor && <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] px-1">Aud</Badge>}
                              {l.has_ia_copiloto && <Badge className="bg-blue-500/20 text-blue-400 border-none text-[8px] px-1">Cop</Badge>}
                              {l.has_ia_closer && <Badge className="bg-purple-500/20 text-purple-400 border-none text-[8px] px-1">Clo</Badge>}
                              {l.has_ai_module && <Badge className="bg-zinc-500/20 text-zinc-400 border-none text-[8px] px-1">IA</Badge>}
                              {!l.has_ia_auditor && !l.has_ia_copiloto && !l.has_ia_closer && !l.has_ai_module && (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          {/* Checkout */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {l.checkout_url
                              ? <a href={l.checkout_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-[10px]">Link</a>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          {/* Pzaafi */}
                          <TableCell>
                            {l.pzaafi_tier
                              ? <Badge className={`text-[8px] px-1 border-none ${
                                  l.pzaafi_tier === 'nexus' ? 'bg-amber-500/20 text-amber-400' :
                                  l.pzaafi_tier === 'whitelabel' ? 'bg-purple-500/20 text-purple-400' :
                                  'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {l.pzaafi_tier === 'nexus' ? 'Admin' : l.pzaafi_tier === 'whitelabel' ? 'Revenda' : 'Merchant'}
                                </Badge>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          {/* Receita */}
                          <TableCell className="font-medium text-emerald-400 whitespace-nowrap">
                            R$ {Number(l.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          {/* Tipo Pgto */}
                          <TableCell className="text-muted-foreground capitalize">
                            {l.payment_type || '—'}
                          </TableCell>
                          {/* Condição */}
                          <TableCell className="text-muted-foreground capitalize">
                            {l.payment_condition || '—'}
                          </TableCell>
                          {/* Ações */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/nexus/licencas/${l.id}`)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" /> Ver detalhes
                                </DropdownMenuItem>
                                {can(['nexus_superadmin', 'nexus_suporte_senior']) && (
                                  <DropdownMenuItem onClick={() => { setEditLicense(l); setShowForm(true); }}>
                                    <Edit className="h-3.5 w-3.5 mr-2" /> Editar
                                  </DropdownMenuItem>
                                )}
                                {can(['nexus_superadmin', 'nexus_suporte_senior']) && (
                                  <DropdownMenuItem
                                    className="text-purple-400 focus:text-purple-400"
                                    onClick={() => {
                                      localStorage.removeItem('whatsflow_default_tenant_id');
                                      if (l.license_type === 'whitelabel' && l.whitelabel_slug) {
                                        navigate(`/lab/${l.whitelabel_slug}`);
                                      } else {
                                        const slug = l.tenants?.slug;
                                        navigate(slug ? `/app/${slug}` : '/');
                                      }
                                    }}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> Acessar como Admin
                                  </DropdownMenuItem>
                                )}
                                {can(['nexus_superadmin']) && (
                                  <DropdownMenuItem
                                    className="text-red-400 focus:text-red-400"
                                    onClick={() => setDeleteTarget(l)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow><TableCell colSpan={18} className="text-center py-8 text-muted-foreground">Nenhuma licença encontrada</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages || 1} ({total} registros)</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shared Modals */}
      {showForm && (
        <LicenseFormModal open={showForm} onOpenChange={setShowForm} license={editLicense} onSaved={loadLicenses} />
      )}
      {showCSV && (
        <CSVImportModal open={showCSV} onOpenChange={setShowCSV} onImported={loadLicenses} />
      )}

      <AlertDialog open={showBulkDelete} onOpenChange={(o) => { if (!deleting) setShowBulkDelete(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} licença(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente as <strong>{selectedIds.size}</strong> licenças selecionadas,
              incluindo todos os dados dos tenants (clientes, conversas, histórico) e sub-licenças.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleting && bulkDeleteProgress.total > 0 && (
            <div className="space-y-2 py-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Excluindo em lotes...</span>
                <span>{bulkDeleteProgress.current} / {bulkDeleteProgress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((bulkDeleteProgress.current / bulkDeleteProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir licença e todos os dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente a licença de <strong>{deleteTarget?.tenants?.name}</strong>,
              todos os dados do tenant (clientes, conversas, histórico) e sub-licenças vinculadas.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ColFilter({ col, values, selected, onChange }: {
  col: string;
  values: string[];
  selected: Set<string>;
  onChange: (col: string, values: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const active = selected.size > 0;
  const shown = values.filter((v) => v.toLowerCase().includes(q.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`rounded p-0.5 transition-colors hover:bg-accent ${active ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ListFilter className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2 space-y-2 z-50" onClick={(e) => e.stopPropagation()}>
        <Input
          placeholder="Buscar..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-7 text-xs"
        />
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {shown.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sem resultados</p>}
          {shown.map((v) => (
            <label key={v} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 px-1 py-1 rounded">
              <Checkbox
                checked={selected.has(v)}
                onCheckedChange={(checked) => {
                  const newSet = new Set(selected);
                  if (checked) newSet.add(v); else newSet.delete(v);
                  onChange(col, newSet);
                }}
              />
              <span className="truncate">{v}</span>
            </label>
          ))}
        </div>
        {active && (
          <Button size="sm" variant="ghost" className="h-6 text-xs w-full text-muted-foreground" onClick={() => onChange(col, new Set())}>
            Limpar filtro ({selected.size})
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  };
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 ${colorMap[color] || ''}`}>
          <Icon className={`h-5 w-5 ${colorMap[color]?.split(' ')[0] || ''}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PaginationBar({ page, totalPages, total, onPrev, onNext }: { page: number; totalPages: number; total: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages || 1} ({total} registros)</span>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
