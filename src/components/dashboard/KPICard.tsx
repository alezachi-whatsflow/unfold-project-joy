import { LucideIcon, TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  accentColor?: "primary" | "accent" | "warning" | "destructive";
  description?: string;
  tooltip?: string;
  delay?: number;
}

const accentBorders = {
  primary: "border-primary/20",
  accent: "border-accent/20",
  warning: "border-warning/20",
  destructive: "border-destructive/20",
};

const iconBg = {
  primary: "bg-primary/15 text-primary",
  accent: "bg-accent/15 text-accent",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
};

export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  accentColor = "primary",
  description,
  tooltip,
  delay = 0,
}: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div
      className={cn(
        "group relative border bg-card p-5 transition-all duration-300",
        "hover:-translate-y-1 hover:hover:shadow-primary/5",
        "opacity-0 animate-fade-in-up",
        accentBorders[accentColor]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Muted overlay */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden bg-muted opacity-30 pointer-events-none",
          accentBorders[accentColor]
        )}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-fluid-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
            {tooltip && (
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full transition-colors hover:bg-secondary"
                  >
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  sideOffset={8}
                  className="z-[100] max-w-[300px] border border-border bg-popover px-4 py-3 text-xs leading-relaxed text-popover-foreground"
                >
                  <p className="font-semibold text-foreground mb-1">{title}</p>
                  <p className="text-muted-foreground">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center transition-transform duration-300 group-hover:scale-110",
              iconBg[accentColor]
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="font-display text-fluid-2xl font-bold tracking-tight text-card-foreground">
          {value}
        </div>

        {change !== undefined && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {isPositive && (
              <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="font-medium text-success">
                  +{change.toFixed(1)}%
                </span>
              </div>
            )}
            {isNegative && (
              <div className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5">
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="font-medium text-destructive">
                  {change.toFixed(1)}%
                </span>
              </div>
            )}
            {!isPositive && !isNegative && change === 0 && (
              <span className="text-muted-foreground">0.0%</span>
            )}
            <span className="text-muted-foreground">vs mês anterior</span>
          </div>
        )}

        {description && (
          <p className="mt-1.5 text-[11px] text-muted-foreground/80">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
