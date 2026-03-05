import { MapPin, Star, Phone, Globe, Clock, Image, MessageSquare, ExternalLink, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function calculateGMNScore(rating: number | null, reviewsCount: number | null): number {
  let score = 0;
  // Rating contributes up to 5 points (mapped 1-5 → 0-5)
  if (rating !== null) {
    score += Math.min((rating / 5) * 5, 5);
  }
  // Reviews count contributes up to 3 points
  if (reviewsCount !== null) {
    if (reviewsCount >= 100) score += 3;
    else if (reviewsCount >= 30) score += 2;
    else if (reviewsCount >= 10) score += 1.5;
    else if (reviewsCount >= 1) score += 0.5;
  }
  // Bonus for having rich data (up to 2 points)
  score += 2; // baseline for having a listing
  return Math.min(Math.round(score * 10) / 10, 10);
}

export function GoogleBusinessCard({ business }: GoogleBusinessCardProps) {
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
          {business.photos_count > 0 && (
            <div className="flex items-center gap-2">
              <Image className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-foreground">{business.photos_count} fotos</span>
            </div>
          )}
        </div>

        {/* Description */}
        {business.description && (
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{business.description}</p>
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
