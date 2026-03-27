import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Settings, RefreshCw, CheckCircle2, AlertCircle, Loader2, ArrowRight, Shield, XCircle, Calendar, Clock, Plus, Play, Pause, Trash2, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SOURCE_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// All syncable scopes with their DB tables
const SYNC_SCOPES = [
  { key: 'sales_pipelines',    label: 'Pipelines de Vendas',     desc: 'Etapas, estágios e card_schema do funil', table: 'sales_pipelines' },
  { key: 'commission_rules',   label: 'Regras de Comissão',      desc: 'Tabelas e faixas de comissionamento', table: 'commission_rules' },
  { key: 'dunning_rules',      label: 'Réguas de Cobrança',      desc: 'Fluxos automatizados de cobrança', table: 'dunning_rules' },
  { key: 'revenue_rules',      label: 'Regras de Receita',       desc: 'Configurações de reconhecimento de receita', table: 'revenue_rules' },
  { key: 'checkout_sources',   label: 'Fontes de Checkout',      desc: 'Links e configurações de pagamento', table: 'checkout_sources' },
  { key: 'departments',        label: 'Setores/Departamentos',   desc: 'Departamentos e modo de distribuição', table: 'departments' },
  { key: 'sla_rules',          label: 'Regras de SLA',           desc: 'Tempos de resposta e resolução', table: 'sla_rules' },
  { key: 'quick_replies',      label: 'Respostas Rápidas',       desc: 'Templates de resposta rápida "/"', table: 'quick_replies' },
  { key: 'automation_triggers',label: 'Automações',              desc: 'Gatilhos por palavra-chave', table: 'automation_triggers' },
  { key: 'icp_profiles',       label: 'Perfis ICP',              desc: 'Perfis de cliente ideal', table: 'icp_profiles' },
  { key: 'company_profile',    label: 'Perfil da Empresa',       desc: 'Dados cadastrais da empresa', table: 'company_profile' },
];

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  licenseType?: string;
  plan?: string;
}

