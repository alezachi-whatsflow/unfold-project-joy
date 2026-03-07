export interface InstallmentRate {
  installment: number; // 1, 2, 3...
  percent: number;     // e.g. 23
  type: "split_direto" | "recorrente";
}

export interface CommissionRule {
  id: string;
  tenant_id: string;
  name: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  rule_type: "installment_based" | "fixed_percent" | "fixed_value";
  installment_rates: InstallmentRate[];
  recurring_rate_min: number;
  recurring_rate_max: number;
  recurring_start_installment: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionClosingEntry {
  salesperson_name: string;
  salesperson_email: string;
  product_name: string;
  installment_number: number;
  payment_value: number;
  commission_percent: number;
  commission_value: number;
  type: "split_direto" | "recorrente";
  status: "PENDING" | "PAID";
  date: string;
}
