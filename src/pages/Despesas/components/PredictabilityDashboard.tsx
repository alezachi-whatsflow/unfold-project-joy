import { useMemo } from "react";
import {
  AlertTriangle, TrendingUp, Calendar, DollarSign,
  ArrowRight, Shield, Flame, Zap,
} from "lucide-react";
import type { PredictabilityData } from "@/types/expenses";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtK = (v: number) => {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return fmt(v);
};

const RISK_CONFIG = {
  low: { color: "#10B981", bg: "rgba(16,185,129,0.08)", icon: Shield, label: "Saudável" },
  medium: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", icon: AlertTriangle, label: "Atenção" },
  high: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", icon: Flame, label: "Risco Alto" },
};

interface Props {
  data: PredictabilityData;
}

export function PredictabilityDashboard({ data }: Props) {
  const risk = RISK_CONFIG[data.riskLevel];
  const RiskIcon = risk.icon;

  // Find the highest projected month for heatmap scaling
  const maxProjected = useMemo(
    () => Math.max(...data.monthlyProjections.map((p) => p.totalProjected), 1),
    [data.monthlyProjections]
  );

  // Bar chart max height
  const BAR_MAX = 120;

  return (
    <div className="space-y-4">
      {/* ── Row 1: Immediate + Risk + Annual ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Previsibilidade Imediata */}
        <div
          className="rounded-lg border p-4 transition-all duration-200 hover:-translate-y-0.5"
          style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              Próximos 30 dias
            </span>
            <Calendar size={14} style={{ color: "#818CF8" }} />
          </div>
          <p className="text-lg font-bold" style={{ color: "#818CF8" }}>
            {fmt(data.immediate.totalPending)}
          </p>
          <p className="text-[11px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            {data.immediate.pendingCount} despesas pendentes
          </p>
          {data.immediate.upcomingRecurring > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <ArrowRight size={10} style={{ color: "hsl(var(--muted-foreground))" }} />
              <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                + {fmt(data.immediate.upcomingRecurring)} recorrentes ({data.immediate.upcomingRecurringCount})
              </span>
            </div>
          )}
        </div>

        {/* Risk Level */}
        <div
          className="rounded-lg border p-4 transition-all duration-200 hover:-translate-y-0.5"
          style={{ background: risk.bg, borderColor: `${risk.color}30` }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              Saúde Financeira
            </span>
            <RiskIcon size={14} style={{ color: risk.color }} />
          </div>
          <p className="text-lg font-bold" style={{ color: risk.color }}>{risk.label}</p>
          <p className="text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Baseado na proporção pendente/pago
          </p>
          {data.avgPessoalMonthly > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Zap size={10} style={{ color: risk.color }} />
              <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                Folha média: {fmt(data.avgPessoalMonthly)}/mês
              </span>
            </div>
          )}
        </div>

        {/* Annual Projection */}
        <div
          className="rounded-lg border p-4 transition-all duration-200 hover:-translate-y-0.5"
          style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              Projeção Anual
            </span>
            <TrendingUp size={14} style={{ color: "#10B981" }} />
          </div>
          <p className="text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>
            {fmt(data.annualProjectedTotal)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Inclui provisionamento 13º e férias
          </p>
          {data.avgPessoalMonthly > 0 && (
            <div className="mt-2 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>13º provisionado</span>
                <span className="text-[10px] font-medium" style={{ color: "#F59E0B" }}>
                  {fmt(data.avgPessoalMonthly)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Férias provisionadas</span>
                <span className="text-[10px] font-medium" style={{ color: "#F59E0B" }}>
                  {fmt(data.avgPessoalMonthly * 0.3333)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Stacked bar chart — 12-month projection ── */}
      <div
        className="rounded-lg border p-4"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Motor de Previsibilidade
            </h3>
            <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              Projeção 12 meses — o que é real vs. inteligência IAZIS
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Legend color="#3B82F6" label="Dado Real" />
            <Legend color="#818CF8" label="Recorrente (proj.)" />
            <Legend color="#F59E0B" label="13º + Férias (inferido)" />
          </div>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-1.5" style={{ height: BAR_MAX + 40 }}>
          {data.monthlyProjections.map((mp) => {
            const realH = maxProjected > 0 ? (mp.realValue / maxProjected) * BAR_MAX : 0;
            const recurH = maxProjected > 0 ? (mp.projectedRecurring / maxProjected) * BAR_MAX : 0;
            const provH = maxProjected > 0 ? ((mp.provision13th + mp.provisionVacation) / maxProjected) * BAR_MAX : 0;

            return (
              <div key={mp.period} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                {/* Tooltip on hover */}
                <div
                  className="absolute bottom-full mb-1 hidden group-hover:block z-10 px-2 py-1.5 rounded-md text-[10px] whitespace-nowrap pointer-events-none"
                  style={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                >
                  <strong>{mp.label}</strong>
                  <br />Real: {fmt(mp.realValue)}
                  {mp.projectedRecurring > 0 && <><br />Recorrente: {fmt(mp.projectedRecurring)}</>}
                  {mp.provision13th > 0 && <><br />13º: {fmt(mp.provision13th)}</>}
                  {mp.provisionVacation > 0 && <><br />Férias: {fmt(mp.provisionVacation)}</>}
                  <br /><strong>Total: {fmt(mp.totalProjected)}</strong>
                </div>

                {/* Stacked bars */}
                <div className="w-full flex flex-col items-stretch gap-px">
                  {/* Provision (top) */}
                  {provH > 0 && (
                    <div
                      className="w-full rounded-t transition-all duration-300"
                      style={{
                        height: Math.max(provH, 2),
                        background: "#F59E0B",
                        opacity: mp.isProjection ? 0.5 : 0.3,
                      }}
                    />
                  )}
                  {/* Recurring (mid) */}
                  {recurH > 0 && (
                    <div
                      className="w-full transition-all duration-300"
                      style={{
                        height: Math.max(recurH, 2),
                        background: "#818CF8",
                        opacity: 0.6,
                      }}
                    />
                  )}
                  {/* Real (bottom) */}
                  <div
                    className="w-full rounded-b transition-all duration-300"
                    style={{
                      height: Math.max(realH, 2),
                      background: mp.isProjection ? "rgba(59,130,246,0.25)" : "#3B82F6",
                      borderLeft: mp.isProjection ? "2px dashed rgba(59,130,246,0.4)" : "none",
                    }}
                  />
                </div>

                {/* Month label */}
                <span
                  className="text-[9px] font-medium mt-1"
                  style={{
                    color: mp.isProjection ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                    opacity: mp.isProjection ? 0.6 : 1,
                  }}
                >
                  {mp.label}
                </span>

                {/* Value below */}
                <span className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {fmtK(mp.totalProjected)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Projection disclaimer */}
        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}>
          <DollarSign size={12} style={{ color: "#818CF8" }} />
          <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            Barras tracejadas = projeção inteligente IAZIS. 13º e férias calculados automaticamente com base na categoria "Pessoal" recorrente.
          </span>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
    </div>
  );
}
