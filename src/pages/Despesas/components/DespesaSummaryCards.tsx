import { DollarSign, Clock, CheckCircle, Bot } from "lucide-react";

interface SummaryData {
  total: number;
  totalCount: number;
  pendente: number;
  pendenteCount: number;
  pago: number;
  pagoCount: number;
  iaCount: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function DespesaSummaryCards({ data }: { data: SummaryData }) {
  const cards = [
    { label: "Total do período", value: fmt(data.total), sub: `${data.totalCount} lançamentos`, color: "hsl(var(--primary))", icon: DollarSign },
    { label: "Pendente", value: fmt(data.pendente), sub: `${data.pendenteCount} despesas`, color: "#F59E0B", icon: Clock },
    { label: "Pago", value: fmt(data.pago), sub: `${data.pagoCount} despesas`, color: "#10B981", icon: CheckCircle },
    { label: "Extraído por IA", value: String(data.iaCount), sub: "Status: Pago automático", color: "#818CF8", icon: Bot },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border p-4 transition-all duration-200 hover:-translate-y-0.5"
          style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              {c.label}
            </span>
            <c.icon size={16} style={{ color: c.color }} />
          </div>
          <p className="text-xl font-bold" style={{ color: c.color }}>{c.value}</p>
          <p className="text-[11px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
