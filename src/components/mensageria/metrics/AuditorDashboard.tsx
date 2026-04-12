/**
 * AuditorDashboard — Quality Intelligence Panel
 * Displays AI audit scores, agent rankings, error patterns, and trends.
 * Data from: audit_evaluations + audit_reports tables.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Shield, TrendingUp, TrendingDown, AlertTriangle, Award,
  BarChart3, Users, MessageSquare, Star, Target, Loader2,
} from "lucide-react";

const SCORE_COLORS = {
  excellent: "#10B981",
  good: "#3B82F6",
  average: "#F59E0B",
  poor: "#EF4444",
};

function getScoreConfig(score: number) {
  if (score >= 8.5) return { label: "Excelente", color: SCORE_COLORS.excellent, icon: Award };
  if (score >= 7.0) return { label: "Bom", color: SCORE_COLORS.good, icon: TrendingUp };
  if (score >= 5.5) return { label: "Regular", color: SCORE_COLORS.average, icon: AlertTriangle };
  return { label: "Crítico", color: SCORE_COLORS.poor, icon: TrendingDown };
}

const CRITERIA_LABELS: Record<string, string> = {
  tempo_resposta: "Tempo de Resposta",
  qualidade_resposta: "Qualidade da Resposta",
  empatia: "Empatia / Rapport",
  tecnica_vendas: "Técnica de Vendas",
  follow_up: "Follow-up",
  base_conhecimento: "Base de Conhecimento",
};

export default function AuditorDashboard() {
  const tenantId = useTenantId();
  const [period, setPeriod] = useState("30");

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - parseInt(period));

  // Fetch evaluations
  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["audit-evaluations", tenantId, period],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await (supabase as any)
        .from("audit_evaluations")
        .select("*")
        .gte("created_at", sinceDate.toISOString())
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  // Fetch follow-up stats
  const { data: followUps = [] } = useQuery({
    queryKey: ["follow-up-stats", tenantId, period],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await (supabase as any)
        .from("follow_up_logs")
        .select("agent_id, agent_name, resulted_in_response, executed_at")
        .eq("tenant_id", tenantId)
        .gte("executed_at", sinceDate.toISOString());
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  // Compute metrics
  const totalEvals = evaluations.length;
  const avgScore = totalEvals > 0
    ? evaluations.reduce((s: number, e: any) => s + (e.overall_score || 0), 0) / totalEvals
    : 0;
  const belowThreshold = evaluations.filter((e: any) => (e.overall_score || 0) < 6).length;
  const belowPct = totalEvals > 0 ? Math.round((belowThreshold / totalEvals) * 100) : 0;

  // Agent ranking
  const agentMap = new Map<string, { name: string; scores: number[]; count: number }>();
  for (const e of evaluations) {
    const key = e.attendant_id || "unknown";
    const existing = agentMap.get(key) || { name: e.attendant_name || "Desconhecido", scores: [], count: 0 };
    existing.scores.push(e.overall_score || 0);
    existing.count++;
    agentMap.set(key, existing);
  }
  const agentRanking = Array.from(agentMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      count: data.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Error patterns
  const errorMap = new Map<string, number>();
  for (const e of evaluations) {
    for (const err of e.errors_found || []) {
      const type = err.type || err.category || "Outro";
      errorMap.set(type, (errorMap.get(type) || 0) + 1);
    }
  }
  const topErrors = Array.from(errorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Criteria averages
  const criteriaAgg = new Map<string, number[]>();
  for (const e of evaluations) {
    if (e.criteria_scores && typeof e.criteria_scores === "object") {
      for (const [key, val] of Object.entries(e.criteria_scores)) {
        if (!criteriaAgg.has(key)) criteriaAgg.set(key, []);
        criteriaAgg.get(key)!.push(val as number);
      }
    }
  }
  const criteriaAvgs = Array.from(criteriaAgg.entries())
    .map(([key, vals]) => ({
      key,
      label: CRITERIA_LABELS[key] || key,
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    }))
    .sort((a, b) => a.avg - b.avg);

  // Follow-up stats
  const totalFollowUps = followUps.length;
  const respondedFollowUps = followUps.filter((f: any) => f.resulted_in_response).length;
  const followUpRate = totalFollowUps > 0 ? Math.round((respondedFollowUps / totalFollowUps) * 100) : 0;

  const scoreConfig = getScoreConfig(avgScore);
  const ScoreIcon = scoreConfig.icon;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5" style={{ color: scoreConfig.color }} />
            Qualidade do Atendimento
          </h2>
          <p className="text-xs text-muted-foreground">Auditoria por IA — {totalEvals} conversas avaliadas</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 text-xs rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Overall Score */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Score Geral</span>
              <ScoreIcon className="h-4 w-4" style={{ color: scoreConfig.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: scoreConfig.color }}>{avgScore.toFixed(1)}</p>
            <Badge className="text-[9px] mt-1" style={{ background: `${scoreConfig.color}15`, color: scoreConfig.color, border: `1px solid ${scoreConfig.color}30` }}>
              {scoreConfig.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Below Threshold */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Abaixo do Padrão</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold" style={{ color: belowPct > 20 ? "#EF4444" : "#F59E0B" }}>{belowPct}%</p>
            <p className="text-[10px] text-muted-foreground">{belowThreshold} de {totalEvals} conversas</p>
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Follow-ups</span>
              <MessageSquare className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalFollowUps}</p>
            <p className="text-[10px] text-muted-foreground">{followUpRate}% geraram resposta</p>
          </CardContent>
        </Card>

        {/* Conversations Evaluated */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avaliações</span>
              <BarChart3 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalEvals}</p>
            <p className="text-[10px] text-muted-foreground">no período selecionado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Agent Ranking */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Ranking de Concierges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agentRanking.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma avaliação no período</p>
            ) : (
              agentRanking.map((agent, i) => {
                const cfg = getScoreConfig(agent.avgScore);
                return (
                  <div key={agent.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? "#F59E0B" : "hsl(var(--muted-foreground))" }}>
                      {i + 1}º
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{agent.name}</p>
                      <p className="text-[10px] text-muted-foreground">{agent.count} conversas avaliadas</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: cfg.color }}>{agent.avgScore.toFixed(1)}</span>
                      <p className="text-[9px]" style={{ color: cfg.color }}>{cfg.label}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Criteria Breakdown */}
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Critérios de Qualidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criteriaAvgs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum dado disponível</p>
            ) : (
              criteriaAvgs.map((c) => {
                const cfg = getScoreConfig(c.avg);
                const pct = (c.avg / 10) * 100;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-foreground">{c.label}</span>
                      <span className="text-xs font-bold" style={{ color: cfg.color }}>{c.avg.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "hsl(var(--muted))" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Errors */}
      {topErrors.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Erros Mais Frequentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {topErrors.map(([type, count], i) => (
                <div key={type} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "hsl(var(--muted))" }}>
                  <span className="text-xs font-bold text-amber-500">{i + 1}.</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{type}</p>
                    <p className="text-[10px] text-muted-foreground">{count} ocorrências</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
