import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface NexusKPICardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: "primary" | "default" | "success" | "warning" | "critical";
  size?: "sm" | "md";
}

const variantStyles = {
  primary: { accent: "var(--nexus-accent)", bg: "var(--nexus-accent-subtle)" },
  default: { accent: "var(--nexus-text-secondary)", bg: "rgba(148,163,184,0.06)" },
  success: { accent: "var(--nexus-accent)", bg: "var(--nexus-accent-subtle)" },
  warning: { accent: "var(--nexus-license-warning)", bg: "rgba(245,158,11,0.08)" },
  critical: { accent: "var(--nexus-license-critical)", bg: "rgba(239,68,68,0.08)" },
};

export function NexusKPICard({ label, value, icon: Icon, variant = "default", size = "md" }: NexusKPICardProps) {
  const style = variantStyles[variant];

  return (
    <div
      className={cn(
        "rounded-lg border transition-all duration-200",
        size === "sm" ? "p-3" : "p-4"
      )}
      style={{
        background: "var(--nexus-bg-card)",
        borderColor: "var(--nexus-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn("font-medium uppercase tracking-wider", size === "sm" ? "text-[9px]" : "text-[10px]")}
          style={{ color: "var(--nexus-text-muted)" }}
        >
          {label}
        </span>
        {Icon && (
          <div
            className="flex items-center justify-center rounded-md p-1.5"
            style={{ background: style.bg }}
          >
            <Icon size={size === "sm" ? 14 : 16} style={{ color: style.accent }} />
          </div>
        )}
      </div>
      <p
        className={cn("font-bold tracking-tight", size === "sm" ? "text-lg mt-1" : "text-2xl mt-2")}
        style={{ color: style.accent }}
      >
        {value}
      </p>
    </div>
  );
}
