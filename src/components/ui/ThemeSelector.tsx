import { useTheme, ThemeMode } from "@/contexts/ThemeContext";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES: { id: ThemeMode; name: string; description: string; dot: string }[] = [
  {
    id: "cafe-noturno",
    name: "Café Noturno",
    description: "Âmbar quente · Uso prolongado",
    dot: "#E8A84A",
  },
  {
    id: "pacifico",
    name: "Pacífico",
    description: "Verde natural · Ambientes claros",
    dot: "#0E8A5C",
  },
  {
    id: "cosmos",
    name: "Cosmos",
    description: "Azul profundo · Power user",
    dot: "#5B9EF7",
  },
];

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <div className="flex flex-col gap-1 px-2 py-1">
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, color: "#A09888", textTransform: "uppercase" as const }}>
          Aparência
        </span>
        <div className="flex gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.name}
              className="transition-all duration-200"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: t.dot,
                border: theme === t.id ? "2px solid rgba(255,255,255,0.6)" : "2px solid transparent",
                transform: theme === t.id ? "scale(1.15)" : "scale(1)",
                opacity: theme === t.id ? 1 : 0.5,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#FAFAF8",
      border: "1px solid #E8E5DF",
      borderRadius: 12,
      padding: 16,
    }}>
      {/* Title */}
      <p style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 2,
        color: "#A09888",
        textTransform: "uppercase" as const,
        marginBottom: 12,
      }}>
        Aparência
      </p>

      {/* Theme options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {THEMES.map((t) => {
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="transition-all duration-200"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 10,
                border: isActive ? `1px solid ${t.dot}40` : "1px solid transparent",
                background: isActive ? `${t.dot}14` : "transparent",
                cursor: "pointer",
                width: "100%",
                textAlign: "left" as const,
              }}
            >
              {/* Color dot */}
              <div style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: t.dot,
                flexShrink: 0,
                boxShadow: isActive ? `0 0 8px ${t.dot}80` : "none",
              }} />

              {/* Name + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#2A2520" }}>
                    {t.name}
                  </span>
                  {isActive && <Check size={12} style={{ color: t.dot }} />}
                </div>
                <span style={{ fontSize: 11, fontWeight: 400, color: "#B0A494" }}>
                  {t.description}
                </span>
              </div>

              {/* Toggle switch */}
              <div
                className="transition-all duration-200"
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 999,
                  background: isActive ? t.dot : "#D8D2C8",
                  position: "relative" as const,
                  flexShrink: 0,
                }}
              >
                <div
                  className="transition-transform duration-200"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    position: "absolute" as const,
                    top: 2,
                    left: isActive ? 18 : 2,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
