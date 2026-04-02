import { fmtDate } from "@/lib/dateUtils";
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
import { Loader2, Plus, Ticket, Search } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import TicketFormModal from '@/components/nexus/TicketFormModal';

const PRIORITY_STYLES: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-500/20 text-blue-400',
  alta: 'bg-amber-500/20 text-amber-400',
  critica: 'bg-red-500/20 text-red-400 animate-pulse',
};

const STATUS_STYLES: Record<string, string> = {
  aberto: 'bg-emerald-500/20 text-emerald-400',
  em_andamento: 'bg-blue-500/20 text-blue-400',
  resolvido: 'bg-muted text-muted-foreground',
  fechado: 'bg-muted text-muted-foreground',
};

export default function NexusTickets() {
  const { nexusUser } = useNexus();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTicket, setEditTicket] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

  useEffect(() => { loadTickets(); }, []);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase
      .from('nexus_tickets')
      .select('*, creator:nexus_users!nexus_tickets_created_by_fkey(name), assignee:nexus_users!nexus_tickets_assigned_to_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(200);
    setTickets(data || []);
    setLoading(false);
  }

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (viewMode === 'mine' && t.assigned_to !== nexusUser?.id && t.created_by !== nexusUser?.id) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!t.title?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ticket className="h-6 w-6" /> Tickets Internos
          </h1>
          <p className="text-sm text-muted-foreground">{tickets.length} tickets</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={viewMode === 'mine' ? 'default' : 'outline'} onClick={() => setViewMode(viewMode === 'mine' ? 'all' : 'mine')}>
            {viewMode === 'mine' ? 'Todos os Tickets' : 'Meus Tickets'}
          </Button>
          <Button size="sm" onClick={() => { setEditTicket(null); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Abrir Ticket
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
            <SelectItem value="fechado">Fechado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className="hover:bg-accent/30 cursor-pointer" onClick={() => { setEditTicket(t); setShowModal(true); }}>
                    <TableCell>
                      <p className="text-sm font-medium">{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.creator?.name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.assignee?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${PRIORITY_STYLES[t.priority] || ''}`}>{t.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_STYLES[t.status] || ''}`}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(t.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum ticket encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <TicketFormModal open={showModal} onOpenChange={setShowModal} onSaved={loadTickets} ticket={editTicket} />
      )}
    </div>
  );
}
