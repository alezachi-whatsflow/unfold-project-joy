import { Globe, Instagram, MapPin, ShieldCheck, MessageCircle, Brain, Target, Lightbulb, TrendingUp, Sparkles } from "lucide-react";
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

function getGradient(score: number): string {
  if (score >= 7.5) return "from-emerald-500 to-teal-400";
  if (score >= 5.0) return "from-amber-500 to-yellow-400";
  return "from-rose-500 to-red-400";
}

function getGlowColor(score: number): string {
  if (score >= 7.5) return "shadow-emerald-500/20";
  if (score >= 5.0) return "shadow-amber-500/20";
  return "shadow-rose-500/20";
}

function getBarTextColor(score: number): string {
  if (score >= 7.5) return "text-emerald-400";
  if (score >= 5.0) return "text-amber-400";
  return "text-rose-400";
}

function getScoreRing(score: number): string {
  if (score >= 7.5) return "border-emerald-500/60";
  if (score >= 5.0) return "border-amber-500/60";
  return "border-rose-500/60";
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

  const goalScore = 7.5;
  const overallPct = Math.min((overall.score / 10) * 100, 100);

  // Circumference for SVG ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPct / 100) * circumference;

  return (
    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-secondary/30 backdrop-blur-xl">
      {/* Ambient glow */}
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/5 blur-3xl" />

      <CardContent className="relative pt-6 pb-5 space-y-5">
        {/* Header with radial score gauge */}
        <div className="flex items-center gap-5">
          {/* SVG Ring Gauge */}
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
              {/* Background ring */}
              <circle
                cx="60" cy="60" r={radius}
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="8"
                opacity="0.5"
              />
              {/* Goal marker ring segment */}
              <circle
                cx="60" cy="60" r={radius}
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="8"
                strokeDasharray={`2 ${circumference - 2}`}
                strokeDashoffset={-(circumference * (goalScore / 10) - 1)}
                opacity="0.3"
              />
              {/* Score ring */}
              <circle
                cx="60" cy="60" r={radius}
                fill="none"
                className={cn(
                  overall.score >= 7.5 ? "stroke-emerald-500" :
                  overall.score >= 5 ? "stroke-amber-500" : "stroke-rose-500"
                )}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("font-display text-2xl font-extrabold tracking-tight", getBarTextColor(overall.score))}>
                {overall.score.toFixed(1)}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">/10</span>
            </div>
          </div>

          {/* Title & status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary/70" />
              <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">Presença Digital</h3>
            </div>
            <p className={cn("text-lg font-semibold", getBarTextColor(overall.score))}>{overall.label}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Target className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground">Meta: {goalScore}/10</span>
              {overall.score >= goalScore && (
                <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                  <TrendingUp className="h-3 w-3" /> Acima da meta
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Overall linear progress bar */}
        <div className="relative">
          <div className="h-2 rounded-full bg-secondary/80 overflow-hidden backdrop-blur-sm">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out", getGradient(overall.score))}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div
            className="absolute top-0 h-2 w-0.5 bg-foreground/40 rounded-full"
            style={{ left: `${(goalScore / 10) * 100}%` }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted-foreground/50 font-mono">0</span>
            <span
              className="text-[9px] text-muted-foreground/60 font-mono absolute"
              style={{ left: `${(goalScore / 10) * 100}%`, transform: "translateX(-50%)" }}
            >
              {goalScore}
            </span>
            <span className="text-[9px] text-muted-foreground/50 font-mono">10</span>
          </div>
        </div>

        {/* Channel bars with glassmorphism */}
        <div className="space-y-1.5">
          {channels.map(({ key, label, icon: Icon, weight, threshold, action }) => {
            const score = threshold?.score ?? null;
            const pct = score !== null ? Math.min((score / 10) * 100, 100) : 0;
            const isNA = score === null;
            const belowGoal = !isNA && score! < goalScore;

            return (
              <div
                key={key}
                className={cn(
                  "group relative rounded-lg px-3 py-2.5 transition-all duration-300",
                  "hover:bg-secondary/40 hover:shadow-lg",
                  belowGoal && "hover:shadow-md",
                  !isNA && getGlowColor(score!)
                )}
              >
                <div className="flex items-center gap-2.5">
                  {/* Icon with glow */}
                  <div className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-md transition-colors",
                    "bg-secondary/60 group-hover:bg-secondary",
                  )}>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>

                  {/* Label */}
                  <div className="flex items-center gap-1.5 w-28 min-w-0">
                    <span className="text-xs font-medium text-foreground truncate">{label}</span>
                    <span className="text-[9px] text-muted-foreground/60 font-mono">{weight}</span>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 relative">
                    <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
                      {!isNA && (
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out", getGradient(score!))}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </div>
                    <div
                      className="absolute top-0 h-2 w-px bg-foreground/20"
                      style={{ left: `${(goalScore / 10) * 100}%` }}
                    />
                  </div>

                  {/* Score badge */}
                  <div className={cn(
                    "flex items-center justify-center min-w-[40px] h-6 rounded-md text-xs font-bold tabular-nums transition-all",
                    isNA
                      ? "text-muted-foreground bg-secondary/40"
                      : cn(getBarTextColor(score!), "bg-secondary/40 group-hover:bg-secondary/60"),
                  )}>
                    {isNA ? "—" : score!.toFixed(1)}
                  </div>
                </div>

                {/* Action suggestion - slides in on hover */}
                {belowGoal && (
                  <div className="overflow-hidden max-h-0 group-hover:max-h-10 transition-all duration-300 ease-out">
                    <div className="flex items-center gap-1.5 mt-1.5 pl-9">
                      <Lightbulb className="h-3 w-3 text-amber-400/70 shrink-0" />
                      <span className="text-[10px] text-muted-foreground italic leading-tight">{action}</span>
                    </div>
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
