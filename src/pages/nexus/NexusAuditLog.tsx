import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Search, ScrollText, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 100;

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-emerald-500/20 text-emerald-400',
  logout: 'bg-muted text-muted-foreground',
  impersonation_start: 'bg-purple-500/20 text-purple-400',
  impersonation_end: 'bg-purple-500/20 text-purple-400',
  license_edit: 'bg-blue-500/20 text-blue-400',
  license_create: 'bg-emerald-500/20 text-emerald-400',
  license_block: 'bg-red-500/20 text-red-400',
  license_unblock: 'bg-amber-500/20 text-amber-400',
  feature_flag_change: 'bg-cyan-500/20 text-cyan-400',
  ticket_create: 'bg-blue-500/20 text-blue-400',
  ticket_update: 'bg-blue-500/20 text-blue-400',
  csv_import: 'bg-amber-500/20 text-amber-400',
  billing_update: 'bg-amber-500/20 text-amber-400',
  team_member_create: 'bg-emerald-500/20 text-emerald-400',
  team_member_edit: 'bg-blue-500/20 text-blue-400',
};

const ACTION_TYPES = [
  'login', 'logout', 'license_create', 'license_edit', 'license_block',
  'license_unblock', 'impersonation_start', 'impersonation_end',
  'feature_flag_change', 'ticket_create', 'ticket_update', 'csv_import', 'billing_update',
];

export default function NexusAuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  async function loadLogs() {
    setLoading(true);
    let query = supabase
      .from('nexus_audit_logs')
      .select('*, nexus_users!nexus_audit_logs_actor_id_fkey(name, role)', { count: 'exact' });

    if (actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    setLogs(data || []);
    setTotal(count || 0);
    setLoading(false);
  }

  const filtered = search.trim()
    ? logs.filter((l) => {
        const q = search.toLowerCase();
        return (
          l.action?.toLowerCase().includes(q) ||
          l.nexus_users?.name?.toLowerCase().includes(q) ||
          l.target_entity?.toLowerCase().includes(q)
        );
      })
    : logs;

  function exportCSV() {
    const rows = filtered.map((l) => [
      new Date(l.created_at).toLocaleString('pt-BR'),
      l.nexus_users?.name || '', l.actor_role, l.action,
      l.target_entity || '', l.ip_address || '',
    ].join(';'));
    const csv = ['Data;Ator;Role;Ação;Entidade;IP', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'audit-log.csv'; a.click();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="h-6 w-6" /> Auditoria
          </h1>
          <p className="text-sm text-muted-foreground">{total} registros</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por ação, ator ou entidade..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo de ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {ACTION_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ator</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-sm">{log.nexus_users?.name || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{log.actor_role}</Badge></TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}`}>{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.target_entity || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.ip_address || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages || 1}</span>
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
  );
}
