import { ChannelIcon, getChannelLabel } from "@/components/ui/ChannelIcon";
import type { ChannelType } from "@/components/ui/ChannelIcon";

const CHANNELS: ChannelType[] = [
  "whatsapp_web",
  "whatsapp_meta",
  "instagram",
  "facebook",
  "telegram",
  "webchat",
  "mercadolivre",
];

const SHORT_LABELS: Record<string, string> = {
  whatsapp_web: "WA Web",
  whatsapp_meta: "Cloud API",
  instagram: "IG",
  facebook: "FB",
  telegram: "TG",
  webchat: "Chat",
  mercadolivre: "ML",
};

export default function ChannelLegend() {
  return (
    <div className="px-3 py-1.5 flex items-center gap-2 border-b border-border bg-muted/50 overflow-x-auto scrollbar-none">
      {CHANNELS.map((ch) => (
        <div key={ch} className="flex items-center gap-1 shrink-0">
          <div className="w-[14px] h-[14px] flex items-center justify-center" style={{ transform: "scale(0.7)", transformOrigin: "center" }}>
            <ChannelIcon channel={ch} size="sm" variant="badge" />
          </div>
          <span className="text-[9px] text-muted-foreground leading-none whitespace-nowrap">{SHORT_LABELS[ch] || getChannelLabel(ch)}</span>
        </div>
      ))}
    </div>
  );
}
