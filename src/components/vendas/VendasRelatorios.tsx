import { useMemo, useState } from "react";
import { useNegocios } from "@/hooks/useNegocios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, BarChart3, Clock, Target, TrendingUp, Flame, PieChart as PieIcon, Users, Megaphone, MousePointerClick, ArrowRightLeft, LineChart as LineIcon, LayoutGrid } from "lucide-react";
import { NEGOCIO_STATUS_CONFIG, NEGOCIO_ORIGEM_LABELS, ACTIVE_STATUSES, type NegocioStatus, type NegocioOrigem } from "@/types/vendas";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PIE_COLORS = ["#60a5fa", "#a78bfa", "#f59e0b", "#fb923c", "#4ade80", "#f87171", "#38bdf8", "#e879f9"];

export default function VendasRelatorios() {
  const { negocios } = useNegocios();

  // ─── SHARED KPIs ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const ganhos = negocios.filter(n => n.status === "fechado_ganho");
    const perdidos = negocios.filter(n => n.status === "fechado_perdido");
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
      return new Date(n.data_previsao_fechamento) <= next30;
    }).reduce((s, n) => s + n.valor_liquido, 0);

    return { receitaFechada, taxaConversao, cicloMedio, ticketMedio, pipelineAtivo, ativosCount: ativos.length, previsao30 };
  }, [negocios]);

  // ─── REVENUE BY MONTH ─────────────────────────────────────────────────
  const revenueByMonth = useMemo(() => {
    const months: Record<string, { ganho: number; perdido: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { ganho: 0, perdido: 0 };
    }
    negocios.forEach(n => {
      if (!n.data_fechamento) return;
      const key = n.data_fechamento.substring(0, 7);
      if (!months[key]) return;
      if (n.status === "fechado_ganho") months[key].ganho += n.valor_liquido;
      if (n.status === "fechado_perdido") months[key].perdido += n.valor_liquido;
    });
    return Object.entries(months).map(([month, v]) => ({
      month: month.substring(5) + "/" + month.substring(2, 4),
      Ganho: v.ganho,
      Perdido: v.perdido,
    }));
  }, [negocios]);

  // ─── PIPELINE FUNNEL ──────────────────────────────────────────────────
  const funnelData = useMemo(() => {
    return ACTIVE_STATUSES.map(status => ({
      name: NEGOCIO_STATUS_CONFIG[status].label,
      value: negocios.filter(n => n.status === status).length,
      total: negocios.filter(n => n.status === status).reduce((s, n) => s + n.valor_liquido, 0),
      color: NEGOCIO_STATUS_CONFIG[status].color,
    }));
  }, [negocios]);

  // ─── BY ORIGIN ────────────────────────────────────────────────────────
  const originData = useMemo(() => {
    const map: Record<string, number> = {};
    negocios.forEach(n => { map[n.origem] = (map[n.origem] || 0) + 1; });
    return Object.entries(map).map(([key, value], i) => ({
      name: NEGOCIO_ORIGEM_LABELS[key as NegocioOrigem] || key,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [negocios]);

  // ─── CONSULTANT RANKING ───────────────────────────────────────────────
  const ranking = useMemo(() => {
    const map: Record<string, { nome: string; ganhos: number; valor: number; total: number; cicloTotal: number }> = {};
    negocios.forEach(n => {
      if (!n.consultor_nome) return;
      if (!map[n.consultor_nome]) map[n.consultor_nome] = { nome: n.consultor_nome, ganhos: 0, valor: 0, total: 0, cicloTotal: 0 };
      const entry = map[n.consultor_nome];
      if (n.status === "fechado_ganho" || n.status === "fechado_perdido") entry.total++;
      if (n.status === "fechado_ganho") {
        entry.ganhos++;
        entry.valor += n.valor_liquido;
        if (n.data_fechamento) {
          entry.cicloTotal += (new Date(n.data_fechamento).getTime() - new Date(n.data_criacao).getTime()) / (1000 * 60 * 60 * 24);
        }
      }
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor);
  }, [negocios]);

  // ─── LOSS REASONS ─────────────────────────────────────────────────────
  const lossReasons = useMemo(() => {
    const map: Record<string, { count: number; valor: number }> = {};
    negocios.filter(n => n.status === "fechado_perdido" && n.motivo_perda).forEach(n => {
      const m = n.motivo_perda!;
      if (!map[m]) map[m] = { count: 0, valor: 0 };
      map[m].count++;
      map[m].valor += n.valor_liquido;
    });
    return Object.entries(map).map(([motivo, data]) => ({ motivo, ...data })).sort((a, b) => b.count - a.count);
  }, [negocios]);

  // ─── TRAFFIC / CONVERSION BY SOURCE ───────────────────────────────────
  const conversionBySource = useMemo(() => {
    const map: Record<string, { total: number; ganhos: number; receita: number }> = {};
    negocios.forEach(n => {
      const key = n.origem;
      if (!map[key]) map[key] = { total: 0, ganhos: 0, receita: 0 };
      map[key].total++;
      if (n.status === "fechado_ganho") {
        map[key].ganhos++;
        map[key].receita += n.valor_liquido;
      }
    });
    return Object.entries(map)
      .map(([origem, d]) => ({
        origem,
        label: NEGOCIO_ORIGEM_LABELS[origem as NegocioOrigem] || origem,
        total: d.total,
        ganhos: d.ganhos,
        receita: d.receita,
        conversao: d.total > 0 ? (d.ganhos / d.total) * 100 : 0,
        ticketMedio: d.ganhos > 0 ? d.receita / d.ganhos : 0,
      }))
      .sort((a, b) => b.receita - a.receita);
  }, [negocios]);

  // ─── REVENUE BY SOURCE PER MONTH ──────────────────────────────────────
  const revenueBySourceMonth = useMemo(() => {
    const months: Record<string, Record<string, number>> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = {};
    }
    negocios.filter(n => n.status === "fechado_ganho" && n.data_fechamento).forEach(n => {
      const key = n.data_fechamento!.substring(0, 7);
      if (!months[key]) return;
      const label = NEGOCIO_ORIGEM_LABELS[n.origem as NegocioOrigem] || n.origem;
      months[key][label] = (months[key][label] || 0) + n.valor_liquido;
    });
    return Object.entries(months).map(([month, sources]) => ({
      month: month.substring(5) + "/" + month.substring(2, 4),
      ...sources,
    }));
  }, [negocios]);

  const allSources = useMemo(() => {
    const s = new Set<string>();
    revenueBySourceMonth.forEach(m => Object.keys(m).filter(k => k !== "month").forEach(k => s.add(k)));
    return Array.from(s);
  }, [revenueBySourceMonth]);

  return (
    <div className="space-y-6">
      {/* ═══ KPIs — ALWAYS VISIBLE ═══ */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard icon={DollarSign} label="Receita Fechada" value={fmt(kpis.receitaFechada)} />
        <KPICard icon={BarChart3} label="Taxa Conversão" value={`${kpis.taxaConversao.toFixed(1)}%`} />
        <KPICard icon={Clock} label="Ciclo Médio" value={`${kpis.cicloMedio.toFixed(0)} dias`} />
        <KPICard icon={Target} label="Ticket Médio" value={fmt(kpis.ticketMedio)} />
        <KPICard icon={TrendingUp} label="Pipeline Ativo" value={`${kpis.ativosCount} / ${fmt(kpis.pipelineAtivo)}`} />
        <KPICard icon={Flame} label="Previsão 30d" value={fmt(kpis.previsao30)} />
      </div>

      {/* ═══ SUB-TABS ═══ */}
      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visao-geral" className="gap-1.5 text-xs"><LayoutGrid className="h-3.5 w-3.5" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="detalhes" className="gap-1.5 text-xs"><PieIcon className="h-3.5 w-3.5" /> Detalhes</TabsTrigger>
          <TabsTrigger value="trafego" className="gap-1.5 text-xs"><Megaphone className="h-3.5 w-3.5" /> Tráfego & ROI</TabsTrigger>
        </TabsList>

        {/* ──────────── VISÃO GERAL ──────────── */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
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

            <Card>
              <CardHeader><CardTitle className="text-sm">Pipeline por Status</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {funnelData.map(d => (
                    <div key={d.name}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-foreground flex-1">{d.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{d.value}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">{fmt(d.total)}</span>
                      </div>
                      <div className="ml-5 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ background: d.color, width: `${funnelData.length > 0 ? Math.max((d.total / Math.max(...funnelData.map(f => f.total), 1)) * 100, 4) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ──────────── DETALHES ──────────── */}
        <TabsContent value="detalhes" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
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
                ) : <EmptyState text="Sem dados de origem" />}
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
                        <TableHead className="text-right">Valor Perdido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lossReasons.map(r => (
                        <TableRow key={r.motivo}>
                          <TableCell className="text-sm">{r.motivo}</TableCell>
                          <TableCell className="text-right text-sm">{r.count}</TableCell>
                          <TableCell className="text-right text-sm font-mono text-rose-400">{fmt(r.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <EmptyState text="Nenhuma perda registrada" />}
              </CardContent>
            </Card>
          </div>

          {/* Consultant Ranking */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Ranking de Consultores</CardTitle></CardHeader>
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
                        <TableCell>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</TableCell>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="text-right">{r.ganhos}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(r.valor)}</TableCell>
                        <TableCell className="text-right">{r.total > 0 ? `${((r.ganhos / r.total) * 100).toFixed(0)}%` : "—"}</TableCell>
                        <TableCell className="text-right font-mono">{r.ganhos > 0 ? fmt(r.valor / r.ganhos) : "—"}</TableCell>
                        <TableCell className="text-right">{r.ganhos > 0 ? `${(r.cicloTotal / r.ganhos).toFixed(0)}d` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <EmptyState text="Nenhum consultor com negócios" />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────── TRÁFEGO & ROI ──────────── */}
        <TabsContent value="trafego" className="space-y-4">
          {/* Trafego KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard icon={MousePointerClick} label="Total de Leads" value={String(conversionBySource.reduce((s, c) => s + c.total, 0))} />
            <KPICard icon={Target} label="Leads Convertidos" value={String(conversionBySource.reduce((s, c) => s + c.ganhos, 0))} />
            <KPICard icon={DollarSign} label="Receita por Fonte" value={fmt(conversionBySource.reduce((s, c) => s + c.receita, 0))} />
            <KPICard icon={ArrowRightLeft} label="Conversão Geral" value={(() => {
              const t = conversionBySource.reduce((s, c) => s + c.total, 0);
              const g = conversionBySource.reduce((s, c) => s + c.ganhos, 0);
              return t > 0 ? `${((g / t) * 100).toFixed(1)}%` : "0%";
            })()} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 1. ROI por Canal */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Receita por Canal</CardTitle></CardHeader>
              <CardContent>
                {conversionBySource.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={conversionBySource} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState text="Sem dados" />}
              </CardContent>
            </Card>

            {/* 2. Conversão por Fonte */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Taxa de Conversão por Fonte</CardTitle></CardHeader>
              <CardContent>
                {conversionBySource.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={conversionBySource}>
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                      <Bar dataKey="conversao" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState text="Sem dados" />}
              </CardContent>
            </Card>

            {/* 3. CPL / Performance por Canal — Table */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Megaphone className="h-4 w-4" /> Performance por Canal</CardTitle></CardHeader>
              <CardContent>
                {conversionBySource.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Canal</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Convertidos</TableHead>
                        <TableHead className="text-right">Conversão</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Ticket Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversionBySource.map(c => (
                        <TableRow key={c.origem}>
                          <TableCell className="font-medium">{c.label}</TableCell>
                          <TableCell className="text-right">{c.total}</TableCell>
                          <TableCell className="text-right">{c.ganhos}</TableCell>
                          <TableCell className="text-right">
                            <span className={c.conversao >= 50 ? "text-emerald-400" : c.conversao >= 25 ? "text-amber-400" : "text-rose-400"}>
                              {c.conversao.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">{fmt(c.receita)}</TableCell>
                          <TableCell className="text-right font-mono">{c.ganhos > 0 ? fmt(c.ticketMedio) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <EmptyState text="Sem dados" />}
              </CardContent>
            </Card>

            {/* 4. Receita por Fonte ao longo do Tempo */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><LineIcon className="h-4 w-4" /> Receita por Fonte / Mês</CardTitle></CardHeader>
              <CardContent>
                {revenueBySourceMonth.length > 0 && allSources.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={revenueBySourceMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      {allSources.map((source, i) => (
                        <Line key={source} type="monotone" dataKey={source} stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyState text="Sem dados de receita por fonte" />}
              </CardContent>
            </Card>

            {/* 5. Investimento & ROI — Placeholder */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Investimento vs Retorno (ROI)</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center py-8 space-y-3">
                  <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Configure seus investimentos em tráfego pago para calcular CPL e ROI.</p>
                  <p className="text-xs text-muted-foreground/60">
                    Em breve: cadastre quanto investiu por canal/mês e veja automaticamente o custo por lead (CPL), retorno sobre investimento (ROI) e compare com a receita gerada.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className="text-sm font-bold text-foreground truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-8 text-sm text-muted-foreground">{text}</div>;
}
