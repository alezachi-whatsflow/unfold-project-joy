import { useTheme, ThemeMode } from "@/contexts/ThemeContext";

const THEMES: { id: ThemeMode; name: string; description: string; dot: string; accent: string }[] = [
  {
    id: 'sapphire',
    name: 'Deep Sapphire',
    description: 'Azul profundo — estilo CarPlay',
    dot: '#4A9EFF',
    accent: '#11BC76',
  },
  {
    id: 'slate',
    name: 'Midnight Slate',
    description: 'Ardósia quente — máximo conforto',
    dot: '#F59E0B',
    accent: '#10B981',
  },
  {
    id: 'forest',
    name: 'Obsidian Forest',
    description: 'Verde esmeralda — identidade Whatsflow',
    dot: '#39F7B2',
    accent: '#11BC76',
  },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-1.5 p-3 bg-card border border-border rounded-xl min-w-[210px]">
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">
        Aparência
      </p>
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all w-full text-left"
          style={{
            border: theme === t.id
              ? `1.5px solid ${t.accent}`
              : '1.5px solid transparent',
            background: theme === t.id
              ? 'hsl(var(--accent) / 0.08)' : 'transparent',
          }}
        >
          <div
            className="shrink-0 rounded-full"
            style={{
              width: 18, height: 18,
              background: t.dot,
              border: '2px solid hsl(var(--border))',
            }}
          />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">{t.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{t.description}</p>
          </div>
          {theme === t.id && (
            <div
              className="ml-auto shrink-0 rounded-full"
              style={{ width: 8, height: 8, background: t.accent }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
