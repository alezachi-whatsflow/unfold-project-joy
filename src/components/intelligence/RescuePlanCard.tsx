import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Globe,
  Instagram,
  MapPin,
  Zap,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RescuePlan, ChannelRescuePlan, QuickWinProgress } from "@/types/rescuePlan";
import { ChannelThreshold } from "@/types/rescuePlan";
import { getStatusColor, getStatusBgColor } from "@/lib/thresholdScoring";
import { cn } from "@/lib/utils";

interface RescuePlanCardProps {
  rescuePlan: RescuePlan;
  overall: ChannelThreshold;
  websiteThreshold: ChannelThreshold | null;
  instagramThreshold: ChannelThreshold | null;
  gmnThreshold: ChannelThreshold | null;
}

export function RescuePlanCard({
  rescuePlan,
  overall,
  websiteThreshold,
  instagramThreshold,
  gmnThreshold,
}: RescuePlanCardProps) {
  const [quickWinProgress, setQuickWinProgress] = useState<QuickWinProgress[]>([]);

  const toggleQuickWin = (channel: QuickWinProgress["channel"], index: number) => {
    setQuickWinProgress((prev) => {
      const existing = prev.find((q) => q.channel === channel && q.index === index);
      if (existing) {
        return prev.map((q) =>
          q.channel === channel && q.index === index ? { ...q, completed: !q.completed } : q
        );
      }
      return [...prev, { channel, index, completed: true }];
    });
  };

  const isQuickWinDone = (channel: QuickWinProgress["channel"], index: number) =>
    quickWinProgress.find((q) => q.channel === channel && q.index === index)?.completed ?? false;

  const improvementPotential = Math.max(0, 6.5 - overall.score);
  const completedWins = quickWinProgress.filter((q) => q.completed).length;
  const totalWins =
    (rescuePlan.website?.quick_wins?.length ?? 0) +
    (rescuePlan.instagram?.quick_wins?.length ?? 0) +
    (rescuePlan.google_meu_negocio?.quick_wins?.length ?? 0);

  const urgencyColors = {
    Crítica: "bg-destructive/15 border-destructive/30 text-destructive",
    Alta: "bg-warning/15 border-warning/30 text-warning",
    Moderada: "bg-accent/15 border-accent/30 text-accent",
  };

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      <div
        className={cn(
          "rounded-lg border p-4 flex items-start gap-3",
          urgencyColors[rescuePlan.urgencia]
        )}
      >
        <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">
            Sua presença digital está abaixo da média de mercado.
          </p>
          <p className="text-xs mt-1 opacity-90">{rescuePlan.motivo}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px]">
              Urgência: {rescuePlan.urgencia}
            </Badge>
            {rescuePlan.nicho_detectado && (
              <Badge variant="secondary" className="text-[10px]">
                Nicho: {rescuePlan.nicho_detectado}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Niche Benchmark */}
      {rescuePlan.benchmark_mercado && rescuePlan.nicho_detectado && (
        <Card className="border-border bg-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-foreground">
                Benchmark de Mercado — {rescuePlan.nicho_detectado}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Website", val: rescuePlan.benchmark_mercado.website, current: websiteThreshold?.score },
                { label: "Instagram", val: rescuePlan.benchmark_mercado.instagram, current: instagramThreshold?.score },
                { label: "GMN", val: rescuePlan.benchmark_mercado.gmn, current: gmnThreshold?.score },
              ].map((b) => (
                <div key={b.label} className="rounded-lg bg-secondary/50 p-2">
                  <p className="text-[10px] text-muted-foreground">{b.label}</p>
                  <p className="font-display text-sm font-bold text-foreground">
                    Média: {b.val}
                  </p>
                  {b.current !== undefined && b.current !== null && (
                    <p
                      className={cn(
                        "text-[10px] font-medium",
                        b.current >= b.val ? "text-primary" : "text-destructive"
                      )}
                    >
                      Você: {b.current.toFixed(1)} ({b.current >= b.val ? "acima" : "abaixo"})
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Improvement Potential Progress */}
      {improvementPotential > 0 && (
        <Card className="border-border bg-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-warning" />
                Potencial de melhoria
              </span>
              <span className="text-xs text-muted-foreground">
                {completedWins}/{totalWins} ações concluídas
              </span>
            </div>
            <Progress value={totalWins > 0 ? (completedWins / totalWins) * 100 : 0} className="h-2" />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              +{improvementPotential.toFixed(1)} pontos possíveis de ganhar para atingir 6.5
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Wins by Channel */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-warning" />3 coisas que você pode fazer HOJE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rescuePlan.website?.quick_wins && rescuePlan.website.quick_wins.length > 0 && (
            <QuickWinSection
              icon={Globe}
              label="Website"
              wins={rescuePlan.website.quick_wins}
              channel="website"
              isChecked={isQuickWinDone}
              onToggle={toggleQuickWin}
            />
          )}
          {rescuePlan.instagram?.quick_wins && rescuePlan.instagram.quick_wins.length > 0 && (
            <QuickWinSection
              icon={Instagram}
              label="Instagram"
              wins={rescuePlan.instagram.quick_wins}
              channel="instagram"
              isChecked={isQuickWinDone}
              onToggle={toggleQuickWin}
            />
          )}
          {rescuePlan.google_meu_negocio?.quick_wins && rescuePlan.google_meu_negocio.quick_wins.length > 0 && (
            <QuickWinSection
              icon={MapPin}
              label="Google Meu Negócio"
              wins={rescuePlan.google_meu_negocio.quick_wins}
              channel="google_meu_negocio"
              isChecked={isQuickWinDone}
              onToggle={toggleQuickWin}
            />
          )}
        </CardContent>
      </Card>

      {/* Full Plan Accordion */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Plano de Resgate Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {rescuePlan.website?.ativado && rescuePlan.website.plano_imediato?.length > 0 && (
              <ChannelAccordion
                value="website"
                icon={Globe}
                label="Website"
                threshold={websiteThreshold}
                plan={rescuePlan.website}
              />
            )}
            {rescuePlan.instagram?.ativado && rescuePlan.instagram.plano_imediato?.length > 0 && (
              <ChannelAccordion
                value="instagram"
                icon={Instagram}
                label="Instagram"
                threshold={instagramThreshold}
                plan={rescuePlan.instagram}
              />
            )}
            {rescuePlan.google_meu_negocio?.ativado && rescuePlan.google_meu_negocio.plano_imediato?.length > 0 && (
              <ChannelAccordion
                value="gmn"
                icon={MapPin}
                label="Google Meu Negócio"
                threshold={gmnThreshold}
                plan={rescuePlan.google_meu_negocio}
              />
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ───

function QuickWinSection({
  icon: Icon,
  label,
  wins,
  channel,
  isChecked,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  wins: string[];
  channel: QuickWinProgress["channel"];
  isChecked: (ch: QuickWinProgress["channel"], i: number) => boolean;
  onToggle: (ch: QuickWinProgress["channel"], i: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>
      <div className="space-y-2">
        {wins.map((win, i) => (
          <label
            key={i}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors",
              isChecked(channel, i)
                ? "bg-primary/5 border-primary/20"
                : "bg-secondary/30 border-border hover:bg-secondary/50"
            )}
          >
            <Checkbox
              checked={isChecked(channel, i)}
              onCheckedChange={() => onToggle(channel, i)}
              className="mt-0.5"
            />
            <span
              className={cn(
                "text-xs leading-relaxed",
                isChecked(channel, i) ? "line-through text-muted-foreground" : "text-foreground"
              )}
            >
              {win}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ChannelAccordion({
  value,
  icon: Icon,
  label,
  threshold,
  plan,
}: {
  value: string;
  icon: React.ElementType;
  label: string;
  threshold: ChannelThreshold | null;
  plan: ChannelRescuePlan;
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-sm hover:no-underline">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span>{label}</span>
          {threshold && (
            <Badge
              variant="outline"
              className={cn("text-[10px] ml-1", getStatusColor(threshold.status))}
            >
              {threshold.score.toFixed(1)} — {threshold.label}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3">
          {plan.abaixo_em && plan.abaixo_em.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-destructive">Pontos fracos:</span>{" "}
              {plan.abaixo_em.join(", ")}
            </div>
          )}
          {plan.plano_imediato?.map((action) => (
            <div key={action.ordem} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  {action.ordem}
                </span>
                <p className="text-xs font-medium text-foreground leading-relaxed">{action.acao}</p>
              </div>
              <div className="ml-7 space-y-1.5">
                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-accent" />
                  <span><strong>Onde:</strong> {action.onde_fazer}</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-accent" />
                  <span><strong>Como:</strong> {action.como_fazer}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px] gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {action.tempo_estimado}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] gap-1">
                    <DollarSign className="h-2.5 w-2.5" />
                    {action.custo}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px]">
                    Impacto: {action.impacto_esperado}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
