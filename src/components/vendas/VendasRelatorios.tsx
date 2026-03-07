import { useMemo } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, BarChart3, Clock, Target, TrendingUp, Flame } from "lucide-react";
import { NEGOCIO_STATUS_CONFIG, NEGOCIO_ORIGEM_LABELS, ACTIVE_STATUSES, type NegocioStatus, type NegocioOrigem } from "@/types/vendas";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, FunnelChart } from "recharts";

export default function VendasRelatorios() {
  const { negocios } = useNegocios();

  const kpis = useMemo(() => {
    const ganhos = negocios.filter(n => n.status === 'fechado_ganho');
    const perdidos = negocios.filter(n => n.status === 'fechado_perdido');
    const fechados = [...ganhos, ...perdidos];
    const ativos = negocios.filter(n => ACTIVE_STATUSES.includes(n.status));

    const receitaFechada = ganhos.reduce((s, n) => s + n.valor_liquido, 0);
    const taxaConversao = fechados.length > 0 ? (ganhos.length / fechados.length) * 100 : 0;

    const cicloMedio = ganhos.length > 0
      ? ganhos.reduce((s, n) => {
          const created = new Date(n.data_criacao);
          const closed = n.data_fechamento ? new Date(n.data_fechamento) : new Date();
          return s + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / ganhos.length
      : 0;

    const ticketMedio = ganhos.length > 0 ? receitaFechada / ganhos.length : 0;
    const pipelineAtivo = ativos.reduce((s, n) => s + n.valor_liquido, 0);

    const now = new Date();
    const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const previsao30 = ativos.filter(n => {
      if (!n.data_previsao_fechamento) return false;
      const d = new Date(n.data_previsao_fechamento);
      return d <= next30;
    }).reduce((s, n) => s + n.valor_liquido, 0);

    return { receitaFechada, taxaConversao, cicloMedio, ticketMedio, pipelineAtivo, ativosCount: ativos.length, previsao30 };
  }, [negocios]);

  // Revenue by month (last 12)
  const revenueByMonth = useMemo(() => {
    const months: Record<string, { ganho: number; perdido: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { ganho: 0, perdido: 0 };
    }
    negocios.forEach(n => {
      if (!n.data_fechamento) return;
      const key = n.data_fechamento.substring(0, 7);
      if (!months[key]) return;
      if (n.status === 'fechado_ganho') months[key].ganho += n.valor_liquido;
      if (n.status === 'fechado_perdido') months[key].perdido += n.valor_liquido;
    });
    return Object.entries(months).map(([month, v]) => ({
      month: month.substring(5) + '/' + month.substring(2, 4),
      Ganho: v.ganho,
      Perdido: v.perdido,
    }));
  }, [negocios]);

  // Pipeline by status
  const funnelData = useMemo(() => {
    return ACTIVE_STATUSES.map(status => ({
      name: NEGOCIO_STATUS_CONFIG[status].label,
      value: negocios.filter(n => n.status === status).length,
      total: negocios.filter(n => n.status === status).reduce((s, n) => s + n.valor_liquido, 0),
      color: NEGOCIO_STATUS_CONFIG[status].color,
    }));
  }, [negocios]);

  // By origin
  const originData = useMemo(() => {
    const map: Record<string, number> = {};
    negocios.forEach(n => {
      map[n.origem] = (map[n.origem] || 0) + 1;
    });
    const colors = ['#60a5fa', '#a78bfa', '#f59e0b', '#fb923c', '#4ade80', '#f87171'];
    return Object.entries(map).map(([key, value], i) => ({
      name: NEGOCIO_ORIGEM_LABELS[key as NegocioOrigem] || key,
      value,
      color: colors[i % colors.length],
    }));
  }, [negocios]);

  // Consultant ranking
  const ranking = useMemo(() => {
    const map: Record<string, { nome: string; ganhos: number; valor: number; total: number; cicloTotal: number }> = {};
    negocios.forEach(n => {
      if (!n.consultor_nome) return;
      if (!map[n.consultor_nome]) map[n.consultor_nome] = { nome: n.consultor_nome, ganhos: 0, valor: 0, total: 0, cicloTotal: 0 };
      const entry = map[n.consultor_nome];
      if (n.status === 'fechado_ganho' || n.status === 'fechado_perdido') entry.total++;
      if (n.status === 'fechado_ganho') {
        entry.ganhos++;
        entry.valor += n.valor_liquido;
        if (n.data_fechamento) {
          entry.cicloTotal += (new Date(n.data_fechamento).getTime() - new Date(n.data_criacao).getTime()) / (1000 * 60 * 60 * 24);
        }
      }
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor);
  }, [negocios]);

  // Loss reasons
  const lossReasons = useMemo(() => {
    const map: Record<string, { count: number; valor: number }> = {};
    negocios.filter(n => n.status === 'fechado_perdido' && n.motivo_perda).forEach(n => {
      const m = n.motivo_perda!;
      if (!map[m]) map[m] = { count: 0, valor: 0 };
      map[m].count++;
      map[m].valor += n.valor_liquido;
    });
    return Object.entries(map).map(([motivo, data]) => ({ motivo, ...data })).sort((a, b) => b.count - a.count);
  }, [negocios]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard icon={DollarSign} label="Receita Fechada" value={fmt(kpis.receitaFechada)} />
        <KPICard icon={BarChart3} label="Taxa Conversão" value={`${kpis.taxaConversao.toFixed(1)}%`} />
        <KPICard icon={Clock} label="Ciclo Médio" value={`${kpis.cicloMedio.toFixed(0)} dias`} />
        <KPICard icon={Target} label="Ticket Médio" value={fmt(kpis.ticketMedio)} />
        <KPICard icon={TrendingUp} label="Pipeline Ativo" value={`${kpis.ativosCount} / ${fmt(kpis.pipelineAtivo)}`} />
        <KPICard icon={Flame} label="Previsão 30d" value={fmt(kpis.previsao30)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by Month */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Receita Fechada por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueByMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="Ganho" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Perdido" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Pipeline por Status</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map(d => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-foreground flex-1">{d.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{d.value}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">{fmt(d.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Origin Pie */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Negócios por Origem</CardTitle></CardHeader>
          <CardContent>
            {originData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={originData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {originData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        {/* Loss Reasons */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Motivos de Perda</CardTitle></CardHeader>
          <CardContent>
            {lossReasons.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lossReasons.map(r => (
                    <TableRow key={r.motivo}>
                      <TableCell className="text-sm">{r.motivo}</TableCell>
                      <TableCell className="text-right text-sm">{r.count}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{fmt(r.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma perda registrada</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Consultant Ranking */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Ranking de Consultores</CardTitle></CardHeader>
        <CardContent>
          {ranking.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Consultor</TableHead>
                  <TableHead className="text-right">Ganhos</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Taxa Conv.</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">Ciclo Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((r, i) => (
                  <TableRow key={r.nome}>
                    <TableCell>{i === 0 ? '🥇' : i + 1}</TableCell>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell className="text-right">{r.ganhos}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.valor)}</TableCell>
                    <TableCell className="text-right">{r.total > 0 ? `${((r.ganhos / r.total) * 100).toFixed(0)}%` : '—'}</TableCell>
                    <TableCell className="text-right font-mono">{r.ganhos > 0 ? fmt(r.valor / r.ganhos) : '—'}</TableCell>
                    <TableCell className="text-right">{r.ganhos > 0 ? `${(r.cicloTotal / r.ganhos).toFixed(0)}d` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">Nenhum dado</div>
          )}
        </CardContent>
      </Card>
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
        <div className
          ="min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className="text-sm font-bold text-foreground truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
