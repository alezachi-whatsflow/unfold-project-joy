import { useState, useMemo } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Plus, Eye, DollarSign, Target, BarChart3, CalendarDays, CheckCircle, XCircle } from "lucide-react";
import { NEGOCIO_STATUS_CONFIG, ACTIVE_STATUSES, type Negocio } from "@/types/vendas";
import NegocioDrawer from "@/components/vendas/NegocioDrawer";
import NegocioCreateModal from "@/components/vendas/NegocioCreateModal";

export default function VendasMeusNegocios() {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const { userRole } = usePermissions();
  const { negocios, isLoading } = useNegocios(tenantId);
  const [search, setSearch] = useState("");
  const [drawerNeg, setDrawerNeg] = useState<Negocio | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const isRepresentante = userRole === 'representante';

  const meusNegocios = useMemo(() => {
    let list = negocios.filter(n => n.consultor_id === user?.id);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(n => n.titulo.toLowerCase().includes(q) || (n.cliente_nome || '').toLowerCase().includes(q));
    }
    return list;
  }, [negocios, user?.id, search]);

  const kpis = useMemo(() => {
    const ativos = meusNegocios.filter(n => ACTIVE_STATUSES.includes(n.status));
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ganhosMes = meusNegocios.filter(n => {
      if (n.status !== 'fechado_ganho' || !n.data_fechamento) return false;
      return new Date(n.data_fechamento) >= monthStart;
    }).reduce((s, n) => s + n.valor_liquido, 0);

    const fechados = meusNegocios.filter(n => n.status === 'fechado_ganho' || n.status === 'fechado_perdido');
    const ganhos = meusNegocios.filter(n => n.status === 'fechado_ganho');
    const taxa = fechados.length > 0 ? (ganhos.length / fechados.length) * 100 : 0;

    const proximo = ativos
      .filter(n => n.data_previsao_fechamento)
      .sort((a, b) => new Date(a.data_previsao_fechamento!).getTime() - new Date(b.data_previsao_fechamento!).getTime())[0];

    return {
      ativos: ativos.length,
      ganhosMes,
      taxa,
      proximo: proximo ? new Date(proximo.data_previsao_fechamento!).toLocaleDateString('pt-BR') : '—',
    };
  }, [meusNegocios]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={Target} label="Negócios Ativos" value={String(kpis.ativos)} />
        <KPICard icon={DollarSign} label="Receita Fechada (mês)" value={fmt(kpis.ganhosMes)} />
        <KPICard icon={BarChart3} label="Taxa Conversão" value={`${kpis.taxa.toFixed(1)}%`} />
        <KPICard icon={CalendarDays} label="Próx. Fechamento" value={kpis.proximo} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <PermissionGate module="vendas" action="create">
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Novo Negócio</Button>
        </PermissionGate>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Fechamento</TableHead>
                  {!isRepresentante && <TableHead>Cobrança</TableHead>}
                  {!isRepresentante && <TableHead>NF</TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : meusNegocios.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum negócio encontrado</TableCell></TableRow>
                ) : meusNegocios.map(n => {
                  const sc = NEGOCIO_STATUS_CONFIG[n.status];
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium text-sm truncate max-w-[200px]">{n.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">{n.cliente_nome || '—'}</TableCell>
                      <TableCell>
                        <Badge className="text-[10px]" style={{ background: `${sc.color}20`, color: sc.color, border: `1px solid ${sc.color}40` }}>
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(n.valor_liquido)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {n.data_previsao_fechamento ? new Date(n.data_previsao_fechamento).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      {!isRepresentante && (
                        <TableCell>
                          {n.cobranca_id ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground/30" />}
                        </TableCell>
                      )}
                      {!isRepresentante && (
                        <TableCell>
                          {n.nf_emitida_id ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground/30" />}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDrawerNeg(n)}><Eye className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!drawerNeg} onOpenChange={o => { if (!o) setDrawerNeg(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0">
          {drawerNeg && <NegocioDrawer negocio={drawerNeg} onClose={() => setDrawerNeg(null)} />}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <NegocioCreateModal onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPICard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
