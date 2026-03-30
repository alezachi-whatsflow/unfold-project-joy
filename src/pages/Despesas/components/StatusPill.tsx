import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  pendente: { bg: "rgba(245,158,11,.15)", color: "#F59E0B", label: "Pendente" },
  pago: { bg: "rgba(16,185,129,.15)", color: "#10B981", label: "Pago" },
  rejeitado: { bg: "rgba(239,68,68,.15)", color: "#EF4444", label: "Rejeitado" },
};

export function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
