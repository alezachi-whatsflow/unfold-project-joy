import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Plus, Loader2, ExternalLink, MoreHorizontal, Search, Globe, Users,
  Building2, DollarSign, TrendingUp, Cpu, Wifi, MessageSquare, Trash2,
} from 'lucide-react';

// ─── Pricing ────────────────────────────────────────────────────────────────
const WL_PRICE = {
  base: 170,          // 3 atendentes + 1 WebWhatsapp + 1 Meta
  extra_attendant: 30,
  extra_web: 80,
  extra_meta: 50,
  ai: 250,
} as const;

function calcWLPrice(form: {
  extra_attendants: number;
  extra_web: number;
  extra_meta: number;
  has_ai: boolean;
}) {
  return (
    WL_PRICE.base +
    form.extra_attendants * WL_PRICE.extra_attendant +
    form.extra_web * WL_PRICE.extra_web +
    form.extra_meta * WL_PRICE.extra_meta +
    (form.has_ai ? WL_PRICE.ai : 0)
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  inactive:  'bg-muted text-muted-foreground',
  blocked:   'bg-red-500/20 text-red-400 border-red-500/30',
  suspended: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  trial:     'bg-blue-500/20 text-blue-400 border-blue-500/30',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo', inactive: 'Inativo', blocked: 'Bloqueado', suspended: 'Suspenso', trial: 'Trial',
};

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface WLRow {
  id: string;
  tenant_id: string | null;
  whitelabel_slug: string | null;
  status: string;
  plan: string;
  monthly_value: number;
  base_attendants: number;
  extra_attendants: number;
  base_devices_web: number;
  extra_devices_web: number;
  base_devices_meta: number;
  extra_devices_meta: number;
  has_ai_module: boolean;
  created_at: string;
  tenants: { name: string; slug: string; email: string; cpf_cnpj: string | null } | null;
  whitelabel_config: {
    display_name: string;
    logo_url: string | null;
    primary_color: string;
    support_email: string | null;
    max_sub_licenses: number;
    can_create_licenses: boolean;
  } | null;
  // computed
  sub_active: number;
  sub_inactive: number;
  sub_mrr: number;
  sub_devices_web: number;
  sub_devices_meta: number;
  sub_attendants: number;
  sub_ai: number;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function NexusWhitelabels() {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<WLRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WLRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);

    const { data: wls, error } = await supabase
      .from('licenses')
      .select(`
        id, tenant_id, whitelabel_slug, status, plan, monthly_value, created_at,
        base_attendants, extra_attendants,
        base_devices_web, extra_devices_web,
        base_devices_meta, extra_devices_meta,
        has_ai_module,
        tenants(name, slug, email, cpf_cnpj),
        whitelabel_config(display_name, logo_url, primary_color, support_email, max_sub_licenses, can_create_licenses)
      `)
      .eq('license_type', 'whitelabel')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar whitelabels', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const ids = (wls || []).map((r: any) => r.id);
    let subMap: Record<string, any[]> = {};

    if (ids.length > 0) {
      const { data: subs } = await supabase
        .from('licenses')
        .select(`
          parent_license_id, status, monthly_value,
          base_devices_web, extra_devices_web,
          base_devices_meta, extra_devices_meta,
          base_attendants, extra_attendants,
          has_ai_module
        `)
        .in('parent_license_id', ids);

      (subs || []).forEach((s: any) => {
        if (!subMap[s.parent_license_id]) subMap[s.parent_license_id] = [];
        subMap[s.parent_license_id].push(s);
      });
    }

    setRows((wls || []).map((r: any) => {
      const t = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
      const cfg = Array.isArray(r.whitelabel_config) ? r.whitelabel_config[0] : r.whitelabel_config;
      const subs: any[] = subMap[r.id] || [];
      return {
        ...r,
        tenants: t,
        whitelabel_config: cfg,
        sub_active:     subs.filter(s => s.status === 'active').length,
        sub_inactive:   subs.filter(s => s.status !== 'active').length,
        sub_mrr:        subs.reduce((a, s) => a + (s.monthly_value || 0), 0),
        sub_devices_web:  subs.reduce((a, s) => a + (s.base_devices_web || 0) + (s.extra_devices_web || 0), 0),
        sub_devices_meta: subs.reduce((a, s) => a + (s.base_devices_meta || 0) + (s.extra_devices_meta || 0), 0),
        sub_attendants:   subs.reduce((a, s) => a + (s.base_attendants || 0) + (s.extra_attendants || 0), 0),
        sub_ai:           subs.filter(s => s.has_ai_module).length,
      };
    }));

    setLoading(false);
  }

  async function handleDeleteWL() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // 1. Delete sub-licenses of this WL
      await supabase.from('licenses').delete().eq('parent_license_id', deleteTarget.id);
      // 2. Delete WL license (cascades whitelabel_config)
      await supabase.from('licenses').delete().eq('id', deleteTarget.id);
      // 3. Delete tenant (cascades all tenant data)
      if (deleteTarget.tenant_id) {
        await supabase.from('tenants').delete().eq('id', deleteTarget.tenant_id);
      }
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
        action: 'whitelabel_delete', license_id: deleteTarget.id,
      });
      toast({ title: 'WhiteLabel e todos os dados excluídos com sucesso' });
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.tenants?.name?.toLowerCase().includes(q) ||
      r.whitelabel_config?.display_name?.toLowerCase().includes(q) ||
      r.whitelabel_slug?.toLowerCase().includes(q) ||
      r.tenants?.cpf_cnpj?.includes(q)
    );
  });

  // ─── Aggregate stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total_wl:       rows.length,
    active_wl:      rows.filter(r => r.status === 'active').length,
    total_mrr:      rows.reduce((a, r) => a + (r.monthly_value || 0), 0),
    avg_ticket:     rows.length ? rows.reduce((a, r) => a + (r.monthly_value || 0), 0) / rows.length : 0,
    sub_active:     rows.reduce((a, r) => a + r.sub_active, 0),
    sub_inactive:   rows.reduce((a, r) => a + r.sub_inactive, 0),
    sub_mrr:        rows.reduce((a, r) => a + r.sub_mrr, 0),
    devices_web:    rows.reduce((a, r) => a + r.sub_devices_web, 0),
    devices_meta:   rows.reduce((a, r) => a + r.sub_devices_meta, 0),
    attendants:     rows.reduce((a, r) => a + r.sub_attendants, 0),
    ai_count:       rows.reduce((a, r) => a + r.sub_ai, 0),
  }), [rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">WhiteLabels</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rows.length} parceiro{rows.length !== 1 ? 's' : ''} cadastrado{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo WhiteLabel
        </Button>
      </div>

      {/* Stats cards */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={DollarSign} label="MRR WhiteLabel" value={`R$ ${fmt(stats.total_mrr)}`} sub={`Ticket médio: R$ ${fmt(stats.avg_ticket)}`} color="text-emerald-400" />
          <StatCard icon={TrendingUp} label="Sub-licenças" value={`${stats.sub_active} ativas`} sub={`${stats.sub_inactive} inativas · MRR R$ ${fmt(stats.sub_mrr)}`} color="text-blue-400" />
          <StatCard icon={Wifi} label="Dispositivos" value={`${stats.devices_web + stats.devices_meta} total`} sub={`${stats.devices_web} Web · ${stats.devices_meta} Meta`} color="text-purple-400" />
          <StatCard icon={Users} label="Atendentes / I.A." value={`${stats.attendants} atend.`} sub={`${stats.ai_count} com I.A. ativa`} color="text-amber-400" />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, slug ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Nenhum resultado encontrado.' : 'Nenhum WhiteLabel cadastrado ainda.'}
              </p>
              {!search && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowModal(true)}>
                  Cadastrar primeiro WhiteLabel
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sub-licenças</TableHead>
                  <TableHead>Recursos (clientes)</TableHead>
                  <TableHead className="text-right">Custo WL / Sub-MRR</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-accent/30"
                    onClick={() => navigate(`/nexus/licencas/${row.id}`)}
                  >
                    {/* Parceiro */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: row.whitelabel_config?.primary_color || '#11BC76' }}
                        >
                          {(row.whitelabel_config?.display_name || row.tenants?.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {row.whitelabel_config?.display_name || row.tenants?.name || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.tenants?.cpf_cnpj ? `CNPJ: ${row.tenants.cpf_cnpj}` : row.tenants?.email || '—'}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Slug */}
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {row.whitelabel_slug || '—'}
                      </code>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_BADGE[row.status] || ''}`}>
                        {STATUS_LABEL[row.status] || row.status}
                      </Badge>
                    </TableCell>

                    {/* Sub-licenças */}
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="flex gap-2">
                          <span className="text-emerald-400 font-medium">{row.sub_active} ativas</span>
                          {row.sub_inactive > 0 && (
                            <span className="text-muted-foreground">{row.sub_inactive} inativas</span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {row.sub_active + row.sub_inactive} / {row.whitelabel_config?.max_sub_licenses || 50} max
                        </div>
                      </div>
                    </TableCell>

                    {/* Recursos dos clientes */}
                    <TableCell>
                      <div className="text-xs space-y-0.5 text-muted-foreground">
                        <div className="flex gap-3">
                          <span><Users className="inline h-3 w-3 mr-0.5" />{row.sub_attendants}</span>
                          <span><Wifi className="inline h-3 w-3 mr-0.5" />{row.sub_devices_web}w/{row.sub_devices_meta}m</span>
                          {row.sub_ai > 0 && <span><Cpu className="inline h-3 w-3 mr-0.5" />{row.sub_ai} I.A.</span>}
                        </div>
                      </div>
                    </TableCell>

                    {/* Custo */}
                    <TableCell className="text-right">
                      <div className="text-xs space-y-0.5">
                        <div className="font-semibold text-foreground">R$ {fmt(row.monthly_value)}</div>
                        {row.sub_mrr > 0 && (
                          <div className="text-emerald-400">sub: R$ {fmt(row.sub_mrr)}</div>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/nexus/licencas/${row.id}`)}>
                            Ver detalhes
                          </DropdownMenuItem>
                          {row.whitelabel_slug && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (row.tenants?.slug) {
                                  localStorage.setItem('whatsflow_default_tenant_id', row.tenants.slug);
                                }
                                navigate(`/lab/${row.whitelabel_slug}`);
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-2" />
                              Acessar portal WL
                            </DropdownMenuItem>
                          )}
                          {nexusUser?.role === 'nexus_superadmin' && (
                            <DropdownMenuItem
                              className="text-red-400 focus:text-red-400"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Excluir WhiteLabel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Monthly closing summary */}
      {!loading && rows.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Resumo para Fechamento Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Parceiro</th>
                    <th className="text-right py-2 px-2 font-medium">Custo WL</th>
                    <th className="text-right py-2 px-2 font-medium">Sub-ativas</th>
                    <th className="text-right py-2 px-2 font-medium">Web</th>
                    <th className="text-right py-2 px-2 font-medium">Meta</th>
                    <th className="text-right py-2 px-2 font-medium">Atend.</th>
                    <th className="text-right py-2 px-2 font-medium">I.A.</th>
                    <th className="text-right py-2 pl-2 font-medium">MRR clientes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-accent/20">
                      <td className="py-2 pr-4 font-medium text-foreground">
                        {row.whitelabel_config?.display_name || row.tenants?.name || '—'}
                      </td>
                      <td className="text-right py-2 px-2 font-semibold">R$ {fmt(row.monthly_value)}</td>
                      <td className="text-right py-2 px-2 text-emerald-400">{row.sub_active}</td>
                      <td className="text-right py-2 px-2">{row.sub_devices_web}</td>
                      <td className="text-right py-2 px-2">{row.sub_devices_meta}</td>
                      <td className="text-right py-2 px-2">{row.sub_attendants}</td>
                      <td className="text-right py-2 px-2">{row.sub_ai || '—'}</td>
                      <td className="text-right py-2 pl-2 text-emerald-400 font-medium">R$ {fmt(row.sub_mrr)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="font-bold text-foreground border-t-2 border-border">
                    <td className="py-2 pr-4">TOTAL</td>
                    <td className="text-right py-2 px-2">R$ {fmt(stats.total_mrr)}</td>
                    <td className="text-right py-2 px-2 text-emerald-400">{stats.sub_active}</td>
                    <td className="text-right py-2 px-2">{stats.devices_web}</td>
                    <td className="text-right py-2 px-2">{stats.devices_meta}</td>
                    <td className="text-right py-2 px-2">{stats.attendants}</td>
                    <td className="text-right py-2 px-2">{stats.ai_count}</td>
                    <td className="text-right py-2 pl-2 text-emerald-400">R$ {fmt(stats.sub_mrr)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateWhitelabelModal
        open={showModal}
        onOpenChange={setShowModal}
        nexusUser={nexusUser}
        onSaved={() => { load(); setShowModal(false); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir WhiteLabel permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir o parceiro <strong>{deleteTarget?.whitelabel_config?.display_name || deleteTarget?.tenants?.name}</strong>,
              todas as sub-licenças vinculadas e todos os dados do tenant. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWL}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
          <Icon className={`h-5 w-5 ${color} mt-0.5`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateWhitelabelModal({
  open, onOpenChange, nexusUser, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nexusUser: any;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    company_email: '',
    company_cnpj: '',
    billing_email: '',
    display_name: '',
    slug: '',
    primary_color: '#11BC76',
    support_email: '',
    support_whatsapp: '',
    max_sub_licenses: 50,
    // Pricing fields
    extra_attendants: 0,
    extra_web: 0,
    extra_meta: 0,
    has_ai: false,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.display_name) set('slug', slugify(form.display_name));
  }, [form.display_name]);

  const monthly_value = useMemo(() => calcWLPrice(form), [form]);

  async function handleSave() {
    if (!form.company_name.trim()) { toast({ title: 'Informe o nome da empresa', variant: 'destructive' }); return; }
    if (!form.display_name.trim()) { toast({ title: 'Informe o nome do WhiteLabel', variant: 'destructive' }); return; }
    if (!form.slug.trim()) { toast({ title: 'Informe o slug', variant: 'destructive' }); return; }

    setSaving(true);
    try {
      // 1. Tenant
      const { data: tenant, error: tErr } = await supabase
        .from('tenants')
        .insert({
          name: form.company_name,
          slug: slugify(form.company_name),
          email: form.company_email || null,
          cpf_cnpj: form.company_cnpj || null,
        })
        .select()
        .single();
      if (tErr) throw new Error(`Erro ao criar tenant: ${tErr.message}`);

      // 2. License
      const { data: license, error: lErr } = await supabase
        .from('licenses')
        .insert({
          tenant_id: tenant.id,
          license_type: 'whitelabel',
          whitelabel_slug: form.slug,
          plan: 'profissional',
          status: 'active',
          monthly_value,
          base_attendants: 3,
          extra_attendants: form.extra_attendants,
          base_devices_web: 1,
          extra_devices_web: form.extra_web,
          base_devices_meta: 1,
          extra_devices_meta: form.extra_meta,
          has_ai_module: form.has_ai,
        })
        .select()
        .single();
      if (lErr) {
        await supabase.from('tenants').delete().eq('id', tenant.id);
        throw new Error(`Erro ao criar licença: ${lErr.message}`);
      }

      // 3. WhiteLabel config
      const { error: cErr } = await supabase
        .from('whitelabel_config')
        .insert({
          license_id: license.id,
          slug: form.slug,
          display_name: form.display_name,
          primary_color: form.primary_color,
          support_email: form.support_email || null,
          billing_email: form.billing_email || null,
          support_whatsapp: form.support_whatsapp || null,
          max_sub_licenses: form.max_sub_licenses,
          can_create_licenses: true,
        });
      if (cErr) throw new Error(`Erro ao criar configuração: ${cErr.message}`);

      // 4. Audit
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id,
        actor_role: nexusUser?.role || '',
        action: 'whitelabel_create',
        license_id: license.id,
      });

      toast({ title: `WhiteLabel "${form.display_name}" criado!` });
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Novo WhiteLabel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Empresa */}
          <Section title="Dados da Empresa">
            <Field label="Nome da empresa *">
              <Input placeholder="Ex: Acme Soluções Ltda" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CNPJ">
                <Input placeholder="00.000.000/0001-00" value={form.company_cnpj} onChange={(e) => set('company_cnpj', e.target.value)} />
              </Field>
              <Field label="E-mail da empresa">
                <Input type="email" placeholder="contato@empresa.com" value={form.company_email} onChange={(e) => set('company_email', e.target.value)} />
              </Field>
            </div>
            <Field label="E-mail para faturamento">
              <Input type="email" placeholder="financeiro@empresa.com" value={form.billing_email} onChange={(e) => set('billing_email', e.target.value)} />
            </Field>
          </Section>

          {/* Identidade */}
          <Section title="Identidade WhiteLabel">
            <Field label="Nome do WhiteLabel *">
              <Input placeholder="Ex: AcmeChat" value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
              <p className="text-xs text-muted-foreground">Nome exibido para os clientes do parceiro.</p>
            </Field>
            <Field label="Slug (URL) *">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">/lab/</span>
                <Input placeholder="acme-chat" value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} />
              </div>
              <p className="text-xs text-muted-foreground">Gerado automaticamente pelo nome.</p>
            </Field>
            <Field label="Cor primária">
              <div className="flex items-center gap-2">
                <input
                  type="color" value={form.primary_color}
                  onChange={(e) => set('primary_color', e.target.value)}
                  className="h-9 w-14 rounded border border-border cursor-pointer bg-transparent"
                />
                <Input value={form.primary_color} onChange={(e) => set('primary_color', e.target.value)} className="font-mono text-sm" maxLength={7} />
              </div>
            </Field>
          </Section>

          {/* Suporte */}
          <Section title="Suporte">
            <div className="grid grid-cols-2 gap-3">
              <Field label="E-mail de suporte">
                <Input type="email" placeholder="suporte@parceiro.com" value={form.support_email} onChange={(e) => set('support_email', e.target.value)} />
              </Field>
              <Field label="WhatsApp de suporte">
                <Input placeholder="5511999999999" value={form.support_whatsapp} onChange={(e) => set('support_whatsapp', e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Pricing */}
          <Section title="Tabela de Preços do Contrato">
            {/* Price reference table */}
            <div className="rounded-lg border border-border overflow-hidden text-xs">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Item</th>
                    <th className="text-center px-3 py-2 text-muted-foreground font-medium">Incluso</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-medium">Preço unitário</th>
                    <th className="text-center px-3 py-2 text-muted-foreground font-medium">Qtd. contratada</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">Licença base</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">—</td>
                    <td className="px-3 py-2 text-right">R$ {fmt(WL_PRICE.base)}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">1</td>
                    <td className="px-3 py-2 text-right font-medium">R$ {fmt(WL_PRICE.base)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">Atendentes</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">3</td>
                    <td className="px-3 py-2 text-right">R$ {fmt(WL_PRICE.extra_attendant)}/adicional</td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="number" min={3}
                        value={3 + form.extra_attendants}
                        onChange={(e) => set('extra_attendants', Math.max(0, Number(e.target.value) - 3))}
                        className="h-7 w-16 text-xs text-center mx-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {form.extra_attendants > 0 ? `R$ ${fmt(form.extra_attendants * WL_PRICE.extra_attendant)}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">API Web WhatsApp</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">1</td>
                    <td className="px-3 py-2 text-right">R$ {fmt(WL_PRICE.extra_web)}/adicional</td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="number" min={1}
                        value={1 + form.extra_web}
                        onChange={(e) => set('extra_web', Math.max(0, Number(e.target.value) - 1))}
                        className="h-7 w-16 text-xs text-center mx-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {form.extra_web > 0 ? `R$ ${fmt(form.extra_web * WL_PRICE.extra_web)}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">API Business Meta</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">1</td>
                    <td className="px-3 py-2 text-right">R$ {fmt(WL_PRICE.extra_meta)}/adicional</td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="number" min={1}
                        value={1 + form.extra_meta}
                        onChange={(e) => set('extra_meta', Math.max(0, Number(e.target.value) - 1))}
                        className="h-7 w-16 text-xs text-center mx-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {form.extra_meta > 0 ? `R$ ${fmt(form.extra_meta * WL_PRICE.extra_meta)}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">Módulo I.A.</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">—</td>
                    <td className="px-3 py-2 text-right">R$ {fmt(WL_PRICE.ai)}/mês</td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={form.has_ai} onCheckedChange={(v) => set('has_ai', v)} />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {form.has_ai ? `R$ ${fmt(WL_PRICE.ai)}` : '—'}
                    </td>
                  </tr>
                  <tr className="bg-primary/5 font-bold">
                    <td colSpan={4} className="px-3 py-2.5 text-foreground">Total mensal</td>
                    <td className="px-3 py-2.5 text-right text-primary text-sm">R$ {fmt(monthly_value)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              * Mensagens Meta acima de 50.000/mês: R$ 0,03 por modelo enviado (cobrado por uso).
            </p>
          </Section>

          {/* Config */}
          <Section title="Limites">
            <Field label="Máx. sub-licenças">
              <Input type="number" min={1} value={form.max_sub_licenses} onChange={(e) => set('max_sub_licenses', Number(e.target.value))} />
            </Field>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar WhiteLabel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
