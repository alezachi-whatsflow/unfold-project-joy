import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Ticket } from 'lucide-react';

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
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase
      .from('nexus_tickets')
      .select('*, creator:nexus_users!nexus_tickets_created_by_fkey(name), assignee:nexus_users!nexus_tickets_assigned_to_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(100);
    setTickets(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ticket className="h-6 w-6" /> Tickets Internos
          </h1>
          <p className="text-sm text-muted-foreground">{tickets.length} tickets</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Abrir Ticket
        </Button>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
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
                {tickets.map((t) => (
                  <TableRow key={t.id} className="hover:bg-accent/30 cursor-pointer">
                    <TableCell className="text-sm font-medium">{t.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.creator?.name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.assignee?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${PRIORITY_STYLES[t.priority] || ''}`}>
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_STYLES[t.status] || ''}`}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
                {tickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum ticket encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
