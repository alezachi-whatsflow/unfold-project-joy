import { useMemo } from "react";
import type { Despesa, PredictabilityData, MonthProjection } from "@/types/expenses";

/**
 * Engine de previsibilidade financeira IAZIS.
 *
 * Calcula projeções a partir dos dados reais de despesas:
 * - Previsibilidade Imediata: pendentes nos próximos 30 dias
 * - Previsibilidade Futura: projeção 12 meses com provisionamento
 *   de 13º salário e férias inferidos da categoria "Pessoal"
 *
 * 13º: 1/12 da média mensal de "Pessoal" recorrente, acumulado mês a mês
 * Férias: ~33,3% da folha mensal (1/3 constitucional) dividido em 12
 */

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmtPeriod(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function fmtLabel(year: number, month: number) {
  return `${MONTHS_PT[month]}/${String(year).slice(2)}`;
}

export function useExpensePredictability(despesas: Despesa[]): PredictabilityData {
  return useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    /* ── 1. Previsibilidade Imediata (próximos 30 dias) ── */
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const pending = despesas.filter((d) => d.status === "pendente");
    const pendingNext30 = pending.filter((d) => {
      const dt = new Date(d.date + "T00:00:00");
      return dt >= now && dt <= in30Days;
    });

    // Recurring expenses expected in next 30 days
    const recurringMonthly = despesas.filter(
      (d) => d.is_recurring && d.recurrence_period === "monthly"
    );

    /* ── 2. Calcular média mensal da categoria "Pessoal" ── */
    const pessoalExpenses = despesas.filter(
      (d) => d.category === "Pessoal" && d.is_recurring
    );

    // Group by month to get average
    const pessoalByMonth = new Map<string, number>();
    for (const d of pessoalExpenses) {
      const dt = new Date(d.date + "T00:00:00");
      const key = fmtPeriod(dt.getFullYear(), dt.getMonth());
      pessoalByMonth.set(key, (pessoalByMonth.get(key) || 0) + d.value);
    }

    const pessoalMonthlyValues = Array.from(pessoalByMonth.values());
    const avgPessoalMonthly =
      pessoalMonthlyValues.length > 0
        ? pessoalMonthlyValues.reduce((a, b) => a + b, 0) / pessoalMonthlyValues.length
        : 0;

    // 13º: 1/12 of annual pessoal per month (provisioning)
    const provision13thMonthly = avgPessoalMonthly / 12;
    // Férias: 33.3% of monthly pessoal / 12 (spread equally)
    const provisionVacationMonthly = (avgPessoalMonthly * 0.3333) / 12;

    /* ── 3. Group real expenses by month ── */
    const realByMonth = new Map<string, number>();
    for (const d of despesas) {
      const dt = new Date(d.date + "T00:00:00");
      const key = fmtPeriod(dt.getFullYear(), dt.getMonth());
      realByMonth.set(key, (realByMonth.get(key) || 0) + d.value);
    }

    // Average monthly recurring (all categories)
    const recurringTotal = recurringMonthly.reduce((s, d) => s + d.value, 0);

    /* ── 4. Build 12-month projection ── */
    const projections: MonthProjection[] = [];

    for (let i = 0; i < 12; i++) {
      const m = (currentMonth + i) % 12;
      const y = currentYear + Math.floor((currentMonth + i) / 12);
      const period = fmtPeriod(y, m);
      const label = fmtLabel(y, m);
      const isPast = y < currentYear || (y === currentYear && m < currentMonth);
      const isCurrent = y === currentYear && m === currentMonth;

      const realValue = realByMonth.get(period) || 0;
      const isProjection = !isPast && !isCurrent;

      // For future months, project recurring expenses
      const projectedRecurring = isProjection ? recurringTotal : 0;

      projections.push({
        period,
        label,
        realValue,
        projectedRecurring,
        provision13th: provision13thMonthly,
        provisionVacation: provisionVacationMonthly,
        totalProjected: realValue + projectedRecurring + provision13thMonthly + provisionVacationMonthly,
        isProjection,
      });
    }

    const annualProjectedTotal = projections.reduce((s, p) => s + p.totalProjected, 0);

    /* ── 5. Risk level based on pending vs paid ratio ── */
    const pendingRatio = despesas.length > 0
      ? pending.length / despesas.length
      : 0;
    const riskLevel: "low" | "medium" | "high" =
      pendingRatio > 0.4 ? "high" : pendingRatio > 0.2 ? "medium" : "low";

    return {
      immediate: {
        totalPending: pendingNext30.reduce((s, d) => s + d.value, 0),
        pendingCount: pendingNext30.length,
        upcomingRecurring: recurringTotal,
        upcomingRecurringCount: recurringMonthly.length,
      },
      monthlyProjections: projections,
      avgPessoalMonthly,
      annualProjectedTotal,
      riskLevel,
    };
  }, [despesas]);
}
