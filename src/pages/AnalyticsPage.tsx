import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenants } from "@/hooks/useUserTenants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageCircle, Clock, TrendingUp, DollarSign, Users, Target } from "lucide-react";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AnalyticsPage() {
  const { data: tenants } = useUserTenants();
  const tenantId = tenants?.[0]?.tenant_id;
  const [period, setPeriod] = useState('30');

  const sinceDate = subDays(new Date(), parseInt(period)).toISOString();

  // KPIs
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['analytics-kpis', tenantId, period],
    queryFn: async () => {
      if (!tenantId) return null;

      const [convs, msgs, pipeline, contacts] = await Promise.all([
        supabase.from('conversations').select('id, status, created_at').eq('tenant_id', tenantId).gte('created_at', sinceDate),
        supabase.from('chat_messages').select('id, direction, timestamp').eq('tenant_id', tenantId).gte('timestamp', sinceDate),
        supabase.from('negocios').select('status, valor_total').eq('tenant_id', tenantId).not('status', 'in', '("ganho","perdido")'),
        supabase.from('crm_contacts').select('id, stage, created_at, source').eq('tenant_id', tenantId).gte('created_at', sinceDate),
      ]);

      const openConvs = convs.data?.filter(c => c.status === 'open').length || 0;
      const resolvedConvs = convs.data?.filter(c => c.status === 'resolved').length || 0;
      const totalConvs = convs.data?.length || 0;
      const resolutionRate = totalConvs > 0 ? Math.round((resolvedConvs / totalConvs) * 100) : 0;
      const pipelineValue = pipeline.data?.reduce((s, n) => s + (n.valor_total || 0), 0) || 0;
      const totalMsgs = msgs.data?.length || 0;

      // Messages per day chart
      const msgsByDay: Record<string, number> = {};
      msgs.data?.forEach(m => {
        const d = format(new Date(m.timestamp), 'dd/MM');
        msgsByDay[d] = (msgsByDay[d] || 0) + 1;
      });
      const msgsChart = Object.entries(msgsByDay).map(([date, count]) => ({ date, mensagens: count }));

      // Contacts by source
      const sourceMap: Record<string, number> = {};
      contacts.data?.forEach(c => { sourceMap[c.source || 'manual'] = (sourceMap[c.source || 'manual'] || 0) + 1; });
      const sourceChart = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

      // Pipeline by stage
      const stageMap: Record<string, { count: number; value: number }> = {};
      pipeline.data?.forEach(n => {
        if (!stageMap[n.status]) stageMap[n.status] = { count: 0, value: 0 };
        stageMap[n.status].count++;
        stageMap[n.status].value += n.valor_total || 0;
      });
      const pipelineChart = Object.entries(stageMap).map(([stage, d]) => ({ stage, ...d }));

      return { openConvs, resolutionRate, pipelineValue, totalMsgs, msgsChart, sourceChart, pipelineChart, newContacts: contacts.data?.length || 0 };
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const kpiCards = [
    { icon: MessageCircle, label: 'Conversas Abertas', value: kpis?.openConvs || 0, color: 'text-blue-500' },
    { icon: TrendingUp, label: 'Taxa de Resolução', value: `${kpis?.resolutionRate || 0}%`, color: 'text-green-500' },
    { icon: DollarSign, label: 'Pipeline Total', value: `R$ ${(kpis?.pipelineValue || 0).toLocaleString('pt-BR')}`, color: 'text-primary' },
    { icon: Users, label: 'Novos Contatos', value: kpis?.newContacts || 0, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm">Métricas e desempenho do seu tenant.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {kpiCards.map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <k.icon className={`h-8 w-8 ${k.color}`} />
                <div>
                  <p className="text-2xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Volume de Mensagens / Dia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={kpis?.msgsChart || []}>
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="mensagens" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Pipeline por Estágio</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={kpis?.pipelineChart || []}>
                <XAxis dataKey="stage" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Contatos por Fonte</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={kpis?.sourceChart || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {(kpis?.sourceChart || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
