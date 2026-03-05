import { MapPin, Star, Phone, Globe, Clock, Image, MessageSquare, ExternalLink, Building2, ShoppingBag, Rss, CheckCircle2, XCircle, Instagram, Info, CreditCard, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductItem {
  name: string;
  category: string;
  price: string | null;
  image_url: string | null;
}

interface PostItem {
  text: string;
  date: string | null;
  image_url: string | null;
}

interface AdditionalInfoEntry {
  [key: string]: boolean;
}

export interface GoogleBusinessData {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews_count: number | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  opening_hours: any;
  photos_count: number;
  description: string | null;
  claimed: boolean | null;
  reviews_distribution: Record<string, number> | null;
  top_reviews: { text: string; stars: number; publishedAtDate: string }[];
  image_url: string | null;
  maps_url: string;
  products?: ProductItem[];
  posts?: PostItem[];
  has_products?: boolean;
  has_recent_posts?: boolean;
  social_profiles?: any;
  additional_info?: Record<string, AdditionalInfoEntry[]> | null;
  image_categories?: string[] | null;
  people_also_search?: { title: string; category: string }[];
}

interface GoogleBusinessCardProps {
  business: GoogleBusinessData;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground/30"
          )}
        />
      ))}
      <span className="ml-1 font-display text-sm font-bold">{rating.toFixed(1)}</span>
    </div>
  );
}

