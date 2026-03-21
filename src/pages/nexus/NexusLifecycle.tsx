import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Loader2, Database, Clock, Shield, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, Download, FileKey, Trash2, Search,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR');
}
function fmtBytes(b: number) {
  if (b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
function daysUntil(d: string) {
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const OP_LABELS: Record<string, string> = {
  encrypt_file: 'Criptografar arquivo',
  delete_device_files: 'Excluir arquivos de dispositivo',
  delete_tenant: 'Excluir tenant',
  delete_tenant_storage: 'Limpar storage do tenant',
  soft_delete_tenant: 'Soft delete tenant',
  hard_delete_tenant: 'Hard delete tenant',
  queue_files_for_encryption: 'Identificar arquivos para cripto',
  encrypt_old_files_batch: 'Lote de criptografia',
  delete_device_cascade: 'Cascata de exclusão de dispositivo',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  processing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  skipped: 'bg-muted text-muted-foreground',
  partial: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', processing: 'Processando', completed: 'Concluído',
  failed: 'Falhou', skipped: 'Ignorado', partial: 'Parcial',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function NexusLifecycle() {
  const { can, nexusUser } = useNexus();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'queue' | 'audit' | 'storage'>('queue');
  const [opFilter, setOpFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [requeueTarget, setRequeueTarget] = useState<string | null>(null);
  const [requeueing, setRequeueing] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: queueItems, isLoading: queueLoading } = useQuery({
    queryKey: ['lifecycle-queue', opFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('data_lifecycle_queue')
        .select('*')
        .order('scheduled_for', { ascending: false })
        .limit(200);
      if (opFilter !== 'all') q = q.eq('operation_type', opFilter);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data } = await q;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: auditItems, isLoading: auditLoading } = useQuery({
    queryKey: ['lifecycle-audit'],
    queryFn: async () => {
      const { data } = await supabase
        .from('data_lifecycle_audit')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(300);
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: tenantStats, isLoading: statsLoading } = useQuery({
    queryKey: ['lifecycle-tenant-stats'],
    queryFn: async () => {
      const { data: pending } = await supabase
        .from('data_lifecycle_queue')
        .select('*', { count: 'exact', head: true })
        .eq('operation_type', 'encrypt_file')
        .eq('status', 'pending');

      const { data: pendingDel } = await supabase
        .from('data_lifecycle_queue')
        .select('*', { count: 'exact', head: true })
        .eq('operation_type', 'delete_tenant')
        .eq('status', 'pending');

      const { data: failedItems } = await supabase
        .from('data_lifecycle_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, deleted_at, deletion_scheduled_for')
        .not('deleted_at', 'is', null)
        .order('deletion_scheduled_for', { ascending: true });

      return {
        pendingEncryption: (pending as any)?.count || 0,
        pendingDeletions: (pendingDel as any)?.count || 0,
        failedItems: (failedItems as any)?.count || 0,
        tenantsInGrace: tenants || [],
      };
    },
    refetchInterval: 60000,
  });

  // ── Filtros locais ────────────────────────────────────────────────────────

  const filteredQueue = useMemo(() => {
    if (!search.trim()) return queueItems || [];
    const q = search.toLowerCase();
    return (queueItems || []).filter((i: any) =>
      i.tenant_id?.toLowerCase().includes(q) ||
      i.operation_type?.includes(q) ||
      i.storage_path?.includes(q)
    );
  }, [queueItems, search]);

  const filteredAudit = useMemo(() => {
    if (!search.trim()) return auditItems || [];
    const q = search.toLowerCase();
    return (auditItems || []).filter((i: any) =>
      i.tenant_name?.toLowerCase().includes(q) ||
      i.operation_type?.includes(q)
    );
  }, [auditItems, search]);

  // ── Ações ─────────────────────────────────────────────────────────────────

  async function handleRequeue(itemId: string) {
    setRequeueing(true);
    const { error } = await supabase
      .from('data_lifecycle_queue')
      .update({ status: 'pending', attempts: 0, error_message: null, started_at: null })
      .eq('id', itemId);

    if (error) {
      toast({ title: 'Erro ao re-enfileirar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Item re-enfileirado com sucesso' });
      qc.invalidateQueries({ queryKey: ['lifecycle-queue'] });
    }
    setRequeueing(false);
    setRequeueTarget(null);
  }

  function exportAuditCSV() {
    const rows = (auditItems || []).map((a: any) => [
      fmtDate(a.executed_at),
      a.tenant_name || '—',
      OP_LABELS[a.operation_type] || a.operation_type,
      a.operation_status,
      a.records_affected || 0,
      a.files_encrypted || 0,
      a.files_deleted || 0,
      fmtBytes(a.storage_bytes_freed || 0),
      a.triggered_by,
      a.execution_duration_ms ? `${a.execution_duration_ms}ms` : '—',
    ].join(';'));

    const csv = [
      'Data;Tenant;Operação;Status;Registros;Arquivos criptografados;Arquivos excluídos;Espaço liberado;Disparado por;Duração',
      ...rows,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifecycle-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-6 w-6 text-muted-foreground" />
            Lifecycle de Dados
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoramento de criptografia, exclusões e conformidade LGPD
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ['lifecycle-queue'] });
            qc.invalidateQueries({ queryKey: ['lifecycle-audit'] });
            qc.invalidateQueries({ queryKey: ['lifecycle-tenant-stats'] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={Clock}
          label="Exclusões agendadas"
          value={String(tenantStats?.pendingDeletions || 0)}
          color="text-amber-400"
          sub="tenants em período de graça"
        />
        <SummaryCard
          icon={FileKey}
          label="Aguardando criptografia"
          value={String(tenantStats?.pendingEncryption || 0)}
          color="text-blue-400"
          sub="arquivos com 6+ meses"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Falhas no lifecycle"
          value={String(tenantStats?.failedItems || 0)}
          color="text-red-400"
          sub="itens com erro"
        />
        <SummaryCard
          icon={Shield}
          label="Tenants em graça"
          value={String(tenantStats?.tenantsInGrace?.length || 0)}
          color="text-purple-400"
          sub="aguardando exclusão"
        />
      </div>

      {/* Tenants em período de graça */}
      {(tenantStats?.tenantsInGrace?.length || 0) > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tenants em Período de Graça
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Excluído em</TableHead>
                  <TableHead>Exclusão permanente</TableHead>
                  <TableHead>Dias restantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantStats?.tenantsInGrace?.map((t: any) => {
                  const days = t.deletion_scheduled_for ? daysUntil(t.deletion_scheduled_for) : 0;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{fmtDate(t.deleted_at)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{fmtDate(t.deletion_scheduled_for)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={days <= 7 ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}
                        >
                          {days} dias
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['queue', 'audit', 'storage'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'queue' ? 'Fila de Operações' : t === 'audit' ? 'Audit Log' : 'Resumo de Storage'}
          </button>
        ))}
      </div>

      {/* ── ABA 1: Fila ──────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por tenant ou path..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={opFilter} onValueChange={setOpFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="encrypt_file">Criptografar arquivo</SelectItem>
                <SelectItem value="delete_device_files">Excluir arquivos de dispositivo</SelectItem>
                <SelectItem value="delete_tenant">Excluir tenant</SelectItem>
                <SelectItem value="delete_tenant_storage">Limpar storage</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="skipped">Ignorado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-0">
              {queueLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : filteredQueue.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhum item encontrado.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agendado para</TableHead>
                      <TableHead>Tenant ID</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tentativas</TableHead>
                      <TableHead>Erro</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQueue.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs">{fmtDate(item.scheduled_for)}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {item.tenant_id ? item.tenant_id.split('-')[0] + '...' : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{OP_LABELS[item.operation_type] || item.operation_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${STATUS_BADGE[item.status] || ''}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center">{item.attempts || 0}</TableCell>
                        <TableCell className="text-xs text-red-400 max-w-[200px] truncate">
                          {item.error_message || '—'}
                        </TableCell>
                        <TableCell>
                          {item.status === 'failed' && can(['nexus_superadmin']) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Re-enfileirar"
                              onClick={() => setRequeueTarget(item.id)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABA 2: Audit Log ─────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por tenant ou operação..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button size="sm" variant="outline" onClick={exportAuditCSV}>
              <Download className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
          </div>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-0">
              {auditLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : filteredAudit.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Arquivos</TableHead>
                      <TableHead>Espaço lib.</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAudit.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">{fmtDate(a.executed_at)}</TableCell>
                        <TableCell className="text-xs font-medium">{a.tenant_name || '—'}</TableCell>
                        <TableCell className="text-xs">{OP_LABELS[a.operation_type] || a.operation_type}</TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1 text-xs ${
                            a.operation_status === 'completed' ? 'text-emerald-400' :
                            a.operation_status === 'failed' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {a.operation_status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> :
                             a.operation_status === 'failed' ? <XCircle className="h-3 w-3" /> :
                             <AlertTriangle className="h-3 w-3" />}
                            {STATUS_LABELS[a.operation_status] || a.operation_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right">{a.records_affected || '—'}</TableCell>
                        <TableCell className="text-xs text-right">
                          {a.files_encrypted > 0 && <span className="text-blue-400">{a.files_encrypted} enc.</span>}
                          {a.files_deleted > 0 && <span className="text-red-400 ml-1">{a.files_deleted} del.</span>}
                          {!a.files_encrypted && !a.files_deleted && '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.storage_bytes_freed > 0 ? fmtBytes(a.storage_bytes_freed) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.execution_duration_ms ? `${a.execution_duration_ms}ms` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.triggered_by}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABA 3: Storage ───────────────────────────────────────────── */}
      {tab === 'storage' && (
        <div className="space-y-4">
          {statsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Arquivos pendentes de criptografia</p>
                  <p className="text-3xl font-bold text-blue-400">{tenantStats?.pendingEncryption || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">com 6+ meses no servidor</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Próximas exclusões (7 dias)</p>
                  <p className="text-3xl font-bold text-red-400">
                    {tenantStats?.tenantsInGrace?.filter((t: any) =>
                      t.deletion_scheduled_for && daysUntil(t.deletion_scheduled_for) <= 7
                    ).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">tenants com exclusão iminente</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Itens com falha</p>
                  <p className="text-3xl font-bold text-amber-400">{tenantStats?.failedItems || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">precisam de atenção</p>
                  {Number(tenantStats?.failedItems) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs"
                      onClick={() => { setTab('queue'); setStatusFilter('failed'); }}
                    >
                      Ver falhas
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Espaço liberado por operação (histórico)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(['delete_device_files', 'delete_tenant_storage', 'encrypt_file'] as const).map(opType => {
                  const items = (auditItems || []).filter((a: any) => a.operation_type === opType);
                  const totalBytes = items.reduce((sum: number, a: any) => sum + (a.storage_bytes_freed || 0), 0);
                  const totalFiles = items.reduce((sum: number, a: any) => sum + (a.files_deleted || 0) + (a.files_encrypted || 0), 0);
                  return (
                    <div key={opType} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{OP_LABELS[opType]}</p>
                        <p className="text-xs text-muted-foreground">{items.length} execuções</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-400">{fmtBytes(totalBytes)}</p>
                        <p className="text-xs text-muted-foreground">{totalFiles} arquivos</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Re-queue dialog */}
      <AlertDialog open={!!requeueTarget} onOpenChange={open => { if (!open) setRequeueTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-enfileirar operação?</AlertDialogTitle>
            <AlertDialogDescription>
              O item será marcado como pendente e reprocessado na próxima execução do job.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => requeueTarget && handleRequeue(requeueTarget)} disabled={requeueing}>
              {requeueing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Re-enfileirar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string; color: string; sub?: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className={`h-5 w-5 ${color} mt-0.5`} />
        </div>
      </CardContent>
    </Card>
  );
}
