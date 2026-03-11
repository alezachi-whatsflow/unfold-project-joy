import { Clock, Check, CheckCheck } from "lucide-react";

interface TickIconsProps {
  status?: "pending" | "sent" | "delivered" | "read";
}

export default function TickIcons({ status }: TickIconsProps) {
  if (!status) return null;
  const size = 14;
  switch (status) {
    case "pending":
      return <Clock size={12} style={{ color: "var(--wa-text-secondary)" }} className="tick-icon shrink-0" />;
    case "sent":
      return <Check size={size} style={{ color: "var(--wa-text-secondary)" }} className="tick-icon shrink-0" />;
    case "delivered":
      return <CheckCheck size={size} style={{ color: "var(--wa-text-secondary)" }} className="tick-icon shrink-0" />;
    case "read":
      return <CheckCheck size={size} style={{ color: "var(--wa-blue-read)" }} className="tick-icon shrink-0" />;
    default:
      return null;
  }
}
