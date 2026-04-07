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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Plus, Loader2, ExternalLink, MoreHorizontal, Search, Globe, Users,
  Building2, DollarSign, TrendingUp, Cpu, Wifi, MessageSquare, Trash2,
  ImagePlus, X, Pencil, RefreshCw,
} from 'lucide-react';

// CNPJ mask: 00.000.000/0001-00
function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// ─── Pricing ────────────────────────────────────────────────────────────────
// Default pricing — overridable per partner
const DEFAULT_WL_PRICE = {
  base: 170,
  extra_attendant: 30,
  extra_web: 80,
  extra_meta: 50,
  ai: 250,
};

type WLPricing = typeof DEFAULT_WL_PRICE;

function calcWLPrice(form: {
  extra_attendants: number;
  extra_web: number;
  extra_meta: number;
  has_ai: boolean;
}, pricing: WLPricing = DEFAULT_WL_PRICE) {
  return (
    pricing.base +
    form.extra_attendants * pricing.extra_attendant +
    form.extra_web * pricing.extra_web +
    form.extra_meta * pricing.extra_meta +
    (form.has_ai ? pricing.ai : 0)
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
  // Pool quotas
  pool_max_attendants: number;
  pool_max_devices_web: number;
  pool_max_devices_meta: number;
  pool_max_messages: number;
  pool_max_storage_gb: number;
  pool_max_ai_agents: number;
  tenants: { name: string; slug: string; email: string; cpf_cnpj: string | null } | null;
  whitelabel_config: {
    id?: string;
    display_name: string;
    logo_url: string | null;
    primary_color: string;
    support_email: string | null;
    support_whatsapp: string | null;
    slug: string | null;
    max_sub_licenses: number;
    can_create_licenses: boolean;
    modules_crm?: boolean;
    modules_financeiro?: boolean;
    modules_mensageria?: boolean;
    modules_ia?: boolean;
    modules_pzaafi?: boolean;
    modules_intelligence?: boolean;
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
  const [editTarget, setEditTarget] = useState<WLRow | null>(null);
  const [resetTarget, setResetTarget] = useState<WLRow | null>(null);
  const [resetSending, setResetSending] = useState(false);
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
        pool_max_attendants, pool_max_devices_web, pool_max_devices_meta,
        pool_max_messages, pool_max_storage_gb, pool_max_ai_agents,
        tenants(name, slug, email, cpf_cnpj),
        whitelabel_config(id, display_name, logo_url, primary_color, support_email, support_whatsapp, slug, max_sub_licenses, can_create_licenses, modules_crm, modules_financeiro, modules_mensageria, modules_ia, modules_pzaafi, modules_intelligence, partner_pricing)
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

  async function handleResetPassword() {
    if (!resetTarget) return;
    const email = resetTarget.tenants?.email;
    if (!email) {
      toast({ title: 'E-mail principal não encontrado', variant: 'destructive' });
      setResetTarget(null);
      return;
    }
    setResetSending(true);
    try {
      const { error } = await supabase.functions.invoke('invite-user', {
        body: {
          email,
          full_name: resetTarget.tenants?.name || '',
          role: 'wl_admin',
          tenant_id: resetTarget.tenant_id,
          license_id: resetTarget.id,
          redirect_to: `/partners/${resetTarget.whitelabel_slug}`,
        },
      });
      if (error) throw new Error(error.message);
      toast({ title: 'E-mail de acesso enviado!', description: `Instruções enviadas para ${email}.` });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar e-mail', description: err.message, variant: 'destructive' });
    } finally {
      setResetSending(false);
      setResetTarget(null);
    }
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
                    onClick={() => navigate(`/admin-core/licencas/${row.id}`)}
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
                          <DropdownMenuItem onClick={() => navigate(`/admin-core/licencas/${row.id}`)}>
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditTarget(row)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Editar cadastro
                          </DropdownMenuItem>
                          {row.whitelabel_slug && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (row.tenants?.slug) {
                                  localStorage.setItem('whatsflow_default_tenant_id', row.tenants.slug);
                                }
                                navigate(`/partners/${row.whitelabel_slug}`);
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-2" />
                              Acessar portal WL
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setResetTarget(row)}>
                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                            Reenviar acesso / Reset senha
                          </DropdownMenuItem>
                          {nexusUser?.role === 'nexus_superadmin' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-400 focus:text-red-400"
                                onClick={() => setDeleteTarget(row)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Excluir WhiteLabel
                              </DropdownMenuItem>
                            </>
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

      {editTarget && (
        <EditWhitelabelModal
          row={editTarget}
          nexusUser={nexusUser}
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
          onSaved={() => { load(); setEditTarget(null); }}
        />
      )}

      {/* Reset password confirmation */}
      <AlertDialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar acesso ao painel WL?</AlertDialogTitle>
            <AlertDialogDescription>
              Será enviado um e-mail de acesso para <strong>{resetTarget?.tenants?.email}</strong>.<br />
              Se o usuário já existe, receberá um link para redefinir a senha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={resetSending}>
              {resetSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar e-mail
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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
    extra_attendants: 0,
    extra_web: 0,
    extra_meta: 0,
    has_ai: false,
    // Pool quotas (Nexus sets these limits for the WL)
    pool_max_attendants: 30,
    pool_max_devices_web: 20,
    pool_max_devices_meta: 10,
    pool_max_messages: 100000,
    pool_max_storage_gb: 10,
    pool_max_ai_agents: 10,
    // Module toggles
    modules_crm: true,
    modules_financeiro: true,
    modules_mensageria: true,
    modules_ia: false,
    modules_pzaafi: false,
    modules_intelligence: false,
    // Custom pricing per partner
    price_base: DEFAULT_WL_PRICE.base,
    price_attendant: DEFAULT_WL_PRICE.extra_attendant,
    price_web: DEFAULT_WL_PRICE.extra_web,
    price_meta: DEFAULT_WL_PRICE.extra_meta,
    price_ai: DEFAULT_WL_PRICE.ai,
  });

  const pricing: WLPricing = {
    base: form.price_base,
    extra_attendant: form.price_attendant,
    extra_web: form.price_web,
    extra_meta: form.price_meta,
    ai: form.price_ai,
  };

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Selecione uma imagem válida', variant: 'destructive' });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function clearLogo() {
    setLogoFile(null);
    setLogoPreview(null);
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm({
        company_name: '', company_email: '', company_cnpj: '', billing_email: '',
        display_name: '', slug: '', primary_color: '#11BC76',
        support_email: '', support_whatsapp: '',
        max_sub_licenses: 50, extra_attendants: 0, extra_web: 0, extra_meta: 0, has_ai: false,
        pool_max_attendants: 30, pool_max_devices_web: 20, pool_max_devices_meta: 10,
        pool_max_messages: 100000, pool_max_storage_gb: 10, pool_max_ai_agents: 10,
        modules_crm: true, modules_financeiro: true, modules_mensageria: true,
        modules_ia: false, modules_pzaafi: false, modules_intelligence: false,
      });
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [open]);

  useEffect(() => {
    if (form.display_name) set('slug', slugify(form.display_name));
  }, [form.display_name]);

  const monthly_value = useMemo(() => calcWLPrice(form, pricing), [form]);

  async function handleSave() {
    if (!form.company_name.trim()) { toast({ title: 'Informe o nome da empresa', variant: 'destructive' }); return; }
    if (!form.display_name.trim()) { toast({ title: 'Informe o nome do WhiteLabel', variant: 'destructive' }); return; }
    if (!form.slug.trim()) { toast({ title: 'Informe o slug', variant: 'destructive' }); return; }
    if (!form.company_email.trim()) { toast({ title: 'Informe o e-mail principal', description: 'O e-mail sera usado para enviar o acesso ao painel.', variant: 'destructive' }); return; }

    setSaving(true);
    try {
      // 1. Tenant
      const cnpjClean = form.company_cnpj?.replace(/[^\d]/g, '').trim();
      const { data: tenant, error: tErr } = await supabase
        .from('tenants')
        .insert({
          name: form.company_name,
          slug: slugify(form.company_name),
          email: form.company_email || null,
          cpf_cnpj: cnpjClean && cnpjClean.length > 0 ? cnpjClean : null,
        })
        .select()
        .single();
      if (tErr) {
        if (tErr.message.includes('idx_tenants_cpf_cnpj')) {
          throw new Error('Este CNPJ ja esta cadastrado em outra empresa. Use um CNPJ diferente ou edite o parceiro existente.');
        }
        throw new Error(`Erro ao criar tenant: ${tErr.message}`);
      }

      // 2. License (with pool quotas)
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
          pool_max_attendants: form.pool_max_attendants,
          pool_max_devices_web: form.pool_max_devices_web,
          pool_max_devices_meta: form.pool_max_devices_meta,
          pool_max_messages: form.pool_max_messages,
          pool_max_storage_gb: form.pool_max_storage_gb,
          pool_max_ai_agents: form.has_ai ? form.pool_max_ai_agents : 0,
        })
        .select()
        .single();
      if (lErr) {
        await supabase.from('tenants').delete().eq('id', tenant.id);
        throw new Error(`Erro ao criar licença: ${lErr.message}`);
      }

      // 3. Upload logo (if provided)
      let logo_url: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop() || 'png';
        const path = `wl-logos/${license.id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('whatsapp-media')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(path);
          logo_url = urlData?.publicUrl || null;
        }
      }

      // 4. WhiteLabel config (with module toggles)
      const { error: cErr } = await supabase
        .from('whitelabel_config')
        .insert({
          license_id: license.id,
          slug: form.slug,
          display_name: form.display_name,
          primary_color: form.primary_color,
          support_email: form.support_email || form.billing_email || null,
          support_whatsapp: form.support_whatsapp || null,
          max_sub_licenses: form.max_sub_licenses,
          can_create_licenses: true,
          logo_url,
          modules_crm: form.modules_crm,
          modules_financeiro: form.modules_financeiro,
          modules_mensageria: form.modules_mensageria,
          modules_ia: form.modules_ia,
          modules_pzaafi: form.modules_pzaafi,
          modules_intelligence: form.modules_intelligence,
          partner_pricing: pricing,
        });
      if (cErr) throw new Error(`Erro ao criar configuracao: ${cErr.message}`);

      // 5. Audit
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id,
        actor_role: nexusUser?.role || '',
        action: 'whitelabel_create',
        license_id: license.id,
      });

      // 6. Invite WL admin — send email to company_email
      let inviteMsg = '';
      try {
        const { error: inviteErr } = await supabase.functions.invoke('invite-user', {
          body: {
            email: form.company_email.trim(),
            full_name: form.company_name,
            role: 'wl_admin',
            tenant_id: tenant.id,
            license_id: license.id,
            redirect_to: `/partners/${form.slug}`,
          },
        });
        if (inviteErr) {
          console.warn('Invite warning:', inviteErr);
          inviteMsg = ' (aviso: falha ao enviar e-mail de acesso)';
        } else {
          inviteMsg = ` E-mail de acesso enviado para ${form.company_email}.`;
        }
      } catch (invEx) {
        console.warn('Invite exception:', invEx);
        inviteMsg = ' (aviso: falha ao enviar e-mail de acesso)';
      }

      toast({ title: `WhiteLabel "${form.display_name}" criado!`, description: inviteMsg || undefined });
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
            <Field label="E-mail Principal *">
              <Input type="email" placeholder="contato@empresa.com" value={form.company_email} onChange={(e) => set('company_email', e.target.value)} />
              <p className="text-xs text-muted-foreground">Este e-mail receberá o convite para criar senha e acessar o painel WL.</p>
            </Field>
            <Field label="CNPJ">
              <Input
                placeholder="00.000.000/0001-00"
                value={form.company_cnpj}
                onChange={(e) => set('company_cnpj', maskCNPJ(e.target.value))}
                maxLength={18}
              />
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
                <span className="text-xs text-muted-foreground whitespace-nowrap">/partners/</span>
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
            {/* Logo 300×300 */}
            <Field label="Logo da Marca (300×300 px)">
              {logoPreview ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-20 w-20 object-cover border border-border"
                    />
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{logoFile?.name}</p>
                    <p>{logoFile ? (logoFile.size / 1024).toFixed(0) + ' KB' : ''}</p>
                    <label className="mt-1 flex items-center gap-1 text-primary cursor-pointer hover:underline">
                      <ImagePlus className="h-3 w-3" /> Trocar imagem
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors">
                  <ImagePlus className="h-7 w-7 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para selecionar a imagem</span>
                  <span className="text-xs text-muted-foreground">Proporção quadrada · recomendado 300×300 px</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              )}
            </Field>
          </Section>

          {/* Suporte */}
          <Section title="Suporte">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="E-mail de suporte">
                <Input type="email" placeholder="suporte@parceiro.com" value={form.support_email} onChange={(e) => set('support_email', e.target.value)} />
              </Field>
              <Field label="WhatsApp de suporte">
                <Input placeholder="5511999999999" value={form.support_whatsapp} onChange={(e) => set('support_whatsapp', e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Pricing */}
          <Section title="Precos do Contrato (editavel por Partner)">
            <div className="grid grid-cols-5 gap-2 mb-3">
              <div><Label className="text-[10px]">Base (R$)</Label><Input type="number" min={0} step={10} value={form.price_base} onChange={e => set('price_base', Number(e.target.value))} className="h-7 text-xs" /></div>
              <div><Label className="text-[10px]">Atend. (R$)</Label><Input type="number" min={0} step={5} value={form.price_attendant} onChange={e => set('price_attendant', Number(e.target.value))} className="h-7 text-xs" /></div>
              <div><Label className="text-[10px]">Web (R$)</Label><Input type="number" min={0} step={5} value={form.price_web} onChange={e => set('price_web', Number(e.target.value))} className="h-7 text-xs" /></div>
              <div><Label className="text-[10px]">Meta (R$)</Label><Input type="number" min={0} step={5} value={form.price_meta} onChange={e => set('price_meta', Number(e.target.value))} className="h-7 text-xs" /></div>
              <div><Label className="text-[10px]">I.A. (R$)</Label><Input type="number" min={0} step={10} value={form.price_ai} onChange={e => set('price_ai', Number(e.target.value))} className="h-7 text-xs" /></div>
            </div>
            {/* Price reference table */}
            <div className="border border-border overflow-hidden text-xs">
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
                    <td className="px-3 py-2 text-right">R$ {fmt(pricing.base)}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">1</td>
                    <td className="px-3 py-2 text-right font-medium">R$ {fmt(pricing.base)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">Atendentes</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">3</td>
                    <td className="px-3 py-2 text-right">R$ {fmt(pricing.extra_attendant)}/adicional</td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="number" min={3}
                        value={3 + form.extra_attendants}
                        onChange={(e) => set('extra_attendants', Math.max(0, Number(e.target.value) - 3))}
                        className="h-7 w-16 text-xs text-center mx-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {form.extra_attendants > 0 ? `R$ ${fmt(form.extra_attendants * pricing.extra_attendant)}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">API Web WhatsApp</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">1</td>
                    <td className="px-3 py-2 text-right">R$ {fmt(pricing.extra_web)}/adicional</td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="number" min={1}
                        value={1 + form.extra_web}
                        onChange={(e) => set('extra_web', Math.max(0, Number(e.target.value) - 1))}
                        className="h-7 w-16 text-xs text-center mx-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {form.extra_web > 0 ? `R$ ${fmt(form.extra_web * pricing.extra_web)}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">API Business Meta</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">1</td>
                    <td className="px-3 py-2 text-right">R$ {fmt(pricing.extra_meta)}/adicional</td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="number" min={1}
                        value={1 + form.extra_meta}
                        onChange={(e) => set('extra_meta', Math.max(0, Number(e.target.value) - 1))}
                        className="h-7 w-16 text-xs text-center mx-auto"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {form.extra_meta > 0 ? `R$ ${fmt(form.extra_meta * pricing.extra_meta)}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">Módulo I.A.</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">—</td>
                    <td className="px-3 py-2 text-right">R$ {fmt(pricing.ai)}/mês</td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={form.has_ai} onCheckedChange={(v) => set('has_ai', v)} />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {form.has_ai ? `R$ ${fmt(pricing.ai)}` : '—'}
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

          {/* Pool Quotas */}
          <Section title="Pool de Recursos (teto para distribuir aos clientes)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Atendentes">
                <Input type="number" min={0} value={form.pool_max_attendants} onChange={(e) => set('pool_max_attendants', Number(e.target.value))} className="text-xs h-8" />
              </Field>
              <Field label="Dispositivos Web">
                <Input type="number" min={0} value={form.pool_max_devices_web} onChange={(e) => set('pool_max_devices_web', Number(e.target.value))} className="text-xs h-8" />
              </Field>
              <Field label="Dispositivos Meta">
                <Input type="number" min={0} value={form.pool_max_devices_meta} onChange={(e) => set('pool_max_devices_meta', Number(e.target.value))} className="text-xs h-8" />
              </Field>
              <Field label="Mensagens/mes">
                <Input type="number" min={0} step={10000} value={form.pool_max_messages} onChange={(e) => set('pool_max_messages', Number(e.target.value))} className="text-xs h-8" />
              </Field>
              <Field label="Storage (GB)">
                <Input type="number" min={0} value={form.pool_max_storage_gb} onChange={(e) => set('pool_max_storage_gb', Number(e.target.value))} className="text-xs h-8" />
              </Field>
              <Field label="Agentes I.A.">
                <Input type="number" min={0} value={form.pool_max_ai_agents} onChange={(e) => set('pool_max_ai_agents', Number(e.target.value))} className="text-xs h-8" disabled={!form.has_ai} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">O WL podera distribuir ate este limite total entre todos os seus clientes. 0 = sem limite.</p>
          </Section>

          {/* Modules */}
          <Section title="Modulos Habilitados">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {([
                ['modules_crm', 'CRM / Clientes'],
                ['modules_financeiro', 'Financeiro'],
                ['modules_mensageria', 'Mensageria'],
                ['modules_ia', 'Inteligencia Artificial'],
                ['modules_pzaafi', 'Pzaafi (Checkout)'],
                ['modules_intelligence', 'Intelligence Digital'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-2 bg-background/50 rounded-md px-3 py-2">
                  <span className="text-xs text-foreground">{label}</span>
                  <Switch checked={form[key]} onCheckedChange={(v) => set(key, v)} />
                </div>
              ))}
            </div>
          </Section>

          {/* Config */}
          <Section title="Limites">
            <Field label="Max. sub-licencas">
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

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditWhitelabelModal({
  row, nexusUser, onOpenChange, onSaved,
}: {
  row: WLRow;
  nexusUser: any;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(row.whitelabel_config?.logo_url || null);

  const [form, setForm] = useState({
    company_name: row.tenants?.name || '',
    company_email: row.tenants?.email || '',
    company_cnpj: row.tenants?.cpf_cnpj || '',
    display_name: row.whitelabel_config?.display_name || '',
    primary_color: row.whitelabel_config?.primary_color || '#11BC76',
    support_email: row.whitelabel_config?.support_email || '',
    support_whatsapp: row.whitelabel_config?.support_whatsapp || '',
    max_sub_licenses: row.whitelabel_config?.max_sub_licenses ?? 50,
    extra_attendants: row.extra_attendants,
    extra_web: row.extra_devices_web,
    extra_meta: row.extra_devices_meta,
    has_ai: row.has_ai_module,
    // Pool quotas
    pool_max_attendants: (row as any).pool_max_attendants ?? 30,
    pool_max_devices_web: (row as any).pool_max_devices_web ?? 20,
    pool_max_devices_meta: (row as any).pool_max_devices_meta ?? 10,
    pool_max_messages: (row as any).pool_max_messages ?? 100000,
    pool_max_storage_gb: (row as any).pool_max_storage_gb ?? 10,
    pool_max_ai_agents: (row as any).pool_max_ai_agents ?? 10,
    // Modules
    modules_crm: (row.whitelabel_config as any)?.modules_crm ?? true,
    modules_financeiro: (row.whitelabel_config as any)?.modules_financeiro ?? true,
    modules_mensageria: (row.whitelabel_config as any)?.modules_mensageria ?? true,
    modules_ia: (row.whitelabel_config as any)?.modules_ia ?? false,
    modules_pzaafi: (row.whitelabel_config as any)?.modules_pzaafi ?? false,
    modules_intelligence: (row.whitelabel_config as any)?.modules_intelligence ?? false,
    // Pricing from DB or defaults
    price_base: (row.whitelabel_config as any)?.partner_pricing?.base ?? DEFAULT_WL_PRICE.base,
    price_attendant: (row.whitelabel_config as any)?.partner_pricing?.extra_attendant ?? DEFAULT_WL_PRICE.extra_attendant,
    price_web: (row.whitelabel_config as any)?.partner_pricing?.extra_web ?? DEFAULT_WL_PRICE.extra_web,
    price_meta: (row.whitelabel_config as any)?.partner_pricing?.extra_meta ?? DEFAULT_WL_PRICE.extra_meta,
    price_ai: (row.whitelabel_config as any)?.partner_pricing?.ai ?? DEFAULT_WL_PRICE.ai,
  });

  const pricing: WLPricing = {
    base: form.price_base,
    extra_attendant: form.price_attendant,
    extra_web: form.price_web,
    extra_meta: form.price_meta,
    ai: form.price_ai,
  };

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const monthly_value = useMemo(() => calcWLPrice(form, pricing), [form]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Selecione uma imagem válida', variant: 'destructive' });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!form.company_name.trim()) { toast({ title: 'Informe o nome da empresa', variant: 'destructive' }); return; }
    if (!form.display_name.trim()) { toast({ title: 'Informe o nome do WhiteLabel', variant: 'destructive' }); return; }

    setSaving(true);
    try {
      // 1. Update tenant
      if (row.tenant_id) {
        const cnpjClean = form.company_cnpj?.replace(/[^\d]/g, '').trim();
        const { error: tErr } = await supabase.from('tenants').update({
          name: form.company_name,
          email: form.company_email || null,
          cpf_cnpj: cnpjClean && cnpjClean.length > 0 ? cnpjClean : null,
        }).eq('id', row.tenant_id);
        if (tErr) {
          if (tErr.message.includes('idx_tenants_cpf_cnpj')) {
            throw new Error('Este CNPJ já está cadastrado em outra empresa.');
          }
          throw new Error(`Erro ao atualizar empresa: ${tErr.message}`);
        }
      }

      // 2. Update license (with pool quotas)
      const { error: lErr } = await supabase.from('licenses').update({
        extra_attendants: form.extra_attendants,
        extra_devices_web: form.extra_web,
        extra_devices_meta: form.extra_meta,
        has_ai_module: form.has_ai,
        monthly_value,
        pool_max_attendants: form.pool_max_attendants,
        pool_max_devices_web: form.pool_max_devices_web,
        pool_max_devices_meta: form.pool_max_devices_meta,
        pool_max_messages: form.pool_max_messages,
        pool_max_storage_gb: form.pool_max_storage_gb,
        pool_max_ai_agents: form.has_ai ? form.pool_max_ai_agents : 0,
      }).eq('id', row.id);
      if (lErr) throw new Error(`Erro ao atualizar licença: ${lErr.message}`);

      // 3. Upload new logo if provided
      let logo_url = row.whitelabel_config?.logo_url || null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop() || 'png';
        const path = `wl-logos/${row.id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('whatsapp-media')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(path);
          logo_url = urlData?.publicUrl || logo_url;
        }
      }

      // 4. Update whitelabel_config (with module toggles)
      const { error: cErr } = await supabase.from('whitelabel_config').update({
        display_name: form.display_name,
        primary_color: form.primary_color,
        support_email: form.support_email || null,
        support_whatsapp: form.support_whatsapp || null,
        max_sub_licenses: form.max_sub_licenses,
        logo_url,
        modules_crm: form.modules_crm,
        modules_financeiro: form.modules_financeiro,
        modules_mensageria: form.modules_mensageria,
        modules_ia: form.modules_ia,
        modules_pzaafi: form.modules_pzaafi,
        modules_intelligence: form.modules_intelligence,
        partner_pricing: pricing,
      }).eq('license_id', row.id);
      if (cErr) throw new Error(`Erro ao atualizar configuracao: ${cErr.message}`);

      // 5. Audit
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id,
        actor_role: nexusUser?.role || '',
        action: 'whitelabel_update',
        license_id: row.id,
      });

      toast({ title: `WhiteLabel "${form.display_name}" atualizado!` });
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-400" />
            Editar WhiteLabel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Empresa */}
          <Section title="Dados da Empresa">
            <Field label="Nome da empresa *">
              <Input placeholder="Ex: Acme Soluções Ltda" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
            </Field>
            <Field label="E-mail Principal">
              <Input type="email" placeholder="contato@empresa.com" value={form.company_email} onChange={(e) => set('company_email', e.target.value)} />
              <p className="text-xs text-muted-foreground">Alterar o e-mail aqui não reenvia o convite automaticamente.</p>
            </Field>
            <Field label="CNPJ">
              <Input
                placeholder="00.000.000/0001-00"
                value={form.company_cnpj}
                onChange={(e) => set('company_cnpj', maskCNPJ(e.target.value))}
                maxLength={18}
              />
            </Field>
          </Section>

          {/* Identidade */}
          <Section title="Identidade WhiteLabel">
            <Field label="Nome do WhiteLabel *">
              <Input placeholder="Ex: AcmeChat" value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
            </Field>
            <Field label="Slug (URL)">
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <span>/partners/</span><span className="font-mono font-medium text-foreground">{row.whitelabel_slug}</span>
              </div>
              <p className="text-xs text-muted-foreground">O slug não pode ser alterado após a criação.</p>
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
            <Field label="Logo da Marca (300×300 px)">
              {logoPreview ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={logoPreview} alt="Logo" className="h-20 w-20 object-cover border border-border" />
                    <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <label className="mt-1 flex items-center gap-1 text-xs text-primary cursor-pointer hover:underline">
                    <ImagePlus className="h-3 w-3" /> Trocar imagem
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors">
                  <ImagePlus className="h-7 w-7 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para selecionar a imagem</span>
                  <span className="text-xs text-muted-foreground">Proporção quadrada · recomendado 300×300 px</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              )}
            </Field>
          </Section>

          {/* Suporte */}
          <Section title="Suporte">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="E-mail de suporte">
                <Input type="email" placeholder="suporte@parceiro.com" value={form.support_email} onChange={(e) => set('support_email', e.target.value)} />
              </Field>
              <Field label="WhatsApp de suporte">
                <Input placeholder="5511999999999" value={form.support_whatsapp} onChange={(e) => set('support_whatsapp', e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Pricing */}
          {/* Pricing per partner */}
          <Section title="Precos do Contrato">
            <div className="grid grid-cols-5 gap-2">
              <div><Label className="text-[10px]">Base (R$)</Label><Input type="number" min={0} step={10} value={form.price_base} onChange={e => set('price_base', Number(e.target.value))} className="h-7 text-xs" /></div>
              <div><Label className="text-[10px]">Atend. (R$)</Label><Input type="number" min={0} step={5} value={form.price_attendant} onChange={e => set('price_attendant', Number(e.target.value))} className="h-7 text-xs" /></div>
              <div><Label className="text-[10px]">Web (R$)</Label><Input type="number" min={0} step={5} value={form.price_web} onChange={e => set('price_web', Number(e.target.value))} className="h-7 text-xs" /></div>
              <div><Label className="text-[10px]">Meta (R$)</Label><Input type="number" min={0} step={5} value={form.price_meta} onChange={e => set('price_meta', Number(e.target.value))} className="h-7 text-xs" /></div>
              <div><Label className="text-[10px]">I.A. (R$)</Label><Input type="number" min={0} step={10} value={form.price_ai} onChange={e => set('price_ai', Number(e.target.value))} className="h-7 text-xs" /></div>
            </div>
          </Section>

          <Section title="Recursos Contratados">
            <div className="border border-border overflow-hidden text-xs">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Item</th>
                    <th className="text-center px-3 py-2 text-muted-foreground font-medium">Incluso</th>
                    <th className="text-center px-3 py-2 text-muted-foreground font-medium">Qtd.</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">Atendentes</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">3</td>
                    <td className="px-3 py-2 text-center">
                      <Input type="number" min={3} value={3 + form.extra_attendants}
                        onChange={(e) => set('extra_attendants', Math.max(0, Number(e.target.value) - 3))}
                        className="h-7 w-16 text-xs text-center mx-auto" />
                    </td>
                    <td className="px-3 py-2 text-right">{form.extra_attendants > 0 ? `R$ ${fmt(form.extra_attendants * pricing.extra_attendant)}` : '—'}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">API Web WhatsApp</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">1</td>
                    <td className="px-3 py-2 text-center">
                      <Input type="number" min={1} value={1 + form.extra_web}
                        onChange={(e) => set('extra_web', Math.max(0, Number(e.target.value) - 1))}
                        className="h-7 w-16 text-xs text-center mx-auto" />
                    </td>
                    <td className="px-3 py-2 text-right">{form.extra_web > 0 ? `R$ ${fmt(form.extra_web * pricing.extra_web)}` : '—'}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">API Business Meta</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">1</td>
                    <td className="px-3 py-2 text-center">
                      <Input type="number" min={1} value={1 + form.extra_meta}
                        onChange={(e) => set('extra_meta', Math.max(0, Number(e.target.value) - 1))}
                        className="h-7 w-16 text-xs text-center mx-auto" />
                    </td>
                    <td className="px-3 py-2 text-right">{form.extra_meta > 0 ? `R$ ${fmt(form.extra_meta * pricing.extra_meta)}` : '—'}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-foreground">Módulo I.A.</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">—</td>
                    <td className="px-3 py-2 text-center"><Switch checked={form.has_ai} onCheckedChange={(v) => set('has_ai', v)} /></td>
                    <td className="px-3 py-2 text-right">{form.has_ai ? `R$ ${fmt(pricing.ai)}` : '—'}</td>
                  </tr>
                  <tr className="bg-primary/5 font-bold">
                    <td colSpan={3} className="px-3 py-2.5 text-foreground">Total mensal</td>
                    <td className="px-3 py-2.5 text-right text-primary text-sm">R$ {fmt(monthly_value)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Pool Quotas */}
          <Section title="Pool de Recursos (teto para distribuir)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Atendentes">
                <Input type="number" min={0} value={form.pool_max_attendants} onChange={(e) => set('pool_max_attendants', Number(e.target.value))} className="text-xs h-8" />
              </Field>
              <Field label="Dispositivos Web">
                <Input type="number" min={0} value={form.pool_max_devices_web} onChange={(e) => set('pool_max_devices_web', Number(e.target.value))} className="text-xs h-8" />
              </Field>
              <Field label="Dispositivos Meta">
                <Input type="number" min={0} value={form.pool_max_devices_meta} onChange={(e) => set('pool_max_devices_meta', Number(e.target.value))} className="text-xs h-8" />
              </Field>
              <Field label="Mensagens/mes">
                <Input type="number" min={0} step={10000} value={form.pool_max_messages} onChange={(e) => set('pool_max_messages', Number(e.target.value))} className="text-xs h-8" />
              </Field>
              <Field label="Storage (GB)">
                <Input type="number" min={0} value={form.pool_max_storage_gb} onChange={(e) => set('pool_max_storage_gb', Number(e.target.value))} className="text-xs h-8" />
              </Field>
              <Field label="Agentes I.A.">
                <Input type="number" min={0} value={form.pool_max_ai_agents} onChange={(e) => set('pool_max_ai_agents', Number(e.target.value))} className="text-xs h-8" disabled={!form.has_ai} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Consumo atual: {row.sub_attendants} atend. · {row.sub_devices_web}w/{row.sub_devices_meta}m disp.
            </p>
          </Section>

          {/* Modules */}
          <Section title="Modulos Habilitados">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {([
                ['modules_crm', 'CRM / Clientes'],
                ['modules_financeiro', 'Financeiro'],
                ['modules_mensageria', 'Mensageria'],
                ['modules_ia', 'Inteligencia Artificial'],
                ['modules_pzaafi', 'Pzaafi (Checkout)'],
                ['modules_intelligence', 'Intelligence Digital'],
              ] as [string, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-2 bg-background/50 rounded-md px-3 py-2">
                  <span className="text-xs text-foreground">{label}</span>
                  <Switch checked={(form as any)[key]} onCheckedChange={(v) => set(key, v)} />
                </div>
              ))}
            </div>
          </Section>

          {/* Limites */}
          <Section title="Limites">
            <Field label="Max. sub-licencas">
              <Input type="number" min={1} value={form.max_sub_licenses} onChange={(e) => set('max_sub_licenses', Number(e.target.value))} />
            </Field>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alteracoes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 bg-muted/30 p-4 border border-border">
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
