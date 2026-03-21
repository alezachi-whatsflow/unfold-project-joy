import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Loader2, ExternalLink, MoreHorizontal, Search, Globe, Users, Building2 } from 'lucide-react';

interface WhitelabelRow {
  id: string;
  whitelabel_slug: string | null;
  status: string;
  plan: string;
  monthly_value: number;
  created_at: string;
  tenants: { name: string; slug: string; email: string } | null;
  whitelabel_config: {
    display_name: string;
    logo_url: string | null;
    primary_color: string;
    support_email: string | null;
    max_sub_licenses: number;
    can_create_licenses: boolean;
  } | null;
  sub_count: number;
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

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NexusWhitelabels() {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<WhitelabelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('licenses')
      .select(`
        id, whitelabel_slug, status, plan, monthly_value, created_at,
        tenants(name, slug, email),
        whitelabel_config(display_name, logo_url, primary_color, support_email, max_sub_licenses, can_create_licenses)
      `)
      .eq('license_type', 'whitelabel')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar whitelabels', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Count sub-licenses per whitelabel
    const ids = (data || []).map((r: any) => r.id);
    let subCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: subs } = await supabase
        .from('licenses')
        .select('parent_license_id')
        .in('parent_license_id', ids);
      (subs || []).forEach((s: any) => {
        subCounts[s.parent_license_id] = (subCounts[s.parent_license_id] || 0) + 1;
      });
    }

    setRows((data || []).map((r: any) => ({
      ...r,
      tenants: Array.isArray(r.tenants) ? r.tenants[0] : r.tenants,
      whitelabel_config: Array.isArray(r.whitelabel_config) ? r.whitelabel_config[0] : r.whitelabel_config,
      sub_count: subCounts[r.id] || 0,
    })));
    setLoading(false);
  }

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.tenants?.name?.toLowerCase().includes(q) ||
      r.whitelabel_config?.display_name?.toLowerCase().includes(q) ||
      r.whitelabel_slug?.toLowerCase().includes(q)
    );
  });

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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou slug..."
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
                  <TableHead className="text-center">Sub-licenças</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer hover:bg-accent/30"
                    onClick={() => navigate(`/nexus/licencas/${row.id}`)}>
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
                          <p className="text-xs text-muted-foreground">{row.tenants?.email || '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {row.whitelabel_slug || '—'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_BADGE[row.status] || ''}`}>
                        {STATUS_LABEL[row.status] || row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{row.sub_count}</span>
                        {row.whitelabel_config?.max_sub_licenses && (
                          <span className="text-muted-foreground">/ {row.whitelabel_config.max_sub_licenses}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      R$ {(row.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
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
                                localStorage.setItem('whatsflow_default_tenant_id', row.tenants?.slug || '');
                                navigate(`/lab/${row.whitelabel_slug}`);
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-2" />
                              Acessar portal WL
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

      {/* Create Modal */}
      <CreateWhitelabelModal
        open={showModal}
        onOpenChange={setShowModal}
        nexusUser={nexusUser}
        onSaved={() => { load(); setShowModal(false); }}
      />
    </div>
  );
}

/* ─── Create Modal ─────────────────────────────────────────────── */

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
    // Tenant
    company_name: '',
    company_email: '',
    // WhiteLabel identity
    display_name: '',
    slug: '',
    primary_color: '#11BC76',
    support_email: '',
    support_whatsapp: '',
    // Config
    max_sub_licenses: 50,
    // License
    monthly_value: 0,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-generate slug from display_name
  useEffect(() => {
    if (form.display_name) set('slug', slugify(form.display_name));
  }, [form.display_name]);

  async function handleSave() {
    if (!form.company_name.trim()) {
      toast({ title: 'Informe o nome da empresa', variant: 'destructive' }); return;
    }
    if (!form.display_name.trim()) {
      toast({ title: 'Informe o nome do WhiteLabel', variant: 'destructive' }); return;
    }
    if (!form.slug.trim()) {
      toast({ title: 'Informe o slug', variant: 'destructive' }); return;
    }

    setSaving(true);
    try {
      // 1. Create tenant
      const tenantSlug = slugify(form.company_name);
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({ name: form.company_name, slug: tenantSlug, email: form.company_email || null })
        .select()
        .single();

      if (tenantErr) throw new Error(`Erro ao criar tenant: ${tenantErr.message}`);

      // 2. Create whitelabel license
      const { data: license, error: licErr } = await supabase
        .from('licenses')
        .insert({
          tenant_id: tenant.id,
          license_type: 'whitelabel',
          whitelabel_slug: form.slug,
          plan: 'profissional',
          status: 'active',
          monthly_value: form.monthly_value,
          base_devices_web: 1,
          base_devices_meta: 1,
          base_attendants: 1,
        })
        .select()
        .single();

      if (licErr) {
        // Rollback tenant
        await supabase.from('tenants').delete().eq('id', tenant.id);
        throw new Error(`Erro ao criar licença: ${licErr.message}`);
      }

      // 3. Create whitelabel_config
      const { error: cfgErr } = await supabase
        .from('whitelabel_config')
        .insert({
          license_id: license.id,
          slug: form.slug,
          display_name: form.display_name,
          primary_color: form.primary_color,
          support_email: form.support_email || null,
          support_whatsapp: form.support_whatsapp || null,
          max_sub_licenses: form.max_sub_licenses,
          can_create_licenses: true,
        });

      if (cfgErr) throw new Error(`Erro ao criar configuração: ${cfgErr.message}`);

      // 4. Audit log
      await supabase.from('nexus_audit_logs').insert({
        actor_id: nexusUser?.id,
        actor_role: nexusUser?.role || '',
        action: 'whitelabel_create',
        license_id: license.id,
      });

      toast({ title: `WhiteLabel "${form.display_name}" criado com sucesso!` });
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Novo WhiteLabel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Empresa */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Dados da Empresa</p>
            <div className="space-y-2">
              <Label className="text-xs">Nome da empresa *</Label>
              <Input
                placeholder="Ex: Acme Soluções Ltda"
                value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">E-mail da empresa</Label>
              <Input
                type="email"
                placeholder="contato@empresa.com"
                value={form.company_email}
                onChange={(e) => set('company_email', e.target.value)}
              />
            </div>
          </div>

          {/* Identidade WL */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Identidade WhiteLabel</p>
            <div className="space-y-2">
              <Label className="text-xs">Nome do WhiteLabel *</Label>
              <Input
                placeholder="Ex: AcmeChat"
                value={form.display_name}
                onChange={(e) => set('display_name', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Nome exibido para os clientes do parceiro.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Slug (URL) *</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">/lab/</span>
                <Input
                  placeholder="acme-chat"
                  value={form.slug}
                  onChange={(e) => set('slug', slugify(e.target.value))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Identificador único. Gerado automaticamente pelo nome.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Cor primária</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => set('primary_color', e.target.value)}
                  className="h-9 w-16 rounded border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) => set('primary_color', e.target.value)}
                  className="font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Suporte */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Suporte</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">E-mail de suporte</Label>
                <Input
                  type="email"
                  placeholder="suporte@parceiro.com"
                  value={form.support_email}
                  onChange={(e) => set('support_email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">WhatsApp de suporte</Label>
                <Input
                  placeholder="5511999999999"
                  value={form.support_whatsapp}
                  onChange={(e) => set('support_whatsapp', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Config */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Limites e Cobrança</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Máx. sub-licenças</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_sub_licenses}
                  onChange={(e) => set('max_sub_licenses', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Valor mensal (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.monthly_value}
                  onChange={(e) => set('monthly_value', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar WhiteLabel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
