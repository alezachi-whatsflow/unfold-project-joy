import { Clock, Check, CheckCheck } from "lucide-react";

interface TickIconsProps {
  status?: "pending" | "sent" | "delivered" | "read";
}

// Hardcoded WhatsApp blue — CSS variables can fail silently
const READ_BLUE = "#53BDEB";
const GRAY = "var(--wa-text-secondary, #8696A0)";

export default function TickIcons({ status }: TickIconsProps) {
  if (!status) return null;
  const size = 14;
  switch (status) {
    case "pending":
      return <Clock size={12} color={GRAY} className="tick-icon shrink-0" />;
    case "sent":
      return <Check size={size} color={GRAY} className="tick-icon shrink-0" />;
    case "delivered":
      return <CheckCheck size={size} color={GRAY} className="tick-icon shrink-0" />;
    case "read":
      return <CheckCheck size={size} color={READ_BLUE} className="tick-icon shrink-0" />;
    default:
      return null;
  }
}
