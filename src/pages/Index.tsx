import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MessageSquare, Clock, CheckCircle2, DollarSign, ArrowUp, ArrowDown, Users, Phone, BellRing, Activity, CalendarClock, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserTenants } from "@/hooks/useUserTenants";
import { useLicenseLimits } from "@/hooks/useLicenseLimits";

export default function Index() {
  const { slug } = useParams();
  const [period, setPeriod] = useState("7d");
  const { data: userTenants } = useUserTenants();
  const tenantId = userTenants?.[0]?.tenant_id;
  const { data: license } = useLicenseLimits(tenantId);

  // Fake KPI Data
  const kpis = {
    openConversations: { value: 24, trend: 12, positive: false },
    avgResponseTime: { value: "1m 45s", trend: -15, positive: true },
    resolutionRate: { value: "86%", trend: 4, positive: true },
    pipelineValue: { value: "R$ 45.300", trend: 22, positive: true },
  };

  const trendIcon = (positive: boolean, invertGood = false) => {
    const isGood = invertGood ? !positive : positive;
    return isGood ? <ArrowUp className="h-4 w-4 text-emerald-500" /> : <ArrowDown className="h-4 w-4 text-rose-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Painel de Atendimento</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral da sua operação de vendas e suporte.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-xl border">
          <Select defaultValue="todos">
            <SelectTrigger className="w-[140px] h-8 bg-transparent border-none focus:ring-0 shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos Agentes</SelectItem><SelectItem value="joao">João S.</SelectItem></SelectContent>
          </Select>
          <div className="w-px h-6 bg-border mx-1"></div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px] h-8 bg-transparent border-none focus:ring-0 shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* LICENSE / TRIAL BANNER */}
      {license?.validUntil && (() => {
        const daysLeft = Math.ceil((new Date(license.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const isTrial = license.status === "trial";
        const isExpired = daysLeft <= 0;
        const showBanner = daysLeft <= 15;

        if (!showBanner) return null;

        const borderColor = isExpired ? "border-rose-500/30" : "border-amber-500/30";
        const bgColor = isExpired ? "bg-rose-500/10" : "bg-amber-500/10";
        const textColor = isExpired ? "text-rose-500" : "text-amber-500";
        const Icon = isExpired ? AlertTriangle : CalendarClock;

        return (
          <Link to={`/app/${slug}/assinatura`} className="block">
            <div className={`${bgColor} ${borderColor} border p-4 rounded-xl flex items-center justify-between hover:brightness-110 transition-all cursor-pointer`}>
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${textColor}`} />
                <div>
                  <span className={`text-sm font-bold ${textColor}`}>
                    {isExpired
                      ? "Sua licença expirou"
                      : isTrial
                        ? `Trial: ${daysLeft} dias restantes`
                        : `Licença vence em ${daysLeft} dias`}
                  </span>
                  <p className={`text-xs ${textColor} opacity-80 mt-0.5`}>
                    {isExpired
                      ? "Entre em contato para renovar."
                      : isTrial
                        ? "Contrate um plano para continuar usando após o período de avaliação."
                        : "Renove para evitar suspensão."}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-semibold ${textColor} hidden sm:block`}>
                Ver licença →
              </span>
            </div>
          </Link>
        );
      })()}

      {/* ROW 1: KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-[var(--wl-primary)]/50 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Conversas Abertas</span>
              <div className="p-2 rounded-lg bg-[var(--wl-primary)]/10 text-[var(--wl-primary)]"><MessageSquare className="h-4 w-4" /></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{kpis.openConversations.value}</span>
              <span className="flex items-center text-xs text-rose-500 font-medium">
                <ArrowUp className="h-3 w-3 mr-0.5" /> {kpis.openConversations.trend}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-amber-500/50 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">T. Médio de Resposta</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><Clock className="h-4 w-4" /></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{kpis.avgResponseTime.value}</span>
              <span className="flex items-center text-xs text-emerald-500 font-medium">
                <ArrowDown className="h-3 w-3 mr-0.5" /> 15s
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-500/50 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Taxa de Resolução</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="h-4 w-4" /></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{kpis.resolutionRate.value}</span>
              <span className="flex items-center text-xs text-emerald-500 font-medium">
                <ArrowUp className="h-3 w-3 mr-0.5" /> {kpis.resolutionRate.trend}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-[var(--wl-accent)]/50 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Valor em Pipeline</span>
              <div className="p-2 rounded-lg bg-[var(--wl-accent)]/10 text-[var(--wl-accent)]"><DollarSign className="h-4 w-4" /></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{kpis.pipelineValue.value}</span>
              <span className="flex items-center text-xs text-emerald-500 font-medium">
                <ArrowUp className="h-3 w-3 mr-0.5" /> {kpis.pipelineValue.trend}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: CHARTS (Visual Placeholders for Phase 6) */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-2">
             <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Volume de Mensagens (30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[250px] flex items-center justify-center border-t border-white/5 mt-4 pt-4 relative">
             {/* Fake Area Chart Render */}
             <div className="absolute inset-x-6 bottom-4 top-4 flex items-end gap-1 px-4">
                {[...Array(30)].map((_, i) => {
                  const h = Math.random() * 80 + 20;
                  return (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, backgroundColor: 'var(--wl-primary)', opacity: h > 70 ? 1 : 0.5 }} />
                  )
                })}
             </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
             <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Leads por Etapa (CRM)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 mt-4 space-y-4">
            {/* Fake Funnel Chart */}
            <div className="space-y-3">
               <div>
                 <div className="flex justify-between text-xs mb-1"><span>Prospecção</span> <span>150</span></div>
                 <div className="h-6 w-full bg-[var(--wl-primary)] rounded-md opacity-30"></div>
               </div>
               <div>
                 <div className="flex justify-between text-xs mb-1"><span>Qualificação</span> <span>95</span></div>
                 <div className="h-6 w-[80%] mx-auto bg-[var(--wl-primary)] rounded-md opacity-50"></div>
               </div>
               <div>
                 <div className="flex justify-between text-xs mb-1"><span>Proposta</span> <span>42</span></div>
                 <div className="h-6 w-[60%] mx-auto bg-[var(--wl-primary)] rounded-md opacity-80"></div>
               </div>
               <div>
                 <div className="flex justify-between text-xs mb-1"><span>Negociação</span> <span>18</span></div>
                 <div className="h-6 w-[40%] mx-auto bg-[var(--wl-primary)] rounded-md opacity-100"></div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: TABLES & FEED */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
           <CardHeader>
             <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wider flex items-center justify-between">
                <span>Atendimentos em Risco (SLA)</span>
                <Badge variant="destructive" className="animate-pulse">3 Críticos</Badge>
             </CardTitle>
           </CardHeader>
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>
                       <th className="px-4 py-2 font-medium">Contato</th>
                       <th className="px-4 py-2 font-medium">Agente</th>
                       <th className="px-4 py-2 font-medium">Status de Espera</th>
                       <th className="px-4 py-2 text-right font-medium">Ação</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr className="border-b border-white/5 hover:bg-white/5">
                       <td className="px-4 py-3 font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"/> Carlos Silva</td>
                       <td className="px-4 py-3 text-muted-foreground">Maria A.</td>
                       <td className="px-4 py-3 text-rose-500 font-bold">Aguarda há 45 min</td>
                       <td className="px-4 py-3 text-right"><Button variant="outline" size="sm">Assumir</Button></td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/5">
                       <td className="px-4 py-3 font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"/> Ana Lúcia</td>
                       <td className="px-4 py-3 text-muted-foreground">Bot (I.A.)</td>
                       <td className="px-4 py-3 text-amber-500 font-bold">Aguarda humano (12m)</td>
                       <td className="px-4 py-3 text-right"><Button variant="outline" size="sm">Assumir</Button></td>
                    </tr>
                 </tbody>
              </table>
           </div>
        </Card>

        <Card>
           <CardHeader>
             <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4" /> Fluxo de Atividade
             </CardTitle>
           </CardHeader>
           <CardContent>
              <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-3.5 before:w-px before:bg-border">
                 <div className="flex gap-4 relative">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 z-10 box-content outline outline-8 outline-background"><DollarSign className="w-3.5 h-3.5" /></div>
                    <div>
                       <p className="text-sm font-medium">Venda Fechada (Plano Ouro)</p>
                       <p className="text-xs text-muted-foreground">Por João S. • 10 min atrás</p>
                    </div>
                 </div>
                 <div className="flex gap-4 relative">
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 z-10 box-content outline outline-8 outline-background"><MessageSquare className="w-3.5 h-3.5" /></div>
                    <div>
                       <p className="text-sm font-medium">Chat resolvido (Dúvida Faturamento)</p>
                       <p className="text-xs text-muted-foreground">Por Maria A. • 1 hr atrás</p>
                    </div>
                 </div>
                 <div className="flex gap-4 relative">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 z-10 box-content outline outline-8 outline-background"><BellRing className="w-3.5 h-3.5" /></div>
                    <div>
                       <p className="text-sm font-medium">Lead "Marcos" arquivado</p>
                       <p className="text-xs text-muted-foreground">Por Sistema • 2 hrs atrás</p>
                    </div>
                 </div>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
