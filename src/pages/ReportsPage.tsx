import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useNegocios } from "@/hooks/useNegocios";
import { Download, Filter, BarChart3, Activity, Users, MessageSquare, DollarSign, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { NEGOCIO_STATUS_CONFIG, NEGOCIO_ORIGEM_LABELS, ACTIVE_STATUSES, type NegocioOrigem } from "@/types/vendas";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ReportsPage() {
  const tenantId = useTenantId();
  const { negocios } = useNegocios(tenantId);
  const [period, setPeriod] = useState("30d");

  // Messaging stats
  const { data: msgStats } = useQuery({
    queryKey: ["report-msgs", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data: msgs } = await supabase
        .from("whatsapp_messages")
        .select("id, direction, instance_name, created_at")
        .order("created_at", { ascending: false })
        .limit(2000);

      const all = msgs || [];
      const inbound = all.filter(m => m.direction === "incoming").length;
      const outbound = all.filter(m => m.direction === "outgoing").length;

      // Per instance
      const byInstance: Record<string, { in: number; out: number }> = {};
      all.forEach(m => {
        const key = m.instance_name || "desconhecido";
        if (!byInstance[key]) byInstance[key] = { in: 0, out: 0 };
        if (m.direction === "incoming") byInstance[key].in++;
        else byInstance[key].out++;
      });

      return { total: all.length, inbound, outbound, byInstance };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  // Conversations stats
  const { data: convStats } = useQuery({
    queryKey: ["report-convs", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("conversations")
        .select("id, status, assigned_to")
        .eq("tenant_id", tenantId);
      const convs = data || [];
      return {
        total: convs.length,
        open: convs.filter(c => c.status === "open").length,
        resolved: convs.filter(c => c.status === "resolved").length,
        rate: convs.length > 0 ? Math.round((convs.filter(c => c.status === "resolved").length / convs.length) * 100) : 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  // Sales breakdown
  const salesData = {
    ganhos: negocios.filter(n => n.status === "fechado_ganho"),
    perdidos: negocios.filter(n => n.status === "fechado_perdido"),
    ativos: negocios.filter(n => ACTIVE_STATUSES.includes(n.status)),
  };

  const receitaTotal = salesData.ganhos.reduce((s, n) => s + n.valor_liquido, 0);
  const ticketMedio = salesData.ganhos.length > 0 ? receitaTotal / salesData.ganhos.length : 0;
  const taxaConversao = (salesData.ganhos.length + salesData.perdidos.length) > 0
    ? Math.round((salesData.ganhos.length / (salesData.ganhos.length + salesData.perdidos.length)) * 100)
    : 0;
  const pipelineAtivo = salesData.ativos.reduce((s, n) => s + n.valor_liquido, 0);

  // Ranking by consultant
  const ranking = (() => {
    const map: Record<string, { nome: string; ganhos: number; valor: number }> = {};
    negocios.filter(n => n.status === "fechado_ganho" && n.consultor_nome).forEach(n => {
      if (!map[n.consultor_nome!]) map[n.consultor_nome!] = { nome: n.consultor_nome!, ganhos: 0, valor: 0 };
      map[n.consultor_nome!].ganhos++;
      map[n.consultor_nome!].valor += n.valor_liquido;
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor);
  })();

  // By origin
  const byOrigin = (() => {
    const map: Record<string, number> = {};
    negocios.forEach(n => { map[n.origem] = (map[n.origem] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  })();

  const handleExportCSV = () => {
    toast.success("Exportação CSV em desenvolvimento");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Relatórios Gerenciais</h1>
          <p className="text-muted-foreground mt-1">Dados da operação de atendimento e vendas.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <Tabs defaultValue="vendas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vendas" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Vendas</TabsTrigger>
          <TabsTrigger value="atendimento" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Atendimento</TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Equipe</TabsTrigger>
        </TabsList>

        {/* VENDAS TAB */}
        <TabsContent value="vendas" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniKPI label="Receita Fechada" value={fmt(receitaTotal)} />
            <MiniKPI label="Taxa Conversão" value={`${taxaConversao}%`} />
            <MiniKPI label="Ticket Médio" value={fmt(ticketMedio)} />
            <MiniKPI label="Pipeline Ativo" value={fmt(pipelineAtivo)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* By Status */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Negócios por Status</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...ACTIVE_STATUSES, "fechado_ganho", "fechado_perdido"].map(status => {
                    const count = negocios.filter(n => n.status === status).length;
                    const cfg = NEGOCIO_STATUS_CONFIG[status as keyof typeof NEGOCIO_STATUS_CONFIG];
                    if (!count) return null;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg?.color || "#888" }} />
                          <span className="text-sm">{cfg?.label || status}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* By Origin */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Negócios por Origem</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {byOrigin.map(([origem, count]) => (
                    <div key={origem} className="flex items-center justify-between">
                      <span className="text-sm">{NEGOCIO_ORIGEM_LABELS[origem as NegocioOrigem] || origem}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                  {byOrigin.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ATENDIMENTO TAB */}
        <TabsContent value="atendimento" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniKPI label="Conversas Totais" value={String(convStats?.total ?? 0)} />
            <MiniKPI label="Abertas" value={String(convStats?.open ?? 0)} />
            <MiniKPI label="Resolvidas" value={String(convStats?.resolved ?? 0)} />
            <MiniKPI label="Taxa Resolução" value={`${convStats?.rate ?? 0}%`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Volume de Mensagens</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total</span><span className="font-bold">{msgStats?.total ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Recebidas</span><span className="font-bold text-blue-400">{msgStats?.inbound ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Enviadas</span><span className="font-bold text-emerald-400">{msgStats?.outbound ?? 0}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Mensagens por Dispositivo</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(msgStats?.byInstance ?? {}).map(([inst, counts]) => (
                    <div key={inst} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[200px]">{inst}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-blue-400">↓ {(counts as any).in}</span>
                        <span className="text-emerald-400">↑ {(counts as any).out}</span>
                      </div>
                    </div>
                  ))}
                  {Object.keys(msgStats?.byInstance ?? {}).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem dados de mensagens</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* EQUIPE TAB */}
        <TabsContent value="equipe" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Ranking de Consultores</CardTitle></CardHeader>
            <CardContent>
              {ranking.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Consultor</TableHead>
                      <TableHead className="text-right">Negócios Ganhos</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((r, i) => (
                      <TableRow key={r.nome}>
                        <TableCell>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</TableCell>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="text-right">{r.ganhos}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(r.valor)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(r.valor / r.ganhos)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-sm text-muted-foreground">Nenhum consultor com negócios fechados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniKPI({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
