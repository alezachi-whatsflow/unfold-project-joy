import { Moon, Sun, Palette } from "lucide-react";
import { useTheme, ThemeMode } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const themes: { mode: ThemeMode; icon: typeof Moon; label: string }[] = [
  { mode: "dark", icon: Moon, label: "Escuro" },
  { mode: "light", icon: Sun, label: "Claro" },
  { mode: "vibrant", icon: Palette, label: "Vibrante" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
      {themes.map(({ mode, icon: Icon, label }) => (
        <Tooltip key={mode} delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setTheme(mode)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-200",
                theme === mode
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
