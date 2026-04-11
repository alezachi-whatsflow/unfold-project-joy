/**
 * Centralized types for the Expenses (Despesas) module.
 * Maps 1:1 to Supabase tables: asaas_expenses, expense_categories, suppliers.
 */

/* ── Database row types ── */

export interface ExpenseRow {
  id: string;
  tenant_id: string;
  description: string;
  category: string | null;
  category_id: string | null;
  supplier_id: string | null;
  value: number;
  date: string;               // YYYY-MM-DD
  is_recurring: boolean;
  recurrence_period: string | null;  // 'monthly' | 'weekly' | 'yearly'
  is_paid: boolean;
  attachment_url: string | null;
  attachment_type: string | null;    // 'image' | 'pdf'
  attachment_filename: string | null;
  attachment_size_bytes: number | null;
  origem: string;              // 'IA' | 'Manual'
  tags: string[];
  created_at: string;
}

export interface ExpenseCategoryRow {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  icon: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SupplierRow {
  id: string;
  tenant_id: string;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

/* ── Frontend view model (denormalized for UI) ── */

export interface Despesa {
  id: string;
  date: string;
  supplier: string;
  supplier_id: string | null;
  description: string;
  category: string;
  category_id: string | null;
  value: number;
  status: "pendente" | "pago" | "rejeitado";
  origin: "IA" | "Manual";
  is_recurring: boolean;
  recurrence_period: string | null;
  attachment_url: string | null;
}

/* ── Insert / Update payloads ── */

export interface ExpenseInsertPayload {
  tenant_id: string;
  description: string;
  category: string | null;
  category_id?: string | null;
  supplier_id?: string | null;
  value: number;
  date: string;
  is_recurring?: boolean;
  recurrence_period?: string | null;
  is_paid?: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_filename?: string | null;
  attachment_size_bytes?: number | null;
  origem?: string;
}

export interface ExpenseUpdatePayload {
  description?: string;
  category?: string | null;
  category_id?: string | null;
  supplier_id?: string | null;
  value?: number;
  date?: string;
  is_recurring?: boolean;
  recurrence_period?: string | null;
  is_paid?: boolean;
  attachment_url?: string | null;
  origem?: string;
}

/* ── Summary & filters ── */

export interface ExpenseSummary {
  total: number;
  totalCount: number;
  pendente: number;
  pendenteCount: number;
  pago: number;
  pagoCount: number;
  iaCount: number;
}

export interface ExpenseFilters {
  search: string;
  periodo: string;
  categoria: string;
  status: string;
  origem: string;
}

/* ── Predictability / Projection types ── */

export interface MonthProjection {
  /** YYYY-MM */
  period: string;
  /** Label for display: "Jan/26" */
  label: string;
  /** Sum of real expenses in this month */
  realValue: number;
  /** Projected recurring expenses */
  projectedRecurring: number;
  /** Inferred 13th salary provision (1/12 of annual Pessoal cost) */
  provision13th: number;
  /** Inferred vacation provision (1/12 of ~33% of Pessoal cost) */
  provisionVacation: number;
  /** Total = real + projected + provisions */
  totalProjected: number;
  /** Whether this month is fully real data (past) or has projections */
  isProjection: boolean;
}

export interface PredictabilityData {
  /** Next 30 days: pending expenses */
  immediate: {
    totalPending: number;
    pendingCount: number;
    upcomingRecurring: number;
    upcomingRecurringCount: number;
  };
  /** 12-month forward projection */
  monthlyProjections: MonthProjection[];
  /** Average monthly Pessoal cost (basis for 13th/vacation) */
  avgPessoalMonthly: number;
  /** Annual projected total */
  annualProjectedTotal: number;
  /** Risk level for current month */
  riskLevel: "low" | "medium" | "high";
}
