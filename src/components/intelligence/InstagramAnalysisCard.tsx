import { Instagram, Users, Heart, Image, TrendingUp, MessageCircle, BarChart3, Link2, Hash, Video, Layers, Clock, Star, ExternalLink, Target, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProfileAnalysis } from "@/types/intelligence";
import { cn } from "@/lib/utils";

interface InstagramAnalysisCardProps {
  profile: ProfileAnalysis;
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getEngagementLabel(rate: number | null) {
  if (rate === null) return { label: "N/A", color: "text-muted-foreground" };
  if (rate >= 5) return { label: "Excelente", color: "text-primary" };
  if (rate >= 3) return { label: "Bom", color: "text-chart-2" };
  if (rate >= 1) return { label: "Medio", color: "text-warning" };
  return { label: "Baixo", color: "text-destructive" };
}

function getAuthorityLabel(score: number | null) {
  if (score === null) return { label: "N/A", color: "text-muted-foreground" };
  if (score >= 8) return { label: "Alta Autoridade", color: "text-primary" };
  if (score >= 5) return { label: "Autoridade Media", color: "text-warning" };
  return { label: "Autoridade Baixa", color: "text-destructive" };
}

export function InstagramAnalysisCard({ profile }: InstagramAnalysisCardProps) {
  const engagement = getEngagementLabel(profile.avg_engagement_rate);
  const authority = getAuthorityLabel(profile.authority_score);
  const mix = profile.content_mix;
  const recentPosts = profile.recent_posts || [];
  const topHashtags = profile.top_hashtags || [];

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Instagram className="h-4 w-4 text-pink-500" />
          Analise de Perfil Instagram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Profile Header */}
        <div className="flex items-center gap-4 bg-secondary p-4 rounded-lg">
          <div className="relative h-14 w-14 shrink-0">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={profile.display_name || profile.username}
                className="h-14 w-14 rounded-full border-2 border-primary object-cover"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="h-14 w-14 flex items-center justify-center rounded-full bg-pink-500">
                <Instagram className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold text-foreground truncate">
                {profile.display_name || profile.username}
              </h3>
              {profile.is_verified && <Badge className="bg-blue-500 text-[9px]">Verificado</Badge>}
              {profile.is_business && <Badge variant="outline" className="text-[9px]">Business</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.business_category && (
              <p className="text-xs text-primary">{profile.business_category}</p>
            )}
            {profile.bio && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{profile.bio}</p>}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricBox icon={Users} label="Seguidores" value={formatNumber(profile.followers)} />
          <MetricBox icon={Users} label="Seguindo" value={formatNumber(profile.following)} />
          <MetricBox icon={Image} label="Posts" value={formatNumber(profile.posts_count)} />
          <MetricBox icon={Clock} label="Frequencia" value={profile.posting_frequency || "—"} small />
        </div>

        {/* Engagement + Authority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 bg-secondary/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <span className="text-xs font-medium">Engajamento</span>
              </div>
              <span className={cn("font-display text-sm font-bold", engagement.color)}>
                {profile.avg_engagement_rate !== null ? `${profile.avg_engagement_rate.toFixed(2)}%` : "N/A"}
              </span>
            </div>
            <Progress value={Math.min((profile.avg_engagement_rate || 0) * 10, 100)} className="h-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{engagement.label}</span>
              <span>Media: {formatNumber(profile.avg_likes)} likes · {formatNumber(profile.avg_comments)} comments</span>
            </div>
          </div>
          <div className="space-y-2 bg-secondary/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Score Autoridade</span>
              </div>
              <span className={cn("font-display text-lg font-bold", authority.color)}>
                {profile.authority_score !== null ? `${profile.authority_score}/10` : "N/A"}
              </span>
            </div>
            <Progress value={(profile.authority_score || 0) * 10} className="h-2" />
            <p className={cn("text-[10px]", authority.color)}>{authority.label}</p>
          </div>
        </div>

        {/* CTA / Bio Links Check */}
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: profile.has_cta_in_bio ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--destructive) / 0.08)' }}>
          <Target className="h-4 w-4 shrink-0" style={{ color: profile.has_cta_in_bio ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }} />
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: profile.has_cta_in_bio ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>
              {profile.has_cta_in_bio ? "Tem CTA/Link na bio" : "Sem CTA na bio — oportunidade de venda perdida"}
            </p>
            {(profile.bio_links || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.bio_links!.map((link, i) => (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                    <Link2 className="h-2.5 w-2.5" /> {link.replace(/https?:\/\//, "").slice(0, 30)}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Mix */}
        {mix && (mix.photos + mix.videos + mix.carousels) > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Mix de Conteudo (ultimos {recentPosts.length} posts)</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2 bg-secondary/50 p-2.5 rounded-lg">
                <Image className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm font-bold">{mix.photos}</p>
                  <p className="text-[10px] text-muted-foreground">Fotos</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 p-2.5 rounded-lg">
                <Video className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-sm font-bold">{mix.videos}</p>
                  <p className="text-[10px] text-muted-foreground">Videos/Reels</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 p-2.5 rounded-lg">
                <Layers className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-sm font-bold">{mix.carousels}</p>
                  <p className="text-[10px] text-muted-foreground">Carrosseis</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Hashtags */}
        {topHashtags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> Top Hashtags</h4>
            <div className="flex flex-wrap gap-1.5">
              {topHashtags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Best Performing Post */}
        {profile.best_performing_post && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-400" /> Post com Melhor Performance</h4>
            <div className="bg-secondary/50 p-3 rounded-lg space-y-1.5">
              <p className="text-xs text-muted-foreground line-clamp-3">{profile.best_performing_post.caption || "(sem legenda)"}</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Heart className="h-3 w-3 text-pink-500" /> {formatNumber(profile.best_performing_post.likes)}</span>
                <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {formatNumber(profile.best_performing_post.comments)}</span>
                <span>{profile.best_performing_post.type}</span>
                <a href={profile.best_performing_post.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-primary flex items-center gap-0.5 hover:underline">
                  Ver <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Content Strategy Notes */}
        {profile.content_strategy_notes && (
          <div className="border border-border bg-card p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold">Diagnostico de Estrategia</span>
            </div>
            <div className="space-y-1.5">
              {profile.content_strategy_notes.split("\n").filter(Boolean).map((note, i) => {
                const isPositive = /bom|forte|ativ|conversao|excelente/i.test(note);
                const isNegative = /sem |nao |baixo|oportunidade|revisar/i.test(note);
                return (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    <span className="mt-0.5 shrink-0">
                      {isPositive ? "✅" : isNegative ? "⚠️" : "📊"}
                    </span>
                    <span className="text-muted-foreground">{note}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Profile Link */}
        <a
          href={profile.profile_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-pink-500 px-4 py-2.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <Instagram className="h-3.5 w-3.5" />
          Ver Perfil no Instagram
        </a>
      </CardContent>
    </Card>
  );
}

function MetricBox({ icon: Icon, label, value, small }: { icon: React.ElementType; label: string; value: string; small?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-secondary/50 p-3 rounded-lg">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className={cn("font-display font-bold text-foreground", small ? "text-xs" : "text-lg")}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
