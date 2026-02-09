export interface FinancialEntryRow {
  id: string;
  month: string;
  mrr: number;
  new_mrr: number;
  expansion_mrr: number;
  churned_mrr: number;
  other_revenue: number;
  fixed_costs: number;
  variable_costs: number;
  infrastructure: number;
  marketing: number;
  taxes: number;
  payroll: number;
  benefits: number;
  contractors: number;
  total_customers: number;
  new_customers: number;
  churned_customers: number;
  cash_balance: number;
  created_at: string;
  updated_at: string;
}
