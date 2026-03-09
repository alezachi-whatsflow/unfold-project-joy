import { Globe, Phone, ExternalLink, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProspectLead } from "../ProspeccaoTab";

interface Props {
  lead: ProspectLead;
}

type ScoreCategory = "hot" | "medium" | "low";

function getCategory(score: number): ScoreCategory {
  if (score >= 8) return "hot";
  if (score >= 5) return "medium";
  return "low";
}

const scoreMeta: Record<ScoreCategory, { label: string; color: string; bg: string }> = {
  hot: { label: "🔥 Oportunidade Quente", color: "text-green-400", bg: "bg-green-500/20 text-green-400 border-green-500/30" },
  medium: { label: "Potencial Médio", color: "text-yellow-400", bg: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  low: { label: "Baixa Prioridade", color: "text-muted-foreground", bg: "bg-muted text-muted-foreground" },
};

export function LeadCard({ lead }: Props) {
  const cat = getCategory(lead.score);
  const meta = scoreMeta[cat];

  return (
    <Card className="relative">
      <div className="absolute top-3 right-3">
        <Badge className={meta.bg}>{lead.score}/10</Badge>
      </div>
      <CardContent className="pt-5 space-y-3">
        <div className="pr-16">
          <p className="font-medium text-sm truncate">{lead.name}</p>
          {lead.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{lead.description}</p>
          )}
        </div>

        {lead.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3 w-3" /> {lead.phone}
          </p>
        )}

        <div className="flex gap-3 pt-1 border-t border-border items-center">
          <span className={lead.hasSite ? "text-primary" : "text-muted-foreground/40"}>
            <Globe className="h-4 w-4" />
          </span>
          <span className={lead.hasPhone ? "text-primary" : "text-muted-foreground/40"}>
            <Phone className="h-4 w-4" />
          </span>
        </div>

        <div className="pt-2 border-t border-border space-y-2">
          <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>
          {lead.url && (
            <Button size="sm" variant="outline" className="w-full gap-1 text-xs" asChild>
              <a href={lead.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" /> Visitar Site
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
