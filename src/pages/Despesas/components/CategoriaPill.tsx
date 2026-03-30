const CAT_CONFIG: Record<string, { bg: string; color: string }> = {
  Transporte: { bg: "rgba(245,158,11,.15)", color: "#F59E0B" },
  "Escritório": { bg: "rgba(79,90,227,.15)", color: "#4F5AE3" },
  Tecnologia: { bg: "rgba(57,247,178,.15)", color: "#2dd4a0" },
  Telecom: { bg: "rgba(56,189,248,.15)", color: "#38BDF8" },
  "Alimentação": { bg: "rgba(239,68,68,.15)", color: "#EF4444" },
  Outros: { bg: "rgba(138,154,176,.15)", color: "hsl(var(--muted-foreground))" },
};

export function CategoriaPill({ categoria }: { categoria: string }) {
  const cfg = CAT_CONFIG[categoria] ?? CAT_CONFIG.Outros;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {categoria}
    </span>
  );
}
