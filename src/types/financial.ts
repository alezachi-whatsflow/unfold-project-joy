export type Periodicity = "monthly" | "quarterly" | "semi-annual" | "annual";

export interface RevenueData {
  mrr: number;
  newMRR: number;
  expansionMRR: number;
  churnedMRR: number;
  otherRevenue: number;
}

export interface CostData {
  fixedCosts: number;
  variableCosts: number;
  infrastructure: number;
  marketing: number;
  taxes: number;
}

export interface PersonnelData {
  payroll: number;
  benefits: number;
  contractors: number;
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
  costs: CostData;
  personnel: PersonnelData;
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
