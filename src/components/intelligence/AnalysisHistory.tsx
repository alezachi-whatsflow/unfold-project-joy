import { Clock, Globe, Instagram, Linkedin, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WebScrap, ProfileAnalysis, BusinessLead, SourceType } from "@/types/intelligence";

const SOURCE_ICONS: Record<SourceType, React.ElementType> = {
  website: Globe,
  instagram: Instagram,
  linkedin: Linkedin,
  google_maps: MapPin,
};

interface AnalysisHistoryProps {
  webScraps: WebScrap[];
  profiles: ProfileAnalysis[];
  leads: BusinessLead[];
}

export function AnalysisHistory({ webScraps, profiles, leads }: AnalysisHistoryProps) {
  const allItems = [
    ...webScraps.map((s) => ({ id: s.id, label: s.title || s.url, source: "website" as SourceType, date: s.scraped_at, status: s.status })),
    ...profiles.map((p) => ({ id: p.id, label: p.display_name || p.username, source: p.source, date: p.analyzed_at, status: p.status })),
    ...leads.map((l) => ({ id: l.id, label: l.name, source: "google_maps" as SourceType, date: l.scraped_at, status: l.status })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allItems.length === 0) return null;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Histórico ({allItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {allItems.slice(0, 10).map((item) => {
            const Icon = SOURCE_ICONS[item.source];
            return (
              <div key={item.id} className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">{item.label}</span>
                <Badge
                  variant={item.status === "completed" ? "default" : item.status === "error" ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {item.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
