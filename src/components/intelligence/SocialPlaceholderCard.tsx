import { Instagram, Linkedin, MapPin, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SourceType } from "@/types/intelligence";

const PLACEHOLDERS: Record<Exclude<SourceType, "website">, { icon: React.ElementType; title: string; description: string }> = {
  instagram: {
    icon: Instagram,
    title: "Instagram Analysis",
    description: "Análise de autoridade, engajamento e estratégia de conteúdo. Requer integração com Apify ou ProxyCurl.",
  },
  linkedin: {
    icon: Linkedin,
    title: "LinkedIn Analysis",
    description: "Análise de perfil profissional, rede de contatos e posicionamento. Requer integração com ProxyCurl.",
  },
  google_maps: {
    icon: MapPin,
    title: "Google Maps Leads",
    description: "Extração de negócios locais, avaliações e dados de contato. Requer Google Places API ou Apify.",
  },
};

interface SocialPlaceholderCardProps {
  source: Exclude<SourceType, "website">;
}

export function SocialPlaceholderCard({ source }: SocialPlaceholderCardProps) {
  const info = PLACEHOLDERS[source];
  return (
    <Card className="border-border bg-card border-dashed opacity-60">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="relative mb-3">
          <info.icon className="h-10 w-10 text-muted-foreground" />
          <Lock className="absolute -bottom-1 -right-1 h-4 w-4 text-warning" />
        </div>
        <h3 className="font-display text-sm font-semibold text-foreground">{info.title}</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{info.description}</p>
      </CardContent>
    </Card>
  );
}