function ScoreIndicator({ rating, reviewsCount }: { rating: number | null; reviewsCount: number | null }) {
  const score = calculateGMNScore(rating, reviewsCount);
  const color = score >= 7.5 ? "text-primary" : score >= 5.0 ? "text-warning" : "text-destructive";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn("font-display text-2xl font-bold", color)}>{score.toFixed(1)}</span>
      <span className="text-[10px] text-muted-foreground">Score</span>
    </div>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {active ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-destructive" />
      )}
      <span className={cn("text-xs", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

export function calculateGMNScore(rating: number | null, reviewsCount: number | null): number {
  let score = 0;
  if (rating !== null) score += Math.min((rating / 5) * 5, 5);
  if (reviewsCount !== null) {
    if (reviewsCount >= 100) score += 3;
    else if (reviewsCount >= 30) score += 2;
    else if (reviewsCount >= 10) score += 1.5;
    else if (reviewsCount >= 1) score += 0.5;
  }
  score += 2;
  return Math.min(Math.round(score * 10) / 10, 10);
}

/** Extract flat list of active attributes from additionalInfo */
function extractAttributes(additionalInfo: Record<string, AdditionalInfoEntry[]> | null | undefined): { category: string; items: string[] }[] {
  if (!additionalInfo) return [];
  return Object.entries(additionalInfo)
    .map(([category, entries]) => {
      const items = entries
        .flatMap((entry) =>
          Object.entries(entry)
            .filter(([, val]) => val === true)
            .map(([key]) => key)
        );
      return { category, items };
    })
    .filter((g) => g.items.length > 0);
}

export function GoogleBusinessCard({ business }: GoogleBusinessCardProps) {
  const products = business.products || [];
  const posts = business.posts || [];
  const attributes = extractAttributes(business.additional_info);
  const hasAttributes = attributes.length > 0;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {business.image_url ? (
              <img
                src={business.image_url}
                alt={business.name}
                className="h-12 w-12 rounded-lg object-cover"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={cn(!business.image_url ? "" : "hidden", "flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-green-500")}>
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">{business.name}</CardTitle>
              {business.category && (
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  {business.category}
                </Badge>
              )}
            </div>
          </div>
          <ScoreIndicator rating={business.rating} reviewsCount={business.reviews_count} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rating & Reviews */}
        {business.rating !== null && (
          <div className="flex items-center justify-between">
            <RatingStars rating={business.rating} />
            {business.reviews_count !== null && (
              <span className="text-xs text-muted-foreground">
                {business.reviews_count.toLocaleString("pt-BR")} avaliações
              </span>
            )}
          </div>
        )}

        {/* Profile Completeness Indicators */}
        <div className="rounded-lg bg-secondary/50 p-3 grid grid-cols-2 gap-2">
          <StatusBadge active={products.length > 0 || hasAttributes} label="Produtos/Serviços" />
          <StatusBadge active={posts.length > 0} label="Feed Atualizado" />
          <StatusBadge active={!!business.website} label="Website" />
          <StatusBadge active={!!business.phone} label="Telefone" />
          <StatusBadge active={business.photos_count > 0} label={`${business.photos_count} Fotos`} />
          <StatusBadge active={!!business.description} label="Descrição" />
        </div>

        {/* Info Grid */}
        <div className="grid gap-2 text-xs">
          {business.address && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-foreground">{business.address}</span>
            </div>
          )}
          {business.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-foreground">{business.phone}</span>
            </div>
          )}
          {business.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                {business.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </div>
          )}
        </div>

        {/* Description */}
        {business.description && (
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{business.description}</p>
          </div>
        )}

        {/* Business Attributes from additionalInfo */}
        {hasAttributes && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Info className="h-3.5 w-3.5" />
              Atributos do Negócio
            </h4>
            <div className="grid gap-2">
              {attributes.map((group) => (
                <div key={group.category} className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">{group.category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <Badge key={item} variant="secondary" className="text-[10px] font-normal">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products / Services */}
        {products.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <ShoppingBag className="h-3.5 w-3.5" />
              Produtos / Serviços
            </h4>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {products.map((p, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/50 p-2">
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-16 w-full rounded object-cover mb-1.5"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <p className="text-[11px] font-medium text-foreground line-clamp-2">{p.name}</p>
                  {p.category && <p className="text-[10px] text-muted-foreground">{p.category}</p>}
                  {p.price && <p className="text-[10px] font-semibold text-primary mt-0.5">{p.price}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feed / Posts */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Rss className="h-3.5 w-3.5" />
            Postagens / Feed
          </h4>
          {posts.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {posts.map((post, i) => (
                <div key={i} className="rounded-lg bg-muted/50 p-2.5 flex gap-2">
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt=""
                      className="h-12 w-12 rounded object-cover shrink-0"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="min-w-0">
                    {post.text && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{post.text}</p>
                    )}
                    {post.date && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(post.date).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-warning/30 bg-warning/5 p-3 text-center">
              <Rss className="h-4 w-4 text-warning mx-auto mb-1" />
              <p className="text-[11px] text-warning">Feed sem atualizações recentes</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Recomendação: Publicar atualizações semanais para melhorar o engajamento</p>
            </div>
          )}
        </div>

        {/* Social Profiles */}
        {business.social_profiles && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Instagram className="h-3.5 w-3.5" />
              Perfis Sociais
            </h4>
            <div className="flex flex-wrap gap-2">
              {typeof business.social_profiles === "object" &&
                Object.entries(business.social_profiles).map(([key, url]) => (
                  <a
                    key={key}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] text-primary hover:bg-muted/80 transition"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {key}
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* Top Reviews */}
        {business.top_reviews && business.top_reviews.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              Avaliações Recentes
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {business.top_reviews.map((review, i) => (
                <div key={i} className="rounded-lg bg-muted/50 p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "h-3 w-3",
                          s <= review.stars ? "fill-warning text-warning" : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                  {review.text && (
                    <p className="text-[11px] text-muted-foreground line-clamp-3">{review.text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Distribution */}
        {business.reviews_distribution && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground">Distribuição de Avaliações</h4>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = (business.reviews_distribution as any)?.[String(star)] || 0;
              const total = business.reviews_count || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={star} className="flex items-center gap-2 text-[11px]">
                  <span className="w-3 text-muted-foreground">{star}</span>
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  <div className="flex-1 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="text-xs" asChild>
            <a href={business.maps_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3 w-3" />
              Ver no Google Maps
            </a>
          </Button>
          {business.website && (
            <Button variant="outline" size="sm" className="text-xs" asChild>
              <a href={business.website} target="_blank" rel="noopener noreferrer">
                <Globe className="mr-1.5 h-3 w-3" />
                Visitar Site
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
