import { useTheme, ThemeMode } from "@/contexts/ThemeContext";
import { Check } from "lucide-react";

const THEMES: { id: ThemeMode; name: string; description: string; dot: string }[] = [
  { id: "cafe-noturno", name: "Café Noturno", description: "Âmbar quente · Uso prolongado", dot: "#E8A84A" },
  { id: "pacifico",     name: "Pacífico",     description: "Verde natural · Ambientes claros", dot: "#0E8A5C" },
  { id: "cosmos",       name: "Cosmos",        description: "Azul profundo · Power user",      dot: "#5B9EF7" },
];

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 8px" }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, color: "var(--text-muted, #A09888)", textTransform: "uppercase" }}>
          Aparência
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.name}
              style={{
                width: 20, height: 20, borderRadius: "50%", background: t.dot, border: "none", cursor: "pointer",
                outline: theme === t.id ? `2px solid ${t.dot}` : "none", outlineOffset: 2,
                opacity: theme === t.id ? 1 : 0.5,
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--bg-card, #FAFAF8)",
      border: "1px solid var(--border, #E8E5DF)",
      borderRadius: 12,
      padding: 16,
      minWidth: 260,
    }}>
      {/* Title */}
      <p style={{
        fontSize: 10, fontWeight: 600, letterSpacing: 2, marginBottom: 12, marginTop: 0,
        color: "var(--text-muted, #A09888)",
        textTransform: "uppercase",
      }}>
        Aparência
      </p>

      {/* Theme options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {THEMES.map((t) => {
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 10,
                border: isActive ? `1px solid ${t.dot}40` : "1px solid transparent",
                background: isActive ? `${t.dot}14` : "transparent",
                cursor: "pointer", width: "100%", textAlign: "left",
                transition: "all 0.2s ease",
              }}
            >
              {/* Dot */}
              <div style={{
                width: 10, height: 10, borderRadius: "50%", background: t.dot, flexShrink: 0,
                boxShadow: isActive ? `0 0 8px ${t.dot}80` : "none",
              }} />

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #2A2520)" }}>
                    {t.name}
                  </span>
                  {isActive && <Check size={12} style={{ color: t.dot }} />}
                </div>
                <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted, #B0A494)", display: "block" }}>
                  {t.description}
                </span>
              </div>

              {/* Toggle */}
              <div style={{
                width: 36, height: 20, borderRadius: 999, flexShrink: 0, position: "relative",
                background: isActive ? t.dot : "var(--border, #D8D2C8)",
                transition: "background 0.2s ease",
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", background: "#FFF",
                  position: "absolute", top: 2, left: isActive ? 18 : 2,
                  transition: "left 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
