import { useTheme, ThemeMode } from "@/contexts/ThemeContext";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES: { id: ThemeMode; name: string; description: string; dot: string; badge: string; badgeClass: string }[] = [
  {
    id: "cafe-noturno",
    name: "Café Noturno",
    description: "Âmbar quente · Uso prolongado",
    dot: "#e8a84a",
    badge: "Oftalmológico",
    badgeClass: "bg-amber-900/40 text-amber-400 border border-amber-800/50",
  },
  {
    id: "pacifico",
    name: "Pacífico",
    description: "Verde natural · Ambientes claros",
    dot: "#0e8a5c",
    badge: "Diurno",
    badgeClass: "bg-emerald-900/30 text-emerald-400 border border-emerald-800/40",
  },
  {
    id: "cosmos",
    name: "Cosmos",
    description: "Azul profundo · Power user",
    dot: "#5b9ef7",
    badge: "Técnico",
    badgeClass: "bg-blue-900/30 text-blue-400 border border-blue-800/40",
  },
];

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <div className="flex flex-col gap-1 px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Aparência</span>
        <div className="flex gap-1.5">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.name}
              className={cn(
                "w-5 h-5 rounded-full border-2 transition-all duration-200",
                theme === t.id ? "scale-110 border-white/60" : "border-transparent opacity-50 hover:opacity-80"
              )}
              style={{ background: t.dot }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-3 bg-card border border-border rounded-xl min-w-[210px]">
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Aparência</p>
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all w-full text-left",
            theme === t.id ? "ring-1 ring-[var(--acc)]" : "opacity-70 hover:opacity-100"
          )}
          style={{
            background: theme === t.id ? "var(--acc-bg)" : "transparent",
            border: theme === t.id ? "1px solid var(--acc-border)" : "1px solid transparent",
          }}
        >
          <div
            className="shrink-0 rounded-full"
            style={{
              width: 14, height: 14, background: t.dot,
              boxShadow: theme === t.id ? `0 0 8px ${t.dot}80` : "none",
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium text-foreground">{t.name}</span>
              {theme === t.id && <Check size={11} className="text-[var(--acc)]" />}
            </div>
            <span className="text-[10px] text-muted-foreground">{t.description}</span>
          </div>
          <span className={cn("text-[8px] font-semibold px-1.5 py-0.5 rounded-full", t.badgeClass)}>
            {t.badge}
          </span>
        </button>
      ))}
    </div>
  );
}
