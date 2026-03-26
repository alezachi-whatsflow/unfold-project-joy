import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock, Users, TrendingUp, CheckCircle2, XCircle, Timer,
  MessageSquare, UserCheck, BarChart3, AlertTriangle, Zap,
} from "lucide-react";

// ═══════════════════════════════════════════
// Métricas de Atendimento — Caixa de Entrada
// Fontes: whatsapp_messages, conversations, negocios
// ═══════════════════════════════════════════

type Period = "today" | "7d" | "30d" | "90d";

function periodToDate(period: Period): string {
  const d = new Date();
  if (period === "today") d.setHours(0, 0, 0, 0);
  else if (period === "7d") d.setDate(d.getDate() - 7);
  else if (period === "30d") d.setDate(d.getDate() - 30);
  else d.setDate(d.getDate() - 90);
  return d.toISOString();
}

function formatMinutes(mins: number): string {
  if (mins < 1) return "< 1min";
  if (mins < 60) return `${Math.round(mins)}min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

export default function AttendanceMetrics() {
  const tenantId = useTenantId();
  const [period, setPeriod] = useState<Period>("30d");

  const since = periodToDate(period);

  // ── Query 1: Conversation metrics ──
  const { data: convMetrics } = useQuery({
    queryKey: ["attendance-conv-metrics", tenantId, period],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data: convs } = await supabase
        .from("conversations")
        .select("id, status, created_at, claimed_at, first_response_at, resolved_at, assigned_to, channel")
        .eq("tenant_id", tenantId)
        .gte("created_at", since);

      if (!convs || convs.length === 0) return {
        total: 0, resolved: 0, open: 0, avgWaitMin: 0, avgResponseMin: 0,
        avgAttendanceMin: 0, resolvedRate: 0, abandonRate: 0,
      };

      const total = convs.length;
      const resolved = convs.filter((c) => c.status === "resolved").length;
      const open = convs.filter((c) => c.status === "open").length;

      // Tempo de espera: created_at → claimed_at
      const waits = convs
        .filter((c) => c.claimed_at)
        .map((c) => (new Date(c.claimed_at!).getTime() - new Date(c.created_at).getTime()) / 60000);
      const avgWaitMin = waits.length > 0 ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;

      // Tempo de resposta: created_at → first_response_at
      const responses = convs
        .filter((c) => c.first_response_at)
        .map((c) => (new Date(c.first_response_at!).getTime() - new Date(c.created_at).getTime()) / 60000);
      const avgResponseMin = responses.length > 0 ? responses.reduce((a, b) => a + b, 0) / responses.length : 0;

      // Tempo total de atendimento: claimed_at → resolved_at
      const attendances = convs
        .filter((c) => c.claimed_at && c.resolved_at)
        .map((c) => (new Date(c.resolved_at!).getTime() - new Date(c.claimed_at!).getTime()) / 60000);
      const avgAttendanceMin = attendances.length > 0 ? attendances.reduce((a, b) => a + b, 0) / attendances.length : 0;

      const resolvedRate = total > 0 ? (resolved / total) * 100 : 0;

      // Abandono: open há mais de 24h sem resposta do agente
      const now = Date.now();
      const abandoned = convs.filter((c) => c.status === "open" && !c.first_response_at && (now - new Date(c.created_at).getTime()) > 86400000).length;
      const abandonRate = total > 0 ? (abandoned / total) * 100 : 0;

      return { total, resolved, open, avgWaitMin, avgResponseMin, avgAttendanceMin, resolvedRate, abandonRate };
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  // ── Query 2: Message-based metrics (WhatsApp) ──
  const { data: msgMetrics } = useQuery({
    queryKey: ["attendance-msg-metrics", tenantId, period],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data: msgs } = await supabase
        .from("whatsapp_messages")
        .select("id, direction, created_at, remote_jid, instance_name, sender_name")
        .eq("tenant_id", tenantId)
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (!msgs || msgs.length === 0) return {
        totalMessages: 0, incoming: 0, outgoing: 0,
        uniqueContacts: 0, avgMsgsPerConv: 0,
        avgClientInactivityMin: 0,
      };

      const incoming = msgs.filter((m) => m.direction === "incoming").length;
      const outgoing = msgs.filter((m) => m.direction === "outgoing").length;
      const uniqueContacts = new Set(msgs.map((m) => m.remote_jid)).size;
      const avgMsgsPerConv = uniqueContacts > 0 ? msgs.length / uniqueContacts : 0;

      // Tempo de inatividade do cliente: gap entre msgs incoming por JID
      const byJid = new Map<string, number[]>();
      for (const m of msgs.filter((m) => m.direction === "incoming")) {
        if (!byJid.has(m.remote_jid)) byJid.set(m.remote_jid, []);
        byJid.get(m.remote_jid)!.push(new Date(m.created_at).getTime());
      }
      const gaps: number[] = [];
      for (const times of byJid.values()) {
        for (let i = 1; i < times.length; i++) {
          gaps.push((times[i] - times[i - 1]) / 60000);
        }
      }
      const avgClientInactivityMin = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

      return { totalMessages: msgs.length, incoming, outgoing, uniqueContacts, avgMsgsPerConv, avgClientInactivityMin };
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  // ── Query 3: Sales/CRM metrics ──
  const { data: salesMetrics } = useQuery({
    queryKey: ["attendance-sales-metrics", tenantId, period],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data: negocios } = await supabase
        .from("negocios")
        .select("id, status, created_at, stage_entered_at, consultor_id, consultor_nome")
        .eq("tenant_id", tenantId)
        .gte("created_at", since);

      if (!negocios || negocios.length === 0) return {
        totalDeals: 0, qualifiedRate: 0, conversionRate: 0,
        avgToQualificationMin: 0, avgToProposalMin: 0,
        byConsultor: [],
      };

      const total = negocios.length;
      const qualified = negocios.filter((n) => ["qualificado", "proposta", "negociacao", "fechado_ganho"].includes(n.status)).length;
      const won = negocios.filter((n) => n.status === "fechado_ganho").length;

      const qualifiedRate = total > 0 ? (qualified / total) * 100 : 0;
      const conversionRate = total > 0 ? (won / total) * 100 : 0;

      // Tempo até qualificação
      const qualTimes = negocios
        .filter((n) => n.status !== "prospeccao" && n.stage_entered_at)
        .map((n) => (new Date(n.stage_entered_at!).getTime() - new Date(n.created_at).getTime()) / 60000);
      const avgToQualificationMin = qualTimes.length > 0 ? qualTimes.reduce((a, b) => a + b, 0) / qualTimes.length : 0;

      // Por consultor
      const consultorMap = new Map<string, { name: string; total: number; won: number }>();
      for (const n of negocios) {
        const key = n.consultor_id || "sem_consultor";
        if (!consultorMap.has(key)) consultorMap.set(key, { name: n.consultor_nome || "Sem consultor", total: 0, won: 0 });
        consultorMap.get(key)!.total++;
        if (n.status === "fechado_ganho") consultorMap.get(key)!.won++;
      }

      return {
        totalDeals: total,
        qualifiedRate,
        conversionRate,
        avgToQualificationMin,
        avgToProposalMin: 0,
        byConsultor: Array.from(consultorMap.values()).sort((a, b) => b.total - a.total),
      };
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  // ── Query 4: Per-agent daily metrics ──
  const { data: agentMetrics } = useQuery({
    queryKey: ["attendance-agent-metrics", tenantId, period],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data: msgs } = await supabase
        .from("whatsapp_messages")
        .select("sender_name, direction, created_at")
        .eq("tenant_id", tenantId)
        .eq("direction", "outgoing")
        .gte("created_at", since);

      if (!msgs || msgs.length === 0) return { perDay: 0, agents: [] };

      // Count days in period
      const days = Math.max(1, Math.ceil((Date.now() - new Date(since).getTime()) / 86400000));

      // Group by sender
      const senderMap = new Map<string, number>();
      for (const m of msgs) {
        const name = m.sender_name || "Sistema";
        senderMap.set(name, (senderMap.get(name) || 0) + 1);
      }

      const agents = Array.from(senderMap.entries())
        .map(([name, count]) => ({ name, total: count, perDay: Math.round(count / days) }))
        .sort((a, b) => b.total - a.total);

      return { perDay: Math.round(msgs.length / days), agents };
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  // ── Query 5: CSAT metrics ──
  const { data: csatMetrics } = useQuery({
    queryKey: ["attendance-csat", tenantId, period],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("csat_ratings")
        .select("rating, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", since);

      if (!data || data.length === 0) return { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] };

      const sum = data.reduce((a, r) => a + r.rating, 0);
      const distribution = [0, 0, 0, 0, 0];
      for (const r of data) distribution[r.rating - 1]++;

      return { avg: sum / data.length, count: data.length, distribution };
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  const c = convMetrics;
  const m = msgMetrics;
  const s = salesMetrics;
  const a = agentMetrics;
  const csat = csatMetrics;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Métricas de Atendimento</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>API WhatsApp Web + API Cloud Meta</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-32 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── SEÇÃO 1: Tempos de Atendimento ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Tempos de Atendimento</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={Clock} label="Espera até atendimento" value={formatMinutes(c?.avgWaitMin || 0)} color="#f59e0b" />
          <MetricCard icon={Zap} label="Tempo médio de resposta" value={formatMinutes(c?.avgResponseMin || 0)} color="#3b82f6" />
          <MetricCard icon={Timer} label="Tempo total atendimento" value={formatMinutes(c?.avgAttendanceMin || 0)} color="#6366f1" />
          <MetricCard icon={Clock} label="Inatividade do cliente" value={formatMinutes(m?.avgClientInactivityMin || 0)} color="#8b5cf6" />
        </div>
      </div>

      {/* ── SEÇÃO 2: Volume e Taxas ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Volume e Taxas</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={MessageSquare} label="Total de mensagens" value={String(m?.totalMessages || 0)} color="#0E8A5C" sub={`${m?.incoming || 0} recebidas · ${m?.outgoing || 0} enviadas`} />
          <MetricCard icon={Users} label="Contatos únicos" value={String(m?.uniqueContacts || 0)} color="#3b82f6" sub={`~${Math.round(m?.avgMsgsPerConv || 0)} msgs/conversa`} />
          <MetricCard icon={CheckCircle2} label="Taxa de finalização" value={formatPercent(c?.resolvedRate || 0)} color="#10b981" sub={`${c?.resolved || 0} de ${c?.total || 0}`} />
          <MetricCard icon={XCircle} label="Taxa de abandono" value={formatPercent(c?.abandonRate || 0)} color="#ef4444" sub="Sem resposta > 24h" />
        </div>
      </div>

      {/* ── SEÇÃO 3: Funil de Vendas ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Funil de Vendas (CRM)</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={BarChart3} label="Total de negócios" value={String(s?.totalDeals || 0)} color="#6366f1" />
          <MetricCard icon={TrendingUp} label="Leads qualificados" value={formatPercent(s?.qualifiedRate || 0)} color="#f59e0b" sub="SQL/MQL" />
          <MetricCard icon={UserCheck} label="Taxa de conversão" value={formatPercent(s?.conversionRate || 0)} color="#10b981" />
          <MetricCard icon={Timer} label="Tempo até qualificação" value={formatMinutes(s?.avgToQualificationMin || 0)} color="#3b82f6" />
        </div>
      </div>

      {/* ── SEÇÃO 4: Por Atendente ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Atendimentos por Dia</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} style={{ color: "#6366f1" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Msgs enviadas/dia (média)</span>
              <Badge variant="outline" className="ml-auto text-xs">{a?.perDay || 0}/dia</Badge>
            </div>
            {(a?.agents || []).length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Sem dados no período</p>
            ) : (
              <div className="space-y-2">
                {(a?.agents || []).slice(0, 8).map((agent) => (
                  <div key={agent.name} className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: "var(--acc-bg)", color: "var(--acc)" }}>
                      {agent.name[0]?.toUpperCase()}
                    </span>
                    <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{agent.name}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{agent.total} msgs</span>
                    <Badge variant="outline" className="text-[9px]">{agent.perDay}/dia</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: "#10b981" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Conversão por Consultor</span>
            </div>
            {(s?.byConsultor || []).length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Sem dados no período</p>
            ) : (
              <div className="space-y-2">
                {(s?.byConsultor || []).slice(0, 8).map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: "var(--acc-bg)", color: "var(--acc)" }}>
                      {c.name[0]?.toUpperCase()}
                    </span>
                    <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{c.won}/{c.total}</span>
                    <Badge variant="outline" className="text-[9px]">{c.total > 0 ? Math.round((c.won / c.total) * 100) : 0}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── SEÇÃO 5: CSAT ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Satisfação do Cliente (CSAT)</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            icon={CheckCircle2}
            label="CSAT Médio"
            value={csat?.avg ? `${(csat.avg).toFixed(1)} ⭐` : "—"}
            color={csat?.avg && csat.avg >= 4 ? "#10b981" : csat?.avg && csat.avg >= 3 ? "#f59e0b" : "#ef4444"}
            sub={`${csat?.count || 0} avaliações`}
          />
          <Card className="p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>Distribuição</p>
            <div className="space-y-1">
              {["⭐⭐⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐", "⭐⭐", "⭐"].map((stars, i) => {
                const count = csat?.distribution?.[4 - i] || 0;
                const total = csat?.count || 1;
                const pct = (count / total) * 100;
                return (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span style={{ color: "var(--text-muted)", width: 20 }}>{5 - i}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 50 ? "#10b981" : "#f59e0b" }} />
                    </div>
                    <span style={{ color: "var(--text-muted)", width: 20, textAlign: "right" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* ── SEÇÃO 6: Em desenvolvimento ── */}
      <Card className="p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={14} style={{ color: "#f59e0b" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Em desenvolvimento</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Multitarefas", "Tempo ocioso", "Primeira resposta resolutiva", "Tempo até primeiro 'sim'", "Índice de reclamações (IA)"].map((m) => (
            <Badge key={m} variant="outline" className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m}</Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Metric Card Component ──
function MetricCard({ icon: Icon, label, value, color, sub }: { icon: typeof Clock; label: string; value: string; color: string; sub?: string }) {
  return (
    <Card className="p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color }} />
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </Card>
  );
}
