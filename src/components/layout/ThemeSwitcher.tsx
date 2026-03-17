import { Palette } from "lucide-react";
import { useTheme, ThemeMode } from "@/contexts/ThemeContext";
import { ThemeSelector } from "@/components/ui/ThemeSelector";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ThemeSwitcher() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          title="Aparência"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{
            background: 'var(--accent-primary-bg, hsl(var(--primary) / 0.12))',
            border: '1px solid var(--border-card, hsl(var(--border)))',
            color: 'var(--accent-primary, hsl(var(--primary)))',
          }}
        >
          <Palette className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="p-0 border-none bg-transparent shadow-lg"
        style={{ boxShadow: 'var(--shadow-float, 0 8px 32px rgba(0,0,0,0.4))' }}
      >
        <ThemeSelector />
      </PopoverContent>
    </Popover>
  );
}
