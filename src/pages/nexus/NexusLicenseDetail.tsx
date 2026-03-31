import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Lock, Unlock, ExternalLink, Ticket, Loader2, Save,
  Monitor, Smartphone, Users, MessageSquare, HardDrive,
  Shield, Building2, FlaskConical, UserCheck, FileText,
} from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';
import { FaturaView } from '@/components/billing/FaturaView';

const STATUS_BADGES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-muted text-muted-foreground',
  blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  suspended: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const TYPE_CONFIG: Record<string, { label: string; badge: string; icon: any; description: string; layer: string }> = {
  internal: {
    label: 'Interno',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: FlaskConical,
    description: 'Licença interna — ambiente de testes e desenvolvimento. Features novas são testadas aqui antes de ir para produção.',
    layer: 'CAMADA 1B — INTERNA',
  },
  whitelabel: {
    label: 'WhiteLabel',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    icon: Building2,
    description: 'Licença modelo WhiteLabel. Controla sub-licenças de outras empresas sob sua própria marca.',
    layer: 'CAMADA 1A — WHITELABEL',
  },
  individual: {
    label: 'Individual',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: UserCheck,
    description: 'Licença individual vendida diretamente pela Whatsflow ou por parceiros WhiteLabel.',
    layer: 'CAMADA 2 — CLIENTE FINAL',
  },
};