export default function NexusConfiguracoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['nexus-all-tenants-sync'],
    queryFn: async () => {
      const { data: allTenants } = await supabase.from('tenants').select('id, name, slug').order('name');
      const { data: licenses } = await supabase.from('licenses').select('tenant_id, license_type, plan');
      const licMap = new Map((licenses || []).map((l: any) => [l.tenant_id, l]));
      return (allTenants || []).map((t: any) => ({
        ...t,
        licenseType: licMap.get(t.id)?.license_type || 'individual',
        plan: licMap.get(t.id)?.plan || 'basic',
      })) as TenantOption[];
    },
  });

  const { data: syncLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('tenant_sync_logs').select('*').order('started_at', { ascending: false }).limit(20);
      return data || [];
    },
  });

  // Count source records per scope
  const { data: sourceCounts = {} } = useQuery({
    queryKey: ['source-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const scope of SYNC_SCOPES) {
        const { count } = await supabase.from(scope.table).select('*', { count: 'exact', head: true }).eq('tenant_id', SOURCE_TENANT_ID);
        counts[scope.key] = count || 0;
      }
      return counts;
    },
  });

  const targetTenants = tenants.filter((t) => t.id !== SOURCE_TENANT_ID);
  const sourceTenant = tenants.find((t) => t.id === SOURCE_TENANT_ID);

  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; scope: string; errors: string[] } | null>(null);

  useEffect(() => {
    if (selectAll) setSelectedTargets(targetTenants.map(t => t.id));
    else setSelectedTargets([]);
  }, [selectAll, targetTenants.length]);

  const toggleTarget = (id: string) => setSelectedTargets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleScope = (key: string) => setSelectedScopes(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);

  // ── Core sync function: copy records from source to targets ──
  async function syncTable(tableName: string, targetIds: string[]): Promise<{ synced: number; failed: number; errors: string[] }> {
    // 1. Fetch source records
    const { data: sourceRows, error: fetchErr } = await supabase
      .from(tableName)
      .select('*')
      .eq('tenant_id', SOURCE_TENANT_ID);

    if (fetchErr) return { synced: 0, failed: targetIds.length, errors: [`Fetch error: ${fetchErr.message}`] };
    if (!sourceRows || sourceRows.length === 0) return { synced: targetIds.length, failed: 0, errors: [] }; // Nothing to sync

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    // 2. For each target tenant, delete existing + insert source copy
    const BATCH = 50; // Process 50 tenants at a time
    for (let i = 0; i < targetIds.length; i += BATCH) {
      const batch = targetIds.slice(i, i + BATCH);

      for (const targetId of batch) {
        try {
          // Delete existing records for this tenant
          await supabase.from(tableName).delete().eq('tenant_id', targetId);

          // Prepare new records (remove id, timestamps, set new tenant_id)
          const newRows = sourceRows.map((r: any) => {
            const row = { ...r };
            delete row.id;
            delete row.created_at;
            delete row.updated_at;
            row.tenant_id = targetId;
            return row;
          });

          // Insert in chunks of 100 rows
          for (let j = 0; j < newRows.length; j += 100) {
            const chunk = newRows.slice(j, j + 100);
            const { error: insertErr } = await supabase.from(tableName).insert(chunk);
            if (insertErr) throw insertErr;
          }

          synced++;
        } catch (err: any) {
          failed++;
          errors.push(`${targetId}: ${err.message}`);
        }
      }

      // Update progress
      setProgress(prev => prev ? { ...prev, current: Math.min(i + BATCH, targetIds.length) } : null);
    }

    return { synced, failed, errors };
  }

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (selectedTargets.length === 0 || selectedScopes.length === 0) throw new Error('Selecione escopos e destinos');

      const totalOps = selectedScopes.length * selectedTargets.length;
      setProgress({ current: 0, total: totalOps, scope: '', errors: [] });

      // Create log entry
      const { data: log } = await supabase.from('tenant_sync_logs').insert({
        source_tenant_id: SOURCE_TENANT_ID,
        target_tenant_ids: selectedTargets,
        scope: selectedScopes,
        status: 'running',
        executed_by: user?.id,
      }).select().single();

      let totalSynced = 0;
      let totalFailed = 0;
      const allErrors: string[] = [];

      for (const scopeKey of selectedScopes) {
        const scope = SYNC_SCOPES.find(s => s.key === scopeKey);
        if (!scope) continue;

        setProgress(prev => prev ? { ...prev, scope: scope.label } : null);

        const result = await syncTable(scope.table, selectedTargets);
        totalSynced += result.synced;
        totalFailed += result.failed;
        allErrors.push(...result.errors);
      }

      // Update log
      if (log) {
        await supabase.from('tenant_sync_logs').update({
          status: totalFailed > 0 ? 'partial' : 'completed',
          completed_at: new Date().toISOString(),
          items_synced: totalSynced,
          items_failed: totalFailed,
          error_details: allErrors.slice(0, 50), // Keep max 50 errors
          result: { synced: totalSynced, failed: totalFailed, scopes: selectedScopes.length, targets: selectedTargets.length },
        }).eq('id', log.id);
      }

      setProgress(null);
      return { synced: totalSynced, failed: totalFailed, scopes: selectedScopes.length, targets: selectedTargets.length };
    },
    onSuccess: (result) => {
      refetchLogs();
      if (result.failed > 0) {
        toast.warning(`Sincronização parcial: ${result.synced} ok, ${result.failed} falhas — ${result.scopes} escopos em ${result.targets} contas`);
      } else {
        toast.success(`Sincronização concluída: ${result.scopes} escopos em ${result.targets} contas (${result.synced} operações)`);
      }
    },
    onError: (err: any) => {
      setProgress(null);
      toast.error(err.message);
    },
  });

  const getBadge = (type: string) => {
    if (type === 'internal') return <Badge className="bg-purple-500/20 text-purple-400 text-[9px]">INTERNO</Badge>;
    if (type === 'whitelabel') return <Badge className="bg-blue-500/20 text-blue-400 text-[9px]">WHITELABEL</Badge>;
    return <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px]">INDIVIDUAL</Badge>;
  };

  // ── Schedules ──
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedForm, setSchedForm] = useState({
    name: '', description: '', schedule_type: 'once' as string,
    scheduled_for: '', recurrence: 'weekly' as string,
  });

  const { data: schedules = [], refetch: refetchSchedules } = useQuery({
    queryKey: ['sync-schedules'],
    queryFn: async () => {
      const { data } = await supabase.from('sync_schedules').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const createSchedule = useMutation({
    mutationFn: async () => {
      if (!schedForm.name || selectedScopes.length === 0) throw new Error('Nome e escopos são obrigatórios');
      const payload: any = {
        name: schedForm.name,
        description: schedForm.description || null,
        scopes: selectedScopes,
        target_tenant_ids: selectAll ? [] : selectedTargets,
        target_all: selectAll,
        schedule_type: schedForm.schedule_type,
        is_active: true,
        created_by: user?.id,
      };
      if (schedForm.schedule_type === 'once' && schedForm.scheduled_for) {
        payload.scheduled_for = new Date(schedForm.scheduled_for).toISOString();
        payload.next_run_at = payload.scheduled_for;
      }
      if (schedForm.schedule_type === 'recurring') {
        payload.recurrence = schedForm.recurrence;
        // Calculate next run based on recurrence
        const now = new Date();
        if (schedForm.recurrence === 'daily') now.setDate(now.getDate() + 1);
        else if (schedForm.recurrence === 'weekly') now.setDate(now.getDate() + 7);
        else if (schedForm.recurrence === 'monthly') now.setMonth(now.getMonth() + 1);
        now.setHours(3, 0, 0, 0); // 3AM
        payload.next_run_at = now.toISOString();
      }
      const { error } = await supabase.from('sync_schedules').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchSchedules();
      setScheduleOpen(false);
      setSchedForm({ name: '', description: '', schedule_type: 'once', scheduled_for: '', recurrence: 'weekly' });
      toast.success('Agendamento criado');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleSchedule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from('sync_schedules').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id);
    },
    onSuccess: () => refetchSchedules(),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('sync_schedules').delete().eq('id', id);
    },
    onSuccess: () => { refetchSchedules(); toast.success('Agendamento removido'); },
  });

  const runScheduleNow = async (sched: any) => {
    // Set the selected scopes and targets from the schedule, then run sync
    setSelectedScopes(sched.scopes || []);
    if (sched.target_all) {
      setSelectAll(true);
    } else {
      setSelectedTargets(sched.target_tenant_ids || []);
    }
    // Wait for state update then trigger
    setTimeout(() => syncMutation.mutate(), 100);
    // Update last_run
    await supabase.from('sync_schedules').update({
      last_run_at: new Date().toISOString(),
      last_run_status: 'running',
      total_runs: (sched.total_runs || 0) + 1,
    }).eq('id', sched.id);
  };

  const RECURRENCE_LABELS: Record<string, string> = { daily: 'Diário (3h)', weekly: 'Semanal (seg 3h)', monthly: 'Mensal (dia 1, 3h)' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Sincronização de Configurações</h1>
        <p className="text-sm text-muted-foreground">Replique configurações da conta interna para todas as licenças (WLs + clientes diretos).</p>
      </div>

      {/* Source */}
      <Card className="border-primary/30 border-2">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{sourceTenant?.name || 'WHATSFLOW EDTECH LTDA'}</p>
              <p className="text-xs text-muted-foreground">Conta de origem — todas as correções e inovações são feitas aqui primeiro</p>
            </div>
            <Badge className="bg-purple-500/20 text-purple-400">ORIGEM</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold text-primary">{selectedTargets.length}</span>
            <span className="text-xs text-muted-foreground">destinos</span>
          </div>
        </CardContent>
      </Card>

      {/* Scopes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">O que sincronizar</p>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedScopes(selectedScopes.length === SYNC_SCOPES.length ? [] : SYNC_SCOPES.map(s => s.key))}>
            {selectedScopes.length === SYNC_SCOPES.length ? "Desmarcar todos" : "Selecionar todos"}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SYNC_SCOPES.map((scope) => {
            const count = sourceCounts[scope.key] || 0;
            return (
              <label key={scope.key} className={`flex items-start gap-3 p-3 border cursor-pointer transition-all ${selectedScopes.includes(scope.key) ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-border/80'}`}>
                <Checkbox checked={selectedScopes.includes(scope.key)} onCheckedChange={() => toggleScope(scope.key)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{scope.label}</p>
                    <Badge variant="outline" className="text-[9px]">{count} reg.</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{scope.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Targets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Para quem sincronizar ({selectedTargets.length}/{targetTenants.length})
          </p>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={selectAll} onCheckedChange={setSelectAll} />
            Todas as {targetTenants.length} contas
          </label>
        </div>

        {tenantsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {targetTenants.map((t) => (
              <label key={t.id} className={`flex items-center gap-3 p-2 border cursor-pointer transition-colors ${selectedTargets.includes(t.id) ? 'border-primary/40 bg-primary/5' : 'border-border/50 hover:border-border'}`}>
                <Checkbox checked={selectedTargets.includes(t.id)} onCheckedChange={() => toggleTarget(t.id)} />
                <span className="text-sm font-medium flex-1 truncate">{t.name}</span>
                {getBadge(t.licenseType || 'individual')}
                <Badge variant="outline" className="text-[9px]">{t.plan}</Badge>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {progress && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Sincronizando: <strong>{progress.scope}</strong></span>
              <span className="text-muted-foreground">{progress.current}/{progress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
            {progress.errors.length > 0 && (
              <p className="text-[10px] text-red-400">{progress.errors.length} erro(s)</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ Agendamentos ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Agendamentos
          </p>
          <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)} className="gap-1 text-xs">
            <Plus size={12} /> Novo Agendamento
          </Button>
        </div>

        {schedules.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              Nenhum agendamento criado. Crie um para automatizar sincronizações.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {schedules.map((s: any) => (
              <Card key={s.id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{s.name}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {s.schedule_type === 'once' ? '📅 Única vez' : s.schedule_type === 'recurring' ? `🔄 ${RECURRENCE_LABELS[s.recurrence] || s.recurrence}` : '🖐️ Manual'}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">{(s.scopes || []).length} escopos</Badge>
                      <Badge variant="outline" className="text-[9px]">{s.target_all ? 'Todas' : `${(s.target_tenant_ids || []).length} contas`}</Badge>
                    </div>
                    {s.description && <p className="text-[10px] text-muted-foreground">{s.description}</p>}
                    <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                      {s.next_run_at && <span>Próxima: {new Date(s.next_run_at).toLocaleString('pt-BR')}</span>}
                      {s.last_run_at && <span>Última: {new Date(s.last_run_at).toLocaleString('pt-BR')}</span>}
                      {s.total_runs > 0 && <span>Execuções: {s.total_runs}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => runScheduleNow(s)} disabled={syncMutation.isPending}>
                      <Play size={10} /> Executar
                    </Button>
                    <Switch checked={s.is_active} onCheckedChange={(v) => toggleSchedule.mutate({ id: s.id, active: v })} />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => deleteSchedule.mutate(s.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Schedule create modal */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Agendamento de Sync</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Nome</Label><Input value={schedForm.name} onChange={(e) => setSchedForm({ ...schedForm, name: e.target.value })} placeholder="Ex: Sync semanal pós-deploy" /></div>
            <div><Label>Descrição (opcional)</Label><Textarea value={schedForm.description} onChange={(e) => setSchedForm({ ...schedForm, description: e.target.value })} placeholder="O que será atualizado e por quê" rows={2} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={schedForm.schedule_type} onValueChange={(v) => setSchedForm({ ...schedForm, schedule_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (executar sob demanda)</SelectItem>
                  <SelectItem value="once">Agendar para data específica</SelectItem>
                  <SelectItem value="recurring">Recorrente (automático)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {schedForm.schedule_type === 'once' && (
              <div><Label>Data e hora</Label><Input type="datetime-local" value={schedForm.scheduled_for} onChange={(e) => setSchedForm({ ...schedForm, scheduled_for: e.target.value })} /></div>
            )}
            {schedForm.schedule_type === 'recurring' && (
              <div>
                <Label>Recorrência</Label>
                <Select value={schedForm.recurrence} onValueChange={(v) => setSchedForm({ ...schedForm, recurrence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário (todos os dias às 3h)</SelectItem>
                    <SelectItem value="weekly">Semanal (segunda às 3h)</SelectItem>
                    <SelectItem value="monthly">Mensal (dia 1 às 3h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="p-3 text-xs" style={{ background: "var(--acc-bg, rgba(14,138,92,0.08))", color: "var(--acc, #0E8A5C)", border: "1px solid var(--acc-border, rgba(14,138,92,0.25))" }}>
              Escopos selecionados: {selectedScopes.length > 0 ? selectedScopes.length : "nenhum (selecione acima)"}
              <br />Destinos: {selectAll ? "Todas as contas" : `${selectedTargets.length} contas selecionadas`}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
            <Button onClick={() => createSchedule.mutate()} disabled={!schedForm.name || selectedScopes.length === 0 || createSchedule.isPending} className="gap-1">
              {createSchedule.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Calendar size={14} /> Criar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync button (manual/immediate) */}
      <Button
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending || selectedTargets.length === 0 || selectedScopes.length === 0}
        className="w-full gap-2" size="lg"
      >
        {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sincronizar {selectedScopes.length} escopo(s) → {selectedTargets.length} conta(s)
        {selectedTargets.length > 0 && selectedScopes.length > 0 && (
          <span className="text-xs opacity-70">({selectedScopes.length * selectedTargets.length} operações)</span>
        )}
      </Button>

      {/* Logs */}
      {syncLogs.length > 0 && (
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Histórico de Sincronizações</p>
          <div className="space-y-1.5">
            {syncLogs.map((log: any) => (
              <div key={log.id} className="flex items-center gap-2 text-xs p-2.5 bg-muted/30 border border-border/50">
                {log.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  : log.status === 'running' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                  : log.status === 'partial' ? <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                <span className="text-muted-foreground">{new Date(log.started_at).toLocaleString('pt-BR')}</span>
                <span>{log.result?.scopes || log.scope?.length || 0} escopos</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span>{log.result?.targets || log.target_tenant_ids?.length || 0} contas</span>
                <span className="text-emerald-400">{log.items_synced || 0} ok</span>
                {(log.items_failed || 0) > 0 && <span className="text-red-400">{log.items_failed} falhas</span>}
                <Badge variant="outline" className="text-[9px] ml-auto">{log.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
