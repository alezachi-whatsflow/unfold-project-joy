import { Globe, Instagram, MapPin, ShieldCheck, MessageCircle, Brain, Target, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ChannelThreshold } from "@/types/rescuePlan";
import { getStatusColor } from "@/lib/thresholdScoring";
import { cn } from "@/lib/utils";

interface ThresholdStatusBarProps {
  overall: ChannelThreshold;
  website: ChannelThreshold | null;
  instagram: ChannelThreshold | null;
  gmn: ChannelThreshold | null;
  meta?: ChannelThreshold | null;
  whatsapp?: ChannelThreshold | null;
  neuro?: ChannelThreshold | null;
}

const CHANNEL_CONFIG = [
  { key: "website", label: "Website", icon: Globe, weight: "25%", action: "Otimizar SEO e conteúdo de autoridade" },
  { key: "instagram", label: "Instagram", icon: Instagram, weight: "20%", action: "Aumentar engajamento e consistência" },
  { key: "gmn", label: "Perfil Empresa", icon: MapPin, weight: "20%", action: "Completar perfil e obter avaliações" },
  { key: "meta", label: "Meta", icon: ShieldCheck, weight: "15%", action: "Verificar domínio e configurar Business Manager" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, weight: "10%", action: "Adicionar botão de contato acessível" },
  { key: "neuro", label: "Neuro", icon: Brain, weight: "10%", action: "Melhorar hierarquia visual e CTAs" },
];

function getBarColor(score: number): string {
  if (score >= 7.5) return "bg-primary";
  if (score >= 5.0) return "bg-warning";
  return "bg-destructive";
}

function getBarTextColor(score: number): string {
  if (score >= 7.5) return "text-primary";
  if (score >= 5.0) return "text-warning";
  return "text-destructive";
}

export function ThresholdStatusBar({ overall, website, instagram, gmn, meta, whatsapp, neuro }: ThresholdStatusBarProps) {
  const thresholdMap: Record<string, ChannelThreshold | null> = {
    website, instagram, gmn,
    meta: meta ?? null,
    whatsapp: whatsapp ?? null,
    neuro: neuro ?? null,
  };

  const channels = CHANNEL_CONFIG.map((c) => ({
    ...c,
    threshold: thresholdMap[c.key],
  }));

  const goalScore = 7.5; // Meta de aprovação

  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-5 pb-4 space-y-4">
        {/* Header with overall score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Presença Digital</h3>
              <p className="text-xs text-muted-foreground">{overall.label}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={cn("font-display text-2xl font-bold", getStatusColor(overall.status))}>
              {overall.score.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/10</span>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="relative">
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", getBarColor(overall.score))}
              style={{ width: `${Math.min((overall.score / 10) * 100, 100)}%` }}
            />
          </div>
          {/* Goal line */}
          <div
            className="absolute top-0 h-3 w-0.5 bg-foreground/50"
            style={{ left: `${(goalScore / 10) * 100}%` }}
            title={`Meta: ${goalScore}`}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">0</span>
            <span className="text-[10px] text-muted-foreground/60" style={{ position: "absolute", left: `${(goalScore / 10) * 100}%`, transform: "translateX(-50%)" }}>
              Meta {goalScore}
            </span>
            <span className="text-[10px] text-muted-foreground">10</span>
          </div>
        </div>

        {/* Channel bars */}
        <div className="space-y-2.5 mt-1">
          {channels.map(({ key, label, icon: Icon, weight, threshold, action }) => {
            const score = threshold?.score ?? null;
            const pct = score !== null ? Math.min((score / 10) * 100, 100) : 0;
            const isNA = score === null;

            return (
              <div key={key} className="group">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground w-24 truncate">{label}</span>
                  <span className="text-[10px] text-muted-foreground">({weight})</span>
                  <div className="flex-1" />
                  <span className={cn("text-xs font-bold tabular-nums", isNA ? "text-muted-foreground" : getBarTextColor(score!))}>
                    {isNA ? "N/A" : score!.toFixed(1)}
                  </span>
                </div>
                <div className="relative">
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    {!isNA && (
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", getBarColor(score!))}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                  </div>
                  {/* Goal marker */}
                  <div
                    className="absolute top-0 h-2 w-px bg-foreground/30"
                    style={{ left: `${(goalScore / 10) * 100}%` }}
                  />
                </div>
                {/* Action suggestion on hover */}
                {!isNA && score! < goalScore && (
                  <div className="hidden group-hover:flex items-center gap-1.5 mt-1 pl-5">
                    <Lightbulb className="h-3 w-3 text-warning shrink-0" />
                    <span className="text-[10px] text-muted-foreground italic">{action}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
