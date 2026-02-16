export type Periodicity = "monthly" | "quarterly" | "semi-annual" | "annual";

export interface RevenueData {
  mrr: number;
  newMRR: number;
  expansionMRR: number;
  churnedMRR: number;
  otherRevenue: number;
}

/** Cost blocks matching accounting structure */
export interface CostBlocks {
  /** CSP — Custo de Prestação do Serviço (Cost of Revenue / COGS) */
  csp: number;
  /** MKT — Marketing / Aquisição */
  mkt: number;
  /** SAL — Salários / Pessoal */
  sal: number;
  /** G&A — General & Administrative */
  ga: number;
  /** FIN — Financeiro (tarifas, juros, IOF) */
  fin: number;
  /** TAX — Impostos (ISS, PIS/COFINS, IRPJ/CSLL) */
  tax: number;
  /** REV- — Deduções de Receita (estornos, reembolsos) */
  revDeductions: number;
}

export interface CustomerData {
  totalCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
}

export interface FinancialEntry {
  id: string;
  month: string; // YYYY-MM
  revenue: RevenueData;
  costs: CostBlocks;
  customers: CustomerData;
  cashBalance: number;
}

export interface SaaSMetrics {
  mrr: number;
  arr: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  revenueChurnRate: number;
  logoChurnRate: number;
  grossMargin: number;
  netMargin: number;
  ebitda: number;
  burnRate: number;
  runway: number;
  grossProfit: number;
  netProfit: number;
  totalRevenue: number;
  totalCosts: number;
}

/** Labels for each cost block */
export const COST_BLOCK_LABELS: Record<keyof CostBlocks, string> = {
  csp: "CSP — Custo de Serviço",
  mkt: "MKT — Marketing",
  sal: "SAL — Salários / Pessoal",
  ga: "G&A — Administrativo",
  fin: "FIN — Financeiro",
  tax: "TAX — Impostos",
  revDeductions: "REV- — Deduções de Receita",
};
