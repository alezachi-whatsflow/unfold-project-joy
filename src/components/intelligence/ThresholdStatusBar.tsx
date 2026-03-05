import { Globe, Instagram, MapPin, Shield, ShieldCheck, MessageCircle, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChannelThreshold } from "@/types/rescuePlan";
import { getStatusColor, getStatusBgColor } from "@/lib/thresholdScoring";
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

export function ThresholdStatusBar({ overall, website, instagram, gmn, meta, whatsapp, neuro }: ThresholdStatusBarProps) {
  const channels = [
    { label: "Website", icon: Globe, threshold: website },
    { label: "Instagram", icon: Instagram, threshold: instagram },
    { label: "Perfil Empresa", icon: MapPin, threshold: gmn },
    { label: "Meta", icon: ShieldCheck, threshold: meta ?? null },
    { label: "WhatsApp", icon: MessageCircle, threshold: whatsapp ?? null },
    { label: "Neuro", icon: Brain, threshold: neuro ?? null },
  ].filter((c) => c.threshold !== null);

  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-4 pb-3">
        <div className={cn("rounded-lg border p-3 mb-3", getStatusBgColor(overall.status))}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-semibold">{overall.label}</span>
            </div>
            <span className={cn("font-display text-lg font-bold", getStatusColor(overall.status))}>
              {overall.score.toFixed(1)}/10
            </span>
          </div>
        </div>
        <div className={cn("grid gap-2", channels.length > 3 ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-3")}>
          {channels.map(({ label, icon: Icon, threshold }) => (
            <div key={label} className="flex flex-col items-center gap-1 rounded-lg bg-secondary/50 p-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={cn("font-display text-sm font-bold", getStatusColor(threshold!.status))}>
                {threshold!.score.toFixed(1)}
              </span>
              <Badge variant="outline" className={cn("text-[9px]", getStatusColor(threshold!.status))}>
                {label}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
