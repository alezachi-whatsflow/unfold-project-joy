import { FinancialEntry, SaaSMetrics } from "@/types/financial";

export function calculateMetrics(
  entry: FinancialEntry,
  previousEntry?: FinancialEntry
): SaaSMetrics {
  // Revenue (deductions reduce gross revenue)
  const grossRevenue = entry.revenue.mrr + entry.revenue.otherRevenue;
  const totalRevenue = grossRevenue - entry.costs.revDeductions;

  // COGS = CSP (cost of service provision)
  const cogs = entry.costs.csp;
  const grossProfit = totalRevenue - cogs;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Operating Expenses = MKT + SAL + G&A + FIN
  const totalOpEx =
    entry.costs.mkt +
    entry.costs.sal +
    entry.costs.ga +
    entry.costs.fin;

  const totalCosts = cogs + totalOpEx + entry.costs.tax;

  const netProfit = totalRevenue - totalCosts;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // EBITDA (simplified: earnings before taxes)
  const ebitda = netProfit + entry.costs.tax;

  const mrr = entry.revenue.mrr;
  const arr = mrr * 12;

  // CAC = Marketing / New Customers
  const cac =
    entry.customers.newCustomers > 0
      ? entry.costs.mkt / entry.customers.newCustomers
      : 0;

  // Revenue Churn Rate
  const previousMRR = previousEntry?.revenue.mrr || entry.revenue.mrr;
  const revenueChurnRate =
    previousMRR > 0 ? (entry.revenue.churnedMRR / previousMRR) * 100 : 0;

  // Logo Churn Rate
  const previousCustomers =
    previousEntry?.customers.totalCustomers ||
    entry.customers.totalCustomers;
  const logoChurnRate =
    previousCustomers > 0
      ? (entry.customers.churnedCustomers / previousCustomers) * 100
      : 0;

  // LTV = ARPU / Monthly Churn Rate
  const arpu =
    entry.customers.totalCustomers > 0
      ? mrr / entry.customers.totalCustomers
      : 0;
  const monthlyChurnRate = revenueChurnRate / 100;
  const ltv =
    monthlyChurnRate > 0 ? arpu / monthlyChurnRate : arpu * 24;

  const ltvCacRatio = cac > 0 ? ltv / cac : 0;

  // Burn Rate & Runway
  const burnRate = Math.max(0, totalCosts - totalRevenue);
  const runway = burnRate > 0 ? entry.cashBalance / burnRate : 999;

  return {
    mrr,
    arr,
    cac,
    ltv,
    ltvCacRatio,
    revenueChurnRate,
    logoChurnRate,
    grossMargin,
    netMargin,
    ebitda,
    burnRate,
    runway: Math.min(runway, 999),
    grossProfit,
    netProfit,
    totalRevenue,
    totalCosts,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

export function getMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[parseInt(m) - 1]}/${year.slice(2)}`;
}

export function getMonthFullLabel(month: string): string {
  const [year, m] = month.split("-");
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[parseInt(m) - 1]} ${year}`;
}

export function getTrendPercent(
  current: number,
  previous: number | undefined
): number {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}
