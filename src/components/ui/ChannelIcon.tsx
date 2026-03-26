import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ═══════════════════════════════════════════════════════════════
// ChannelIcon — Single source of truth for all channel icons
// ═══════════════════════════════════════════════════════════════

export type ChannelType =
  | "whatsapp_web"
  | "whatsapp_meta"
  | "instagram"
  | "facebook"
  | "telegram"
  | "webchat"
  | "mercadolivre";

interface ChannelIconProps {
  channel: ChannelType;
  size?: "sm" | "md" | "lg";
  variant?: "badge" | "icon" | "rounded";
  tooltip?: boolean;
  className?: string;
}

const SIZES = { sm: 20, md: 28, lg: 40 } as const;
const ICON_SCALES = { sm: 0.5, md: 0.6, lg: 0.65 } as const;

const CHANNEL_COLORS: Record<ChannelType, string> = {
  whatsapp_web: "#25D366",
  whatsapp_meta: "#0668E1",
  instagram: "#E1306C",
  facebook: "#1877F2",
  telegram: "#229ED9",
  webchat: "#11bc76",
  mercadolivre: "#FFE600",
};

const CHANNEL_LABELS: Record<ChannelType, string> = {
  whatsapp_web: "WhatsApp Web",
  whatsapp_meta: "Cloud API Meta",
  instagram: "Instagram",
  facebook: "Facebook",
  telegram: "Telegram",
  webchat: "Webchat",
  mercadolivre: "Mercado Livre",
};

export function getChannelLabel(channel: ChannelType): string {
  return CHANNEL_LABELS[channel] || channel;
}

export function getChannelColor(channel: ChannelType): string {
  return CHANNEL_COLORS[channel] || "#888888";
}

// ── SVG Icons per channel ──

function WhatsAppSVG({ color = "#FFFFFF" }: { color?: string }) {
  return (
    <path
      d="M22.3 19.7c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.29.3-.49.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.19-.57-.34z"
      fill={color}
    />
  );
}

function MetaSVG() {
  return (
    <path
      d="M6.9 12c0-1.8.7-3.4 1.6-4.4.7-.8 1.5-1.1 2.2-1.1 1 0 1.7.5 2.3 1.4l.5.8.5-.8c.6-.9 1.3-1.4 2.3-1.4.7 0 1.5.3 2.2 1.1.9 1 1.6 2.6 1.6 4.4 0 1.8-.7 3.4-1.6 4.4-.7.8-1.5 1.1-2.2 1.1-1 0-1.7-.5-2.3-1.4l-.5-.8-.5.8c-.6.9-1.3 1.4-2.3 1.4-.7 0-1.5-.3-2.2-1.1-.9-1-1.6-2.6-1.6-4.4z"
      fill="white"
      stroke="white"
      strokeWidth={0.5}
    />
  );
}

function InstagramSVG() {
  return (
    <>
      <rect x={4} y={4} width={16} height={16} rx={5} stroke="white" strokeWidth={1.8} fill="none" />
      <circle cx={12} cy={12} r={3.5} stroke="white" strokeWidth={1.8} fill="none" />
      <circle cx={17} cy={7} r={1.2} fill="white" />
    </>
  );
}

function FacebookSVG() {
  return (
    <path
      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
      fill="white"
    />
  );
}

function TelegramSVG() {
  return (
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.7 8.02c-.12.56-.46.7-.93.43l-2.57-1.9-1.24 1.19c-.14.14-.25.25-.51.25l.18-2.6 4.74-4.28c.21-.18-.04-.28-.32-.1L7.6 14.27l-2.52-.79c-.55-.17-.56-.55.12-.81l9.84-3.79c.46-.17.86.11.6.92z"
      fill="white"
    />
  );
}

function WebchatSVG() {
  return (
    <>
      <rect x={3} y={5} width={18} height={13} rx={3} stroke="white" strokeWidth={1.8} fill="none" />
      <circle cx={8} cy={11.5} r={2} fill="white" />
      <path d="M13 9.5h4M13 11.5h4M13 13.5h2" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
    </>
  );
}

function MercadoLivreSVG() {
  return (
    <>
      <path
        d="M12 3C7.03 3 3 6.13 3 10c0 2.05 1.1 3.89 2.87 5.22L5 19l3.87-1.55C9.86 17.8 10.9 18 12 18c4.97 0 9-3.13 9-7s-4.03-7-9-7z"
        fill="#3483FA"
      />
      <circle cx={9} cy={10} r={1.3} fill="white" />
      <circle cx={12} cy={10} r={1.3} fill="white" />
      <circle cx={15} cy={10} r={1.3} fill="white" />
    </>
  );
}

function renderSVGContent(channel: ChannelType) {
  switch (channel) {
    case "whatsapp_web":
      return <WhatsAppSVG color="#FFFFFF" />;
    case "whatsapp_meta":
      return <MetaSVG />;
    case "instagram":
      return <InstagramSVG />;
    case "facebook":
      return <FacebookSVG />;
    case "telegram":
      return <TelegramSVG />;
    case "webchat":
      return <WebchatSVG />;
    case "mercadolivre":
      return <MercadoLivreSVG />;
  }
}

function getViewBox(channel: ChannelType): string {
  if (channel === "whatsapp_web") return "0 0 34 34";
  return "0 0 24 24";
}

function getBackground(channel: ChannelType): string {
  if (channel === "instagram") return "linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4)";
  return CHANNEL_COLORS[channel];
}

// ── Main Component ──

export function ChannelIcon({ channel, size = "md", variant = "icon", tooltip = false, className }: ChannelIconProps) {
  const px = SIZES[size];
  const iconScale = ICON_SCALES[size];
  const iconPx = Math.round(px * iconScale);

  const borderRadius = variant === "icon" ? 10 : "50%";

  const containerStyle: React.CSSProperties = {
    width: px,
    height: px,
    minWidth: px,
    minHeight: px,
    borderRadius,
    background: getBackground(channel),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const content = (
    <div
      className={cn(
        variant === "badge" && "ring-2 ring-background",
        className
      )}
      style={containerStyle}
    >
      <svg
        viewBox={getViewBox(channel)}
        width={iconPx}
        height={iconPx}
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderSVGContent(channel)}
      </svg>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {getChannelLabel(channel)}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export default ChannelIcon;
