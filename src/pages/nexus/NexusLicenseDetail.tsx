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
  ArrowLeft, Edit, Lock, Unlock, ExternalLink, Ticket, Loader2, Save,
  Monitor, Smartphone, Users, MessageSquare, HardDrive,
} from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';

const STATUS_BADGES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-muted text-muted-foreground',
  blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  suspended: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
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
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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
    }
    setUsage(usageRes.data || []);
    setTickets(ticketsRes.data || []);
    setAuditLogs(auditRes.data || []);
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{tenant?.name || '—'}</h1>
              <Badge className={`text-[10px] ${STATUS_BADGES[license.status] || ''}`}>
                {license.status === 'active' ? 'Ativo' : license.status === 'blocked' ? 'Bloqueado' : license.status}
              </Badge>
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
              <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Acessar como Admin
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/nexus/tickets?license=${id}`)}>
            <Ticket className="h-3.5 w-3.5 mr-1" /> Novo Ticket
          </Button>
        </div>
      </div>

      {/* Summary + Resources */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Plano" value={license.plan === 'profissional' ? 'Profissional' : license.plan === 'solo_pro' ? 'Solo Pro' : license.plan} />
            <Row label="Valor" value={`R$ ${Number(license.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`} />
            <Row label="Ciclo" value={license.billing_cycle || '—'} />
            <Row label="Ativação" value={license.starts_at ? new Date(license.starts_at).toLocaleDateString('pt-BR') : '—'} />
            <Row label="Vencimento" value={license.expires_at ? new Date(license.expires_at).toLocaleDateString('pt-BR') : '—'} />
            <Row label="Facilite" value={license.facilite_plan === 'none' ? 'Nenhum' : license.facilite_plan || 'Nenhum'} />
            <Row label="Módulo I.A." value={license.has_ai_module ? `Sim (${license.ai_agents_limit || 0} agentes)` : 'Não'} />
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
