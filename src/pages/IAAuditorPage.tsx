import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, TrendingUp, AlertTriangle, Trophy, BarChart3, Loader2, ArrowLeft, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from "recharts";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

function getScoreColor(score: number) {
  if (score >= 8.5) return "text-green-400";
  if (score >= 7.0) return "text-blue-400";
  if (score >= 5.0) return "text-amber-400";
  return "text-red-400";
}

function getScoreBadge(label: string) {
  const map: Record<string, string> = {
    excelente: "bg-green-500/20 text-green-400 border-green-500/30",
    bom: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    regular: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    critico: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return map[label] || "";
}

function getSeverityBadge(severity: string) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-amber-500/20 text-amber-400",
    low: "bg-blue-500/20 text-blue-400",
  };
  return map[severity] || "bg-muted text-muted-foreground";
}

export default function IAAuditorPage() {
  const navigate = useNavigate();
  const tenantId = localStorage.getItem("whatsflow_default_tenant_id");
  const [period, setPeriod] = useState("7");
  const [selectedEval, setSelectedEval] = useState<any>(null);

  const startDate = format(subDays(new Date(), parseInt(period)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");

  // Fetch license
  const { data: license } = useQuery({
    queryKey: ["license-ai-auditor", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("licenses")
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch evaluations
  const { data: evaluations = [], isLoading: loadingEvals } = useQuery({
    queryKey: ["audit-evaluations", license?.id, startDate, endDate],
    queryFn: async () => {
      if (!license?.id) return [];
      const { data, error } = await supabase
        .from("audit_evaluations")
        .select("*")
        .eq("license_id", license.id)
        .gte("period_date", startDate)
        .lte("period_date", endDate)
        .order("evaluated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!license?.id,
  });

  // Fetch latest report
  const { data: latestReport } = useQuery({
    queryKey: ["audit-report-latest", license?.id],
    queryFn: async () => {
      if (!license?.id) return null;
      const { data } = await supabase
        .from("audit_reports")
        .select("*")
        .eq("license_id", license.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!license?.id,
  });

  // KPIs
  const totalConversas = evaluations.length;
  const avgScore = totalConversas > 0
    ? Math.round((evaluations.reduce((s, e) => s + (Number(e.overall_score) || 0), 0) / totalConversas) * 100) / 100
    : 0;
  const threshold = 6.0;
  const belowCount = evaluations.filter(e => (Number(e.overall_score) || 0) < threshold).length;
  const belowPct = totalConversas > 0 ? Math.round((belowCount / totalConversas) * 100) : 0;

  // Daily trend for chart
  const dayMap = new Map<string, { scores: number[]; count: number }>();
  for (const e of evaluations) {
    const day = e.period_date;
    const existing = dayMap.get(day) || { scores: [], count: 0 };
    existing.scores.push(Number(e.overall_score) || 0);
    existing.count++;
    dayMap.set(day, existing);
  }
  const trendData = Array.from(dayMap.entries())
    .map(([date, d]) => ({
      date: format(new Date(date + "T12:00:00"), "dd/MM", { locale: ptBR }),
      avg_score: Math.round((d.scores.reduce((s, v) => s + v, 0) / d.count) * 100) / 100,
      conversas: d.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top errors
  const errorMap = new Map<string, { type: string; label: string; count: number }>();
  for (const e of evaluations) {
    const errors = Array.isArray(e.errors_found) ? e.errors_found : [];
    for (const err of errors as any[]) {
      const key = err.type || "unknown";
      const existing = errorMap.get(key) || { type: key, label: err.label || key, count: 0 };
      existing.count++;
      errorMap.set(key, existing);
    }
  }
  const topErrors = Array.from(errorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(e => ({ ...e, pct: totalConversas > 0 ? Math.round((e.count / totalConversas) * 100) : 0 }));

  // Attendant ranking
  const attMap = new Map<string, { id: string; scores: number[]; count: number }>();
  for (const e of evaluations) {
    const attId = e.attendant_id || "sem_atendente";
    const existing = attMap.get(attId) || { id: attId, scores: [], count: 0 };
    existing.scores.push(Number(e.overall_score) || 0);
    existing.count++;
    attMap.set(attId, existing);
  }
  const ranking = Array.from(attMap.values())
    .map(a => ({
      id: a.id,
      avg_score: Math.round((a.scores.reduce((s, v) => s + v, 0) / a.count) * 100) / 100,
      conversations: a.count,
    }))
    .sort((a, b) => b.avg_score - a.avg_score);

  if (loadingEvals) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ia")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Eye className="h-6 w-6 text-teal-400" /> Auditor de Qualidade
            </h1>
            <p className="text-sm text-muted-foreground">
              Avaliação automatizada de atendimentos
            </p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Hoje</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Conversas Analisadas</p>
              <p className="text-3xl font-bold text-foreground mt-1">{totalConversas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Score Médio</p>
              <p className={`text-3xl font-bold mt-1 ${getScoreColor(avgScore)}`}>{avgScore}/10</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Abaixo do Mínimo</p>
              <p className="text-3xl font-bold text-red-400 mt-1">{belowPct}%</p>
              <p className="text-xs text-muted-foreground">{belowCount} de {totalConversas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Erros Detectados</p>
              <p className="text-3xl font-bold text-amber-400 mt-1">
                {evaluations.reduce((s, e) => s + (Array.isArray(e.errors_found) ? e.errors_found.length : 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Tendência de Qualidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <ReferenceLine y={threshold} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `Min: ${threshold}`, fill: "hsl(var(--destructive))", fontSize: 11 }} />
                  <Line type="monotone" dataKey="avg_score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Score Médio" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Top Erros do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topErrors.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topErrors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value} ocorrências`, "Frequência"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name="Ocorrências" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Nenhum erro detectado no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendant Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Ranking de Atendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Atendente</TableHead>
                  <TableHead className="text-center">Score Médio</TableHead>
                  <TableHead className="text-center">Conversas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((att, i) => (
                  <TableRow key={att.id}>
                    <TableCell className="font-bold">{i + 1}</TableCell>
                    <TableCell className="font-medium">{att.id === "sem_atendente" ? "Sem atendente" : att.id.slice(0, 8) + "..."}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${getScoreColor(att.avg_score)}`}>{att.avg_score}</span>
                    </TableCell>
                    <TableCell className="text-center">{att.conversations}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum atendente avaliado no período</p>
          )}
        </CardContent>
      </Card>

      {/* Evaluations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Conversas Avaliadas
          </CardTitle>
          <CardDescription>Clique em uma avaliação para ver detalhes</CardDescription>
        </CardHeader>
        <CardContent>
          {evaluations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Conversa</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Erros</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.slice(0, 20).map((ev) => (
                  <TableRow
                    key={ev.id}
                    className="cursor-pointer hover:bg-muted/70"
                    onClick={() => setSelectedEval(ev)}
                  >
                    <TableCell className="text-xs">
                      {format(new Date(ev.evaluated_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ev.conversation_id.slice(0, 12)}...</TableCell>
                    <TableCell>
                      <span className={`font-bold ${getScoreColor(Number(ev.overall_score))}`}>
                        {Number(ev.overall_score).toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getScoreBadge(ev.score_label || "")}>
                        {ev.score_label || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{Array.isArray(ev.errors_found) ? ev.errors_found.length : 0}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {ev.source === "closer" ? "Closer" : "Humano"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma avaliação no período selecionado</p>
          )}
        </CardContent>
      </Card>

      {/* Evaluation Detail Drawer */}
      <Sheet open={!!selectedEval} onOpenChange={() => setSelectedEval(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedEval && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Avaliação Detalhada
                  <Badge variant="outline" className={getScoreBadge(selectedEval.score_label || "")}>
                    {selectedEval.score_label}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  Conversa: {selectedEval.conversation_id}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Overall Score */}
                <div className="text-center py-4">
                  <p className={`text-5xl font-bold ${getScoreColor(Number(selectedEval.overall_score))}`}>
                    {Number(selectedEval.overall_score).toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Score Geral</p>
                </div>

                <Separator />

                {/* Criteria Scores */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Critérios de Avaliação</h3>
                  {(Array.isArray(selectedEval.criteria_scores) ? selectedEval.criteria_scores : []).map((c: any, i: number) => (
                    <div key={i} className="border border-border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{c.label}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">Peso: {c.weight}%</Badge>
                          <span className={`font-bold text-sm ${getScoreColor(c.score)}`}>{c.score}/10</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.justification}</p>
                    </div>
                  ))}
                </div>

                {/* Errors */}
                {Array.isArray(selectedEval.errors_found) && selectedEval.errors_found.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" /> Erros Encontrados
                      </h3>
                      {(selectedEval.errors_found as any[]).map((err, i) => (
                        <div key={i} className="border border-red-500/20 bg-red-500/5 p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityBadge(err.severity || "medium")}>{err.severity || "medium"}</Badge>
                            <span className="text-sm font-medium">{err.label || err.type}</span>
                            {err.moment && <span className="text-[10px] text-muted-foreground ml-auto">⏱ {err.moment}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{err.description}</p>
                          {err.suggestion && (
                            <p className="text-xs text-teal-400 italic">💡 {err.suggestion}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* AI Summary */}
                {selectedEval.ai_summary && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Resumo da IA</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedEval.ai_summary}</p>
                    </div>
                  </>
                )}

                {/* Recommendations */}
                {Array.isArray(selectedEval.recommendations) && selectedEval.recommendations.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Recomendações</h3>
                      <ul className="space-y-1">
                        {(selectedEval.recommendations as string[]).map((r, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <span className="text-primary">💡</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
