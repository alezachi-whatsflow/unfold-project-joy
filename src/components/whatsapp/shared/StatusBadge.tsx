import React from "react";

interface StatusBadgeProps {
  status: "open" | "pending" | "resolved" | "transferred";
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: "Aberto", bg: "rgba(0,168,132,0.2)", text: "#00A884" },
  pending: { label: "Pendente", bg: "rgba(245,158,11,0.2)", text: "#FBBF24" },
  resolved: { label: "Resolvido", bg: "rgba(100,116,139,0.2)", text: "#94A3B8" },
  transferred: { label: "Transferido", bg: "rgba(239,68,68,0.2)", text: "#F87171" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const c = statusConfig[status] || statusConfig.open;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}
