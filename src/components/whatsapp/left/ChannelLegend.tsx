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

export default function ChannelLegend() {
  return (
    <div className="px-3 py-2 flex flex-wrap gap-x-3 gap-y-1 border-b border-border bg-muted/50">
      {CHANNELS.map((ch) => (
        <div key={ch} className="flex items-center gap-1">
          <div className="w-[14px] h-[14px] flex items-center justify-center" style={{ transform: "scale(0.7)", transformOrigin: "center" }}>
            <ChannelIcon channel={ch} size="sm" variant="badge" />
          </div>
          <span className="text-[10px] text-muted-foreground leading-none">{getChannelLabel(ch)}</span>
        </div>
      ))}
    </div>
  );
}
