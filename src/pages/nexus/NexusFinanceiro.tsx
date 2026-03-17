import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DollarSign, TrendingUp, Target, Loader2, Download, MoreHorizontal, CheckCircle, AlertTriangle, Ban } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { useToast } from '@/hooks/use-toast';

const CONDITION_BADGES: Record<string, string> = {
  em_dia: 'bg-emerald-500/20 text-emerald-400',
  em_aberto: 'bg-amber-500/20 text-amber-400',
  inadimplente: 'bg-red-500/20 text-red-400',
  em_pausa: 'bg-muted text-muted-foreground',
  bloqueado: 'bg-red-500/20 text-red-400',
};

export default function NexusFinanceiro() {
  const { nexusUser } = useNexus();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billings, setBillings] = useState<any[]>([]);
  const [conditionFilter, setConditionFilter] = useState('all');

  useEffect(() => {
    loadFinanceiro();
  }, []);

  async function loadFinanceiro() {
    setLoading(true);
    const { data: licenses } = await supabase
      .from('licenses')
      .select('*, tenants!inner(name, email)');

    const all = licenses || [];
    const active = all.filter((l: any) => l.status === 'active');
    const mrr = active.reduce((s: number, l: any) => s + (Number(l.monthly_value) || 0), 0);
    const arr = mrr * 12;
    const pagantes = active.filter((l: any) => Number(l.monthly_value) > 0);
    const ticketMedio = pagantes.length > 0 ? mrr / pagantes.length : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = all.filter((l: any) => new Date(l.created_at) >= startOfMonth).length;
    const churnThisMonth = all.filter((l: any) => l.status === 'inactive' && l.updated_at && new Date(l.updated_at) >= startOfMonth).length;

    setStats({ mrr, arr, ticketMedio, newThisMonth, churnThisMonth, totalActive: active.length, totalPagantes: pagantes.length });
    setBillings(all);
    setLoading(false);
  }

  async function updateStatus(licenseId: string, newStatus: string, tenantName: string) {
    await supabase.from('licenses').update({ status: newStatus }).eq('id', licenseId);
    await supabase.from('nexus_audit_logs').insert({
      actor_id: nexusUser?.id, actor_role: nexusUser?.role || '',
      action: 'billing_update', license_id: licenseId, target_entity: tenantName,
      new_value: { status: newStatus },
    });
    toast({ title: `Status atualizado para ${newStatus}` });
    loadFinanceiro();
  }

  function exportCSV() {
    const rows = filteredBillings.map((l: any) => [
      l.tenants?.name, l.plan, Number(l.monthly_value || 0).toFixed(2), l.status, l.billing_cycle,
      l.expires_at ? new Date(l.expires_at).toLocaleDateString('pt-BR') : '',
    ].join(';'));
    const csv = ['Empresa;Plano;Valor;Status;Ciclo;Vencimento', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'financeiro.csv'; a.click();
  }

  const filteredBillings = conditionFilter === 'all'
    ? billings
    : billings.filter((l: any) => l.status === conditionFilter);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const cards = [
    { title: 'MRR Total', value: `R$ ${stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-500' },
    { title: 'ARR Estimado', value: `R$ ${stats.arr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-blue-500' },
    { title: 'Ticket Médio', value: `R$ ${stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Target, color: 'text-amber-500' },
    { title: 'Churn (mês)', value: stats.churnThisMonth, icon: AlertTriangle, color: stats.churnThisMonth > 0 ? 'text-red-500' : 'text-muted-foreground' },
    { title: 'Novas (mês)', value: stats.newThisMonth, icon: TrendingUp, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">{stats.totalActive} ativas — {stats.totalPagantes} pagantes</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Exportar</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className="bg-card/50 border-border/50">
            <CardContent className="pt-5 pb-4">
              <c.icon className={`h-5 w-5 mb-2 ${c.color}`} />
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Billing Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Cobranças</CardTitle>
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Filtrar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="blocked">Bloqueadas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBillings.slice(0, 50).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{l.tenants?.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{l.tenants?.email}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.plan}</Badge></TableCell>
                  <TableCell className="text-sm">R$ {Number(l.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.billing_cycle || '—'}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${CONDITION_BADGES[l.status] || 'bg-muted text-muted-foreground'}`}>
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.expires_at ? new Date(l.expires_at).toLocaleDateString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateStatus(l.id, 'active', l.tenants?.name)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-2" /> Marcar Em Dia
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(l.id, 'blocked', l.tenants?.name)} className="text-destructive">
                          <Ban className="h-3.5 w-3.5 mr-2" /> Bloquear
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
