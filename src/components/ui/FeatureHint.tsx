import { HelpCircle } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeatureHintProps {
  title: string;
  description: string;
  side?: "top" | "bottom" | "left" | "right";
  size?: number;
}

/**
 * Contextual tooltip for new features — Neurodesign: 2 frases max.
 * Usage: <FeatureHint title="Playbooks" description="Agentes de IA que..." />
 */
export function FeatureHint({ title, description, side = "top", size = 14 }: FeatureHintProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button className="inline-flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors" aria-label={title}>
          <HelpCircle size={size} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[260px] text-left">
        <p className="text-xs font-semibold mb-0.5">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
