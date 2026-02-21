import { Globe, Mail, Phone, Tag, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WebScrap } from "@/types/intelligence";

interface WebAnalysisCardProps {
  scrap: WebScrap;
}

export function WebAnalysisCard({ scrap }: WebAnalysisCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4 text-accent" />
          {scrap.title || scrap.url}
        </CardTitle>
        <p className="text-xs text-muted-foreground truncate">{scrap.url}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        {scrap.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Meta Description</p>
            <p className="text-sm text-foreground">{scrap.description}</p>
          </div>
        )}

        {/* Value Proposition */}
        {scrap.value_proposition && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
            <p className="text-xs font-medium text-primary mb-1">Proposta de Valor</p>
            <p className="text-sm text-foreground">{scrap.value_proposition}</p>
          </div>
        )}

        {/* Niche */}
        {scrap.niche && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Nicho Identificado</p>
            <Badge variant="secondary" className="text-xs">{scrap.niche}</Badge>
          </div>
        )}

        {/* Technologies */}
        {scrap.technologies && scrap.technologies.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Tecnologias Detectadas
            </p>
            <div className="flex flex-wrap gap-1">
              {scrap.technologies.map((tech) => (
                <Badge key={tech} variant="outline" className="text-[10px]">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Keywords */}
        {scrap.keywords && scrap.keywords.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Keywords
            </p>
            <div className="flex flex-wrap gap-1">
              {scrap.keywords.map((kw) => (
                <Badge key={kw} variant="outline" className="text-[10px]">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {scrap.contact_email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> {scrap.contact_email}
            </span>
          )}
          {scrap.contact_phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {scrap.contact_phone}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