export default function NexusLicenseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, nexusUser } = useNexus();
  const { toast } = useToast();
  const [license, setLicense] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [subLicenses, setSubLicenses] = useState<any[]>([]);
  const [parentLicense, setParentLicense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [faturaOpen, setFaturaOpen] = useState(false);
  const [pzaafiTier, setPzaafiTier] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadAll();
  }, [id]);

  async function loadAll() {
    setLoading(true);
    const [licRes, usageRes, ticketsRes, auditRes] = await Promise.all([
      supabase.from('licenses').select('*, tenants!inner(*)').eq('id', id!).maybeSingle(),
      supabase.from('nexus_license_usage').select('*').eq('license_id', id!).order('period_month', { ascending: false }).limit(6),
      supabase.from('nexus_tickets').select('*, creator:nexus_users!nexus_tickets_created_by_fkey(name)').eq('license_id', id!).order('created_at', { ascending: false }).limit(10),
      supabase.from('nexus_audit_logs').select('*, nexus_users!nexus_audit_logs_actor_id_fkey(name)').eq('license_id', id!).order('created_at', { ascending: false }).limit(20),
    ]);

    if (licRes.data) {
      setLicense(licRes.data);
      setTenant(licRes.data.tenants);
      setNotes(licRes.data.internal_notes || '');
      setPzaafiTier(licRes.data.pzaafi_tier ?? null);

      // Load sub-licenses if whitelabel
      if (licRes.data.license_type === 'whitelabel') {
        const { data: subs } = await supabase
          .from('licenses')
          .select('*, tenants!inner(name, slug, email)')
          .eq('parent_license_id', id!)
          .order('created_at', { ascending: false });
        setSubLicenses(subs || []);
      }

      // Load parent if this is a child license
      if (licRes.data.parent_license_id) {
        const { data: parent } = await supabase
          .from('licenses')
          .select('*, tenants!inner(name, slug)')
          .eq('id', licRes.data.parent_license_id)
          .maybeSingle();
        setParentLicense(parent);
      }
    }
    setUsage(usageRes.data || []);
    setTickets(ticketsRes.data || []);
    setAuditLogs(auditRes.data || []);

    // Load attendants (profiles) for invoice
    if (licRes.data?.tenant_id) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, full_name, email, last_login_at, created_at')
        .eq('license_id', id!)
        .order('created_at', { ascending: true });
      setProfiles(profData || []);
    }

    setLoading(false);
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    await supabase.from('licenses').update({ internal_notes: notes }).eq('id', id!);
    await supabase.from('nexus_audit_logs').insert({
      actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
      action: 'license_edit', license_id: id!, target_entity: 'internal_notes',
    });
    toast({ title: 'Notas salvas' });
    setSavingNotes(false);
  }

  async function handleToggleBlock() {
    if (!license) return;
    const newStatus = license.status === 'blocked' ? 'active' : 'blocked';
    await supabase.from('licenses').update({ status: newStatus }).eq('id', id!);
    await supabase.from('nexus_audit_logs').insert({
      actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
      action: newStatus === 'blocked' ? 'license_block' : 'license_unblock',
      license_id: id!, target_entity: tenant?.name,
    });
    toast({ title: newStatus === 'blocked' ? 'Licença bloqueada' : 'Licença desbloqueada' });
    loadAll();
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!license) {
    return <div className="text-center py-20 text-muted-foreground">Licença não encontrada</div>;
  }

  const licenseType = license.license_type || 'individual';
  const tc = TYPE_CONFIG[licenseType] || TYPE_CONFIG.individual;
  const TypeIcon = tc.icon;

  const totalDevices = (license.base_devices_web || 0) + (license.extra_devices_web || 0);
  const totalMeta = (license.base_devices_meta || 0) + (license.extra_devices_meta || 0);
  const totalAttendants = (license.base_attendants || 0) + (license.extra_attendants || 0);
  const msgLimit = license.monthly_messages_limit || 10000;
  const storageLimit = Number(license.storage_limit_gb) || 1;
  const latestUsage = usage[0];
  const msgUsed = latestUsage?.messages_sent || 0;
  const storageUsed = Number(latestUsage?.storage_used_gb) || 0;
  const devicesUsed = latestUsage?.active_devices || 0;
  const attendantsUsed = latestUsage?.active_attendants || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/nexus/licencas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{tenant?.name || '—'}</h1>
              <Badge className={`text-[10px] ${STATUS_BADGES[license.status] || ''}`}>
                {license.status === 'active' ? 'Ativo' : license.status === 'blocked' ? 'Bloqueado' : license.status}
              </Badge>
              <Badge className={`text-[10px] ${tc.badge}`}>
                <TypeIcon className="h-3 w-3 mr-1" />
                {tc.label}
              </Badge>
              {pzaafiTier && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                  background: 'rgba(16,185,129,0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16,185,129,0.3)',
                }}>
                  Pzaafi
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{tenant?.email} · {tenant?.slug}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {can(['nexus_superadmin', 'nexus_suporte_senior']) && (
            <>
              <Button variant="outline" size="sm" onClick={handleToggleBlock}>
                {license.status === 'blocked' ? <><Unlock className="h-3.5 w-3.5 mr-1" /> Desbloquear</> : <><Lock className="h-3.5 w-3.5 mr-1" /> Bloquear</>}
              </Button>
              <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                onClick={() => {
                  localStorage.removeItem('whatsflow_default_tenant_id');
                  if (licenseType === 'whitelabel' && license.whitelabel_slug) {
                    navigate(`/lab/${license.whitelabel_slug}`);
                  } else {
                    const tenantSlug = tenant?.slug;
                    navigate(tenantSlug ? `/app/${tenantSlug}` : '/');
                  }
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Acessar como Admin
              </Button>
            </>
          )}
          {licenseType === 'individual' && (
            <Button variant="outline" size="sm" onClick={() => setFaturaOpen(true)}>
              <FileText className="h-3.5 w-3.5 mr-1" /> Gerar Fatura
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/nexus/tickets?license=${id}`)}>
            <Ticket className="h-3.5 w-3.5 mr-1" /> Novo Ticket
          </Button>
        </div>
      </div>

      {/* Layer Banner */}
      <Card className={`border-2 ${licenseType === 'whitelabel' ? 'border-purple-500/30 bg-purple-500/5' : licenseType === 'internal' ? 'border-blue-500/30 bg-blue-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <TypeIcon className={`h-5 w-5 ${licenseType === 'whitelabel' ? 'text-purple-400' : licenseType === 'internal' ? 'text-blue-400' : 'text-emerald-400'}`} />
            <div>
              <p className={`text-[10px] font-bold tracking-widest ${licenseType === 'whitelabel' ? 'text-purple-400' : licenseType === 'internal' ? 'text-blue-400' : 'text-emerald-400'}`}>
                {tc.layer}
              </p>
              <p className="text-xs text-muted-foreground">{tc.description}</p>
            </div>
          </div>
          {/* Show parent whitelabel if this is a child license */}
          {parentLicense && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-purple-400" />
              Gerenciada por: <button className="text-purple-400 hover:underline font-medium" onClick={() => navigate(`/nexus/licencas/${parentLicense.id}`)}>{parentLicense.tenants?.name}</button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Whitelabel: Sub-licenses section */}
      {licenseType === 'whitelabel' && (
        <Card className="bg-card/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-400" />
              Sub-Licenças Gerenciadas
              <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400 ml-2">{subLicenses.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {subLicenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma sub-licença vinculada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subLicenses.map((sub: any) => (
                    <TableRow key={sub.id} className="hover:bg-accent/30 cursor-pointer" onClick={() => navigate(`/nexus/licencas/${sub.id}`)}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{sub.tenants?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{sub.tenants?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{sub.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_BADGES[sub.status] || ''}`}>
                          {sub.status === 'active' ? 'Ativo' : sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        R$ {Number(sub.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); navigate(`/nexus/licencas/${sub.id}`); }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Internal: Testing notice */}
      {licenseType === 'internal' && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-400">Ambiente de Testes</p>
                <p className="text-xs text-muted-foreground">
                  Esta licença é isenta de cobrança. Todas as features são testadas aqui antes de ir para produção.
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">Internal</Badge>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">Testing</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary + Resources */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Tipo" value={tc.label} />
            <Row label="Plano" value={license.plan === 'profissional' ? 'Profissional' : license.plan === 'solo_pro' ? 'Solo Pro' : license.plan} />
            <Row label="Valor" value={licenseType === 'internal' ? 'Isento' : `R$ ${Number(license.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`} />
            <Row label="Ciclo" value={license.billing_cycle || '—'} />
            <Row label="Ativação" value={license.starts_at ? new Date(license.starts_at).toLocaleDateString('pt-BR') : '—'} />
            <Row label="Vencimento" value={license.expires_at ? new Date(license.expires_at).toLocaleDateString('pt-BR') : '—'} />
            <Row label="Facilite" value={license.facilite_plan === 'none' ? 'Nenhum' : license.facilite_plan || 'Nenhum'} />
            <Row label="Módulo I.A." value={license.has_ai_module ? `Sim (${license.ai_agents_limit || 0} agentes)` : 'Não'} />
            {licenseType === 'whitelabel' && (
              <Row label="Sub-Licenças" value={`${subLicenses.length} empresa(s)`} />
            )}
            <div className="flex items-center justify-between py-2" style={{ borderTop: '1px solid hsl(var(--border)/0.3)' }}>
              <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Checkout Pzaafi</span>
              <div className="flex items-center gap-2">
                <select
                  value={pzaafiTier || 'off'}
                  onChange={async (e) => {
                    const newTier = e.target.value === 'off' ? null : e.target.value
                    setPzaafiTier(newTier)

                    const { error } = await supabase
                      .from('licenses')
                      .update({
                        pzaafi_tier: newTier,
                        pzaafi_enabled_at: newTier ? new Date().toISOString() : null
                      })
                      .eq('id', license.id)

                    if (error) {
                      toast({ title: 'Erro ao atualizar Pzaafi', variant: 'destructive' })
                      return
                    }

                    if (newTier) {
                      const { data: existingOrg } = await supabase
                        .from('pzaafi_organizations')
                        .select('id')
                        .eq('tenant_id', license.tenant_id)
                        .maybeSingle()

                      if (!existingOrg) {
                        const { data: tenantData } = await supabase
                          .from('tenants')
                          .select('name')
                          .eq('id', license.tenant_id)
                          .maybeSingle()

                        await supabase
                          .from('pzaafi_organizations')
                          .insert({
                            tenant_id: license.tenant_id,
                            tier: newTier,
                            name: tenantData?.name || 'Organização',
                            active: true,
                            kyc_status: 'approved',
                          })
                      } else {
                        await supabase
                          .from('pzaafi_organizations')
                          .update({ tier: newTier })
                          .eq('tenant_id', license.tenant_id)
                      }
                    }

                    toast({ title: newTier ? `Pzaafi ativado como ${newTier}` : 'Pzaafi desativado' })
                  }}
                  className="h-8 rounded-md border px-2 text-sm bg-transparent"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  <option value="off">Desativado</option>
                  <option value="nexus">Nexus (Admin)</option>
                  <option value="whitelabel">WhiteLabel (Revenda)</option>
                  <option value="cliente">Cliente (Merchant)</option>
                </select>

                {pzaafiTier && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                    background: pzaafiTier === 'nexus' ? 'rgba(245,158,11,0.15)' :
                                pzaafiTier === 'whitelabel' ? 'rgba(167,139,250,0.15)' : 'rgba(16,185,129,0.15)',
                    color: pzaafiTier === 'nexus' ? '#f59e0b' :
                           pzaafiTier === 'whitelabel' ? '#a78bfa' : '#10b981',
                  }}>
                    {pzaafiTier === 'nexus' ? 'Admin' : pzaafiTier === 'whitelabel' ? 'Revenda' : 'Merchant'}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Recursos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ResourceBar icon={Monitor} label="Disp. Web" used={devicesUsed} limit={totalDevices} />
            <ResourceBar icon={Smartphone} label="Disp. Meta" used={0} limit={totalMeta} />
            <ResourceBar icon={Users} label="Atendentes" used={attendantsUsed} limit={totalAttendants} />
            <ResourceBar icon={MessageSquare} label="Mensagens/mês" used={msgUsed} limit={msgLimit} showNumbers />
            <ResourceBar icon={HardDrive} label="Storage" used={storageUsed} limit={storageLimit} suffix="GB" showNumbers />
          </CardContent>
        </Card>
      </div>

      {/* Usage History */}
      {usage.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Histórico de Uso (últimos 6 meses)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {usage.slice().reverse().map((u, i) => {
                const pct = msgLimit > 0 ? Math.min((u.messages_sent || 0) / msgLimit * 100, 100) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-muted rounded-t" style={{ height: `${Math.max(pct, 4)}%` }}>
                      <div className="w-full h-full bg-primary/60 rounded-t" />
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(u.period_month).toLocaleDateString('pt-BR', { month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Internal Notes */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Observações Internas
            <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={savingNotes}>
              <Save className="h-3.5 w-3.5 mr-1" /> {savingNotes ? 'Salvando...' : 'Salvar'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas internas visíveis apenas no Nexus..."
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* Fatura Dialog */}
      <Dialog open={faturaOpen} onOpenChange={setFaturaOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fatura — {tenant?.name}</DialogTitle>
          </DialogHeader>
          <FaturaView
            issuer={{
              name: 'Whatsflow',
              cnpj: '00.000.000/0001-00',
              email: 'financeiro@whatsflow.com.br',
              website: 'whatsflow.com.br',
              primaryColor: '#16a34a',
            }}
            client={{
              name: tenant?.name || '',
              email: tenant?.email || '',
              cnpj: tenant?.cpf_cnpj || '',
            }}
            license={{
              base_attendants: license.base_attendants || 0,
              extra_attendants: license.extra_attendants || 0,
              base_devices_web: license.base_devices_web || 0,
              extra_devices_web: license.extra_devices_web || 0,
              base_devices_meta: license.base_devices_meta || 0,
              extra_devices_meta: license.extra_devices_meta || 0,
              has_ai_module: !!license.has_ai_module,
              monthly_value: Number(license.monthly_value || 0),
              starts_at: license.starts_at,
              expires_at: license.expires_at,
              plan: license.plan,
            }}
            attendants={profiles}
            observations={notes || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Tickets + Audit side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Tickets Abertos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow><TableCell className="text-center py-6 text-muted-foreground">Nenhum ticket</TableCell></TableRow>
                ) : tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.title}</TableCell>
                    <TableCell><Badge className="text-[10px]">{t.status}</Badge></TableCell>
                    <TableCell><Badge className="text-[10px]">{t.priority}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Audit Log</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow><TableCell className="text-center py-6 text-muted-foreground">Nenhum registro</TableCell></TableRow>
                ) : auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs">{log.nexus_users?.name || '—'}</TableCell>
                    <TableCell><Badge className="text-[10px]">{log.action}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function ResourceBar({ icon: Icon, label, used, limit, suffix, showNumbers }: {
  icon: any; label: string; used: number; limit: number; suffix?: string; showNumbers?: boolean;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = pct > 80;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{label}</span>
        </div>
        <span className={`font-medium ${isWarning ? 'text-amber-400' : 'text-foreground'}`}>
          {showNumbers ? `${used.toLocaleString('pt-BR')} / ${limit.toLocaleString('pt-BR')}${suffix ? ` ${suffix}` : ''}` : `${used} / ${limit}`}
        </span>
      </div>
      <Progress value={pct} className={`h-1.5 ${isWarning ? '[&>div]:bg-amber-500' : ''}`} />
    </div>
  );
}
