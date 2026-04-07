import { fmtDate } from "@/lib/dateUtils";
import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Clock, CheckCircle2, DollarSign, ArrowUp, ArrowDown, BellRing, Activity, CalendarClock, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantId } from "@/hooks/useTenantId";
import { useLicenseLimits } from "@/hooks/useLicenseLimits";
import { ACTIVE_STATUSES } from "@/types/vendas";

export default function Index() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState("7d");
  const tenantId = useTenantId();

  /* First access detection — redirect to Wizard (company setup) */
  useEffect(() => {
    if (!user?.id || !tenantId) return;
    const key = `pzaafi_wizard_done_${user.id}`;
    if (localStorage.getItem(key)) return;

    (async () => {
      // Check if company_profile exists and wizard is completed
      const { data: profile } = await supabase
        .from("company_profile")
        .select("wizard_completed")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!profile || !profile.wizard_completed) {
        // First access — go to Wizard (Vendas page shows wizard automatically)
        navigate(`/app/${slug || "whatsflow"}/vendas`, { replace: true });
      } else {
        localStorage.setItem(key, "true");
      }
    })();
  }, [user?.id, tenantId, slug, navigate]);
  const { data: license } = useLicenseLimits(tenantId);

  // Real KPI data from database
  const { data: kpis } = useQuery({
    queryKey: ["dashboard-kpis", tenantId, period],
    queryFn: async () => {
      if (!tenantId) return null;

      const [convRes, negRes, msgRes] = await Promise.all([
        // Conversations
        supabase.from("conversations").select("id, status").eq("tenant_id", tenantId),
        // Pipeline value
        supabase.from("negocios").select("status, valor_total, valor_liquido").eq("tenant_id", tenantId),
        // Recent messages count
        // Messages filtered via RLS (WA_Messages_Security policy uses instance→tenant)
        supabase.from("whatsapp_messages").select("id, direction, created_at").order("created_at", { ascending: false }).limit(500),
      ]);

      const convs = convRes.data || [];
      const negocios = negRes.data || [];
      const msgs = msgRes.data || [];

      const openConvs = convs.filter(c => c.status === "open").length;
      const resolvedConvs = convs.filter(c => c.status === "resolved").length;
      const totalConvs = convs.length;
      const resolutionRate = totalConvs > 0 ? Math.round((resolvedConvs / totalConvs) * 100) : 0;

      const activeNegocios = negocios.filter(n => ACTIVE_STATUSES.includes(n.status));
      const pipelineValue = activeNegocios.reduce((s, n) => s + (n.valor_liquido || n.valor_total || 0), 0);
      const pipelineCount = activeNegocios.length;

      const totalMsgs = msgs.length;
      const inbound = msgs.filter(m => m.direction === "incoming").length;

      return {
        openConversations: openConvs,
        resolutionRate,
        pipelineValue,
        pipelineCount,
        totalMessages: totalMsgs,
        inboundMessages: inbound,
      };
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  // Recent activity from negocios historico
  const { data: recentActivity } = useQuery({
    queryKey: ["dashboard-activity", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("negocios")
        .select("id, titulo, status, consultor_nome, updated_at")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Painel de Atendimento</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral da sua operação de vendas e suporte.</p>
        </div>
        <div className="flex items-center gap-2 bg-secondary/30 p-1.5 border">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] h-8 bg-transparent border-none focus:ring-0 shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* LICENSE BANNER */}
      {license?.validUntil && (() => {
        const daysLeft = Math.ceil((new Date(license.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const isTrial = license.status === "trial";
        const isExpired = daysLeft <= 0;
        if (daysLeft > 15) return null;
        const borderColor = isExpired ? "border-rose-500/30" : "border-amber-500/30";
        const bgColor = isExpired ? "bg-rose-500/10" : "bg-amber-500/10";
        const textColor = isExpired ? "text-rose-500" : "text-amber-500";
        const Icon = isExpired ? AlertTriangle : CalendarClock;
        return (
          <Link to={`/app/${slug}/assinatura`} className="block">
            <div className={`${bgColor} ${borderColor} border p-4 flex items-center justify-between hover:brightness-110 transition-all cursor-pointer`}>
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${textColor}`} />
                <div>
                  <span className={`text-sm font-bold ${textColor}`}>
                    {isExpired ? "Sua licença expirou" : isTrial ? `Trial: ${daysLeft} dias restantes` : `Licença vence em ${daysLeft} dias`}
                  </span>
                  <p className={`text-xs ${textColor} opacity-80 mt-0.5`}>
                    {isExpired ? "Entre em contato para renovar." : isTrial ? "Contrate um plano para continuar." : "Renove para evitar suspensão."}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-semibold ${textColor} hidden sm:block`}>Ver licença →</span>
            </div>
          </Link>
        );
      })()}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Conversas Abertas"
          value={String(kpis?.openConversations ?? 0)}
          icon={MessageSquare}
          color="var(--accent-primary)"
        />
        <KPICard
          label="Taxa de Resolução"
          value={`${kpis?.resolutionRate ?? 0}%`}
          icon={CheckCircle2}
          color="#10b981"
        />
        <KPICard
          label="Pipeline Ativo"
          value={fmt(kpis?.pipelineValue ?? 0)}
          subtitle={`${kpis?.pipelineCount ?? 0} negócios`}
          icon={DollarSign}
          color="var(--accent-primary)"
        />
        <KPICard
          label="Mensagens"
          value={String(kpis?.totalMessages ?? 0)}
          subtitle={`${kpis?.inboundMessages ?? 0} recebidas`}
          icon={MessageSquare}
          color="#f59e0b"
        />
      </div>

      {/* ROW 2: Activity & SLA */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* SLA Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wider flex items-center justify-between">
              <span>Negócios Recentes</span>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Negócio</th>
                  <th className="px-4 py-2 font-medium">Consultor</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {(recentActivity || []).length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum negócio encontrado</td></tr>
                ) : (
                  (recentActivity || []).map(n => (
                    <tr key={n.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{n.titulo}</td>
                      <td className="px-4 py-3 text-muted-foreground">{n.consultor_nome || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{n.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {n.updated_at ? fmtDate(n.updated_at) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4" /> Resumo do Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ACTIVE_STATUSES.map(status => {
                const count = (kpis as any)?._statusCounts?.[status] ?? 0;
                return null; // Will be populated by pipeline data
              })}
              <div className="text-center py-4">
                <Link to={`/app/${slug}/vendas`} className="text-xs text-primary hover:underline">
                  Ver pipeline completo →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ label, value, subtitle, icon: Icon, color }: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="hover:border-[color]/50 transition-colors" style={{ "--color": color } as any}>
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="p-2" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-3xl font-bold">{value}</span>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
