const ROLE_LABELS: Record<string, string> = {
  nexus_superadmin: "SuperAdmin",
  nexus_dev_senior: "Dev Senior",
  nexus_suporte_senior: "Suporte Senior",
  nexus_financeiro: "Financeiro",
  nexus_suporte_junior: "Suporte Junior",
  nexus_customer_success: "Customer Success",
};

const ROLE_STYLES: Record<string, { color: string; bg: string }> = {
  nexus_superadmin: { color: "var(--nexus-role-superadmin)", bg: "rgba(245,158,11,0.1)" },
  nexus_dev_senior: { color: "var(--nexus-role-dev)", bg: "rgba(167,139,250,0.1)" },
  nexus_suporte_senior: { color: "var(--nexus-role-support-sr)", bg: "rgba(96,165,250,0.1)" },
  nexus_financeiro: { color: "var(--nexus-role-finance)", bg: "rgba(20,184,166,0.1)" },
  nexus_suporte_junior: { color: "var(--nexus-role-support-jr)", bg: "rgba(56,189,248,0.1)" },
  nexus_customer_success: { color: "var(--nexus-role-cs)", bg: "rgba(244,114,182,0.1)" },
};

export function NexusRoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] ?? { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
  return (
    <span
      style={{
        color: style.color,
        background: style.bg,
        border: `0.5px solid ${style.color}33`,
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 7px",
        borderRadius: 10,
        display: "inline-block",
      }}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}
