interface ResourceUsageBarProps {
  used: number;
  total: number;
  label: string;
}

export function ResourceUsageBar({ used, total, label }: ResourceUsageBarProps) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const color =
    pct >= 95 ? "var(--nexus-license-critical)" :
    pct >= 80 ? "var(--nexus-license-warning)" :
    "var(--nexus-accent)";

  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span style={{ color: "var(--nexus-text-secondary)" }}>{label}</span>
        <span style={{ color }}>{used}/{total}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 4 }}>
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: color,
            borderRadius: 4,
            height: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
