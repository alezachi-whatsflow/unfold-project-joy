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

interface Props {
  activeChannel?: ChannelType | null;
  onChannelFilter?: (channel: ChannelType | null) => void;
}

export default function ChannelLegend({ activeChannel, onChannelFilter }: Props) {
  return (
    <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-border bg-muted/50 overflow-x-auto scrollbar-none">
      {CHANNELS.map((ch) => {
        const isActive = activeChannel === ch;
        return (
          <button
            key={ch}
            onClick={() => onChannelFilter?.(isActive ? null : ch)}
            className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full transition-colors ${
              isActive
                ? "bg-primary/20 ring-1 ring-primary/40"
                : activeChannel && !isActive
                  ? "opacity-40"
                  : "hover:bg-muted"
            }`}
          >
            <div className="w-[14px] h-[14px] flex items-center justify-center" style={{ transform: "scale(0.7)", transformOrigin: "center" }}>
              <ChannelIcon channel={ch} size="sm" variant="badge" />
            </div>
            <span className="text-[9px] text-muted-foreground leading-none whitespace-nowrap">{SHORT_LABELS[ch] || getChannelLabel(ch)}</span>
          </button>
        );
      })}
    </div>
  );
}
