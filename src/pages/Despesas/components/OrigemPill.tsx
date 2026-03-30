const ORIGEM_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  IA: { bg: "rgba(99,102,241,.18)", color: "#818CF8", label: "IA" },
  Manual: { bg: "rgba(138,154,176,.15)", color: "hsl(var(--muted-foreground))", label: "Manual" },
};

export function OrigemPill({ origem }: { origem: string }) {
  const cfg = ORIGEM_CONFIG[origem] ?? ORIGEM_CONFIG.Manual;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
