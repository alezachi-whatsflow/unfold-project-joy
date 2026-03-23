import { Instagram, Users, Heart, Image, TrendingUp, MessageCircle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProfileAnalysis } from "@/types/intelligence";
import { cn } from "@/lib/utils";

interface InstagramAnalysisCardProps {
  profile: ProfileAnalysis;
}

function formatNumber(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getEngagementLabel(rate: number | null) {
  if (rate === null) return { label: "N/A", color: "text-muted-foreground" };
  if (rate >= 5) return { label: "Excelente", color: "text-primary" };
  if (rate >= 3) return { label: "Bom", color: "text-chart-2" };
  if (rate >= 1) return { label: "Médio", color: "text-warning" };
  return { label: "Baixo", color: "text-destructive" };
}

function getAuthorityLabel(score: number | null) {
  if (score === null) return { label: "N/A", color: "text-muted-foreground" };
  if (score >= 8) return { label: "Alta Autoridade", color: "text-primary" };
  if (score >= 5) return { label: "Autoridade Média", color: "text-warning" };
  return { label: "Autoridade Baixa", color: "text-destructive" };
}

export function InstagramAnalysisCard({ profile }: InstagramAnalysisCardProps) {
  const engagement = getEngagementLabel(profile.avg_engagement_rate);
  const authority = getAuthorityLabel(profile.authority_score);

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Instagram className="h-4 w-4 text-pink-500" />
          Análise de Perfil Instagram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Profile Header */}
        <div className="flex items-center gap-4 rounded-lg bg-secondary p-4">
          <div className="relative h-14 w-14 shrink-0">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={profile.display_name || profile.username}
                className="h-14 w-14 rounded-full border-2 border-primary object-cover"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600"
              style={{ display: profile.profile_image_url ? "none" : "flex" }}
            >
              <Instagram className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-bold text-foreground truncate">
              {profile.display_name || profile.username}
            </h3>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{profile.bio}</p>
            )}
          </div>
          <Badge variant={profile.status === "completed" ? "default" : "secondary"} className="shrink-0">
            {profile.status === "completed" ? "Concluído" : profile.status}
          </Badge>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricBox icon={Users} label="Seguidores" value={formatNumber(profile.followers)} />
          <MetricBox icon={Users} label="Seguindo" value={formatNumber(profile.following)} />
          <MetricBox icon={Image} label="Posts" value={formatNumber(profile.posts_count)} />
        </div>

        {/* Engagement Rate */}
        <div className="space-y-2 rounded-lg bg-secondary/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              <span className="text-xs font-medium text-foreground">Taxa de Engajamento</span>
            </div>
            <span className={cn("font-display text-sm font-bold", engagement.color)}>
              {profile.avg_engagement_rate !== null ? `${profile.avg_engagement_rate.toFixed(2)}%` : "N/A"}
            </span>
          </div>
          <Progress
            value={Math.min((profile.avg_engagement_rate || 0) * 10, 100)}
            className="h-2"
          />
          <p className={cn("text-[11px] font-medium", engagement.color)}>{engagement.label}</p>
        </div>

        {/* Authority Score */}
        <div className="space-y-2 rounded-lg bg-secondary/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-foreground">Score de Autoridade</span>
            </div>
            <span className={cn("font-display text-lg font-bold", authority.color)}>
              {profile.authority_score !== null ? `${profile.authority_score.toFixed(1)}/10` : "N/A"}
            </span>
          </div>
          <Progress
            value={(profile.authority_score || 0) * 10}
            className="h-2"
          />
          <p className={cn("text-[11px] font-medium", authority.color)}>{authority.label}</p>
        </div>

        {/* Content Strategy Notes */}
        {profile.content_strategy_notes && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Estratégia de Conteúdo</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {profile.content_strategy_notes}
            </p>
          </div>
        )}

        {/* Profile Link */}
        <a
          href={profile.profile_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Instagram className="h-3.5 w-3.5" />
          Ver Perfil no Instagram
        </a>
      </CardContent>
    </Card>
  );
}

function MetricBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-secondary/50 p-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="font-display text-lg font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
