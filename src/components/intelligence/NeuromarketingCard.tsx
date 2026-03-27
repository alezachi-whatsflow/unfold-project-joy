import {
  Brain,
  Eye,
  Heart,
  Lightbulb,
  Zap,
  Target,
  Palette,
  Smartphone,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { NeuromarketingAnalysis } from "@/types/analysisModules";
import { cn } from "@/lib/utils";
import {
  CIALDINI_KNOWLEDGE,
  BRAIN_KNOWLEDGE,
  MODULE_KNOWLEDGE,
  KnowledgeEntry,
} from "@/lib/neuromarketingKnowledge";

interface NeuromarketingCardProps {
  analysis: NeuromarketingAnalysis;
}

function getScoreColor(score: number) {
  if (score >= 7) return "text-primary";
  if (score >= 5) return "text-warning";
  return "text-destructive";
}

/** Tooltip card renderizado dentro de cada HoverCard */
function KnowledgeTooltip({ entry }: { entry: KnowledgeEntry }) {
  return (
    <div className="space-y-3 max-w-sm">
      <p className="text-xs font-bold text-foreground">{entry.titulo}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{entry.descricao}</p>

      <div>
        <p className="text-[10px] font-semibold text-primary mb-1">Como otimizar:</p>
        <ul className="space-y-0.5">
          {entry.como_otimizar.slice(0, 4).map((tip, i) => (
            <li key={i} className="text-[10px] text-foreground flex gap-1.5 items-start">
              <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-destructive mb-1">Erros comuns:</p>
        <ul className="space-y-0.5">
          {entry.erros_comuns.slice(0, 3).map((err, i) => (
            <li key={i} className="text-[10px] text-muted-foreground flex gap-1.5 items-start">
              <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
              <span>{err}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded bg-primary/10 px-2 py-1.5">
        <p className="text-[10px] text-primary font-medium">Impacto estimado: {entry.impacto_estimado}</p>
      </div>
    </div>
  );
}

export function NeuromarketingCard({ analysis }: NeuromarketingCardProps) {
  const a = analysis;

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-chart-3" />
            Análise Neuromarketing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 bg-secondary p-4">
            <span className={cn("font-display text-3xl font-bold", getScoreColor(a.score_geral))}>
              {a.score_geral.toFixed(1)}
            </span>
            <div className="flex-1">
              <p className={cn("text-sm font-medium", getScoreColor(a.score_geral))}>{a.nivel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Análise baseada em neurociência aplicada ao design</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 Brain Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <BrainCard
          icon={Zap} title="Reptiliano" color="text-destructive"
          score={a.cerebro_reptiliano.score} desc={a.cerebro_reptiliano.descricao}
          gaps={a.cerebro_reptiliano.gaps}
          knowledgeKey="reptiliano"
        />
        <BrainCard
          icon={Heart} title="Límbico" color="text-chart-3"
          score={a.cerebro_limbico.score} desc={a.cerebro_limbico.descricao}
          gaps={a.cerebro_limbico.gaps}
          knowledgeKey="limbico"
        />
        <BrainCard
          icon={Lightbulb} title="Neocórtex" color="text-accent"
          score={a.neocortex.score} desc={a.neocortex.descricao}
          gaps={a.neocortex.gaps}
          knowledgeKey="neocortex"
        />
      </div>

      {/* Cialdini Triggers */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-warning" />
            Gatilhos de Cialdini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(a.gatilhos_cialdini).map(([key, trigger]) => {
              const labels: Record<string, string> = {
                reciprocidade: "Reciprocidade", prova_social: "Prova Social", autoridade: "Autoridade",
                escassez: "Escassez", urgencia: "Urgência", compromisso: "Compromisso",
              };
              const knowledge = CIALDINI_KNOWLEDGE[key];
              return (
                <HoverCard key={key} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div className={cn(
                      "border p-3 space-y-1 cursor-pointer transition-colors hover:border-primary/40",
                      trigger.presente ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/30"
                    )}>
                      <div className="flex items-center gap-2">
                        {trigger.presente ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        <span className="text-xs font-semibold text-foreground">{labels[key]}</span>
                        <Info className="h-3 w-3 text-muted-foreground ml-auto" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{trigger.sugestao}</p>
                    </div>
                  </HoverCardTrigger>
                  {knowledge && (
                    <HoverCardContent side="top" align="center" className="w-[380px] z-[100]">
                      <KnowledgeTooltip entry={knowledge} />
                    </HoverCardContent>
                  )}
                </HoverCard>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Above the Fold + Eye Tracking + Colors */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Above the Fold */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <Card className="border-border bg-card cursor-pointer transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-accent" /> Above the Fold
                  <Info className="h-3 w-3 text-muted-foreground ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <span className={cn("font-display text-lg font-bold", getScoreColor(a.above_the_fold.score))}>
                  {a.above_the_fold.score}/10
                </span>
                {[
                  { label: "Proposta de valor clara", ok: a.above_the_fold.tem_proposta_valor_clara },
                  { label: "CTA visível", ok: a.above_the_fold.tem_cta_visivel },
                  { label: "Imagem de pessoa", ok: a.above_the_fold.tem_imagem_de_pessoa },
                  { label: "Elemento de confiança", ok: a.above_the_fold.tem_elemento_confianca },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px]">
                    {item.ok ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <XCircle className="h-3 w-3 text-destructive" />}
                    <span className="text-foreground">{item.label}</span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground">{a.above_the_fold.tempo_compreensao_estimado}</p>
              </CardContent>
            </Card>
          </HoverCardTrigger>
          <HoverCardContent side="top" align="center" className="w-[380px] z-[100]">
            <KnowledgeTooltip entry={MODULE_KNOWLEDGE.above_the_fold} />
          </HoverCardContent>
        </HoverCard>

        {/* Eye Tracking */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <Card className="border-border bg-card cursor-pointer transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-chart-3" /> Eye Tracking Simulado
                  <Info className="h-3 w-3 text-muted-foreground ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="outline" className="text-[10px]">{a.eye_tracking_simulado.padrao_detectado}</Badge>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {a.eye_tracking_simulado.cta_na_zona_quente ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <XCircle className="h-3 w-3 text-destructive" />}
                  <span className="text-foreground">CTA na zona quente</span>
                </div>
                {a.eye_tracking_simulado.distracoes_detectadas.map((d, i) => (
                  <p key={i} className="text-[10px] text-warning">⚠ {d}</p>
                ))}
              </CardContent>
            </Card>
          </HoverCardTrigger>
          <HoverCardContent side="top" align="center" className="w-[380px] z-[100]">
            <KnowledgeTooltip entry={MODULE_KNOWLEDGE.eye_tracking} />
          </HoverCardContent>
        </HoverCard>

        {/* Color Psychology */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <Card className="border-border bg-card cursor-pointer transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-chart-4" /> Psicologia das Cores
                  <Info className="h-3 w-3 text-muted-foreground ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-foreground">Cor predominante: <strong>{a.psicologia_das_cores.cor_predominante}</strong></p>
                <p className="text-[11px] text-muted-foreground">{a.psicologia_das_cores.emocao_evocada}</p>
                <Badge variant="outline" className={cn("text-[10px]",
                  a.psicologia_das_cores.adequacao_para_nicho === "Excelente" || a.psicologia_das_cores.adequacao_para_nicho === "Adequada" ? "text-primary" : "text-warning"
                )}>
                  {a.psicologia_das_cores.adequacao_para_nicho}
                </Badge>
                <p className="text-[10px] text-muted-foreground">{a.psicologia_das_cores.sugestao_cores}</p>
              </CardContent>
            </Card>
          </HoverCardTrigger>
          <HoverCardContent side="top" align="center" className="w-[380px] z-[100]">
            <KnowledgeTooltip entry={MODULE_KNOWLEDGE.psicologia_cores} />
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Top 5 Improvements */}
      {a.top5_melhorias_neuromarketing.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top {a.top5_melhorias_neuromarketing.length} Melhorias de Neuromarketing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {a.top5_melhorias_neuromarketing.map((imp) => (
              <div key={imp.posicao} className="border border-border bg-secondary/20 p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">{imp.posicao}</span>
                  <p className="text-xs font-medium text-foreground flex-1">{imp.melhoria}</p>
                  <Badge variant="outline" className="text-[9px]">{imp.principio}</Badge>
                </div>
                <p className="text-[11px] text-accent ml-7">{imp.impacto_conversao_estimado}</p>
                <p className="text-[11px] text-muted-foreground ml-7">{imp.como_implementar}</p>
                <div className="flex gap-2 ml-7">
                  <Badge variant="secondary" className="text-[9px]">{imp.dificuldade}</Badge>
                  <Badge variant="secondary" className="text-[9px]">{imp.custo}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BrainCard({ icon: Icon, title, color, score, desc, gaps, knowledgeKey }: {
  icon: React.ElementType; title: string; color: string; score: number; desc: string; gaps: string[]; knowledgeKey: string;
}) {
  const knowledge = BRAIN_KNOWLEDGE[knowledgeKey];
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Card className="border-border bg-card cursor-pointer transition-colors hover:border-primary/40">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", color)} />
              <span className="text-xs font-semibold text-foreground">{title}</span>
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className={cn("font-display text-sm font-bold ml-auto", getScoreColor(score))}>{score}/10</span>
            </div>
            <Progress value={score * 10} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{desc}</p>
            {gaps.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {gaps.map((g, i) => (
                  <Badge key={i} variant="destructive" className="text-[9px]">{g}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </HoverCardTrigger>
      {knowledge && (
        <HoverCardContent side="top" align="center" className="w-[380px] z-[100]">
          <KnowledgeTooltip entry={knowledge} />
        </HoverCardContent>
      )}
    </HoverCard>
  );
}
