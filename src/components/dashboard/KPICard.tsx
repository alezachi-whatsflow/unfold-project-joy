import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  accentColor?: "primary" | "accent" | "warning" | "destructive";
  description?: string;
  delay?: number;
}

const accentMap = {
  primary: "bg-primary",
  accent: "bg-accent",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  accentColor = "primary",
  description,
  delay = 0,
}: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Accent bar */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
          accentMap[accentColor]
        )}
      />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="font-display text-2xl font-bold tracking-tight text-card-foreground">
        {value}
      </div>

      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {isPositive && (
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          )}
          {isNegative && (
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          )}
          <span
            className={cn(
              "font-medium",
              isPositive && "text-success",
              isNegative && "text-destructive",
              !isPositive && !isNegative && "text-muted-foreground"
            )}
          >
            {isPositive ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs mês anterior</span>
        </div>
      )}

      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
