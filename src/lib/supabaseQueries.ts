import { supabase } from "@/integrations/supabase/client";
import { FinancialEntry } from "@/types/financial";
import { FinancialEntryRow } from "@/types/supabase";

function rowToEntry(row: FinancialEntryRow): FinancialEntry {
  return {
    id: row.id,
    month: row.month,
    revenue: {
      mrr: row.mrr,
      newMRR: row.new_mrr,
      expansionMRR: row.expansion_mrr,
      churnedMRR: row.churned_mrr,
      otherRevenue: row.other_revenue,
    },
    costs: {
      fixedCosts: row.fixed_costs,
      variableCosts: row.variable_costs,
      infrastructure: row.infrastructure,
      marketing: row.marketing,
      taxes: row.taxes,
    },
    personnel: {
      payroll: row.payroll,
      benefits: row.benefits,
      contractors: row.contractors,
    },
    customers: {
      totalCustomers: row.total_customers,
      newCustomers: row.new_customers,
      churnedCustomers: row.churned_customers,
    },
    cashBalance: row.cash_balance,
  };
}

function entryToRow(
  entry: FinancialEntry
): Omit<FinancialEntryRow, "created_at" | "updated_at"> {
  return {
    id: entry.id,
    month: entry.month,
    mrr: entry.revenue.mrr,
    new_mrr: entry.revenue.newMRR,
    expansion_mrr: entry.revenue.expansionMRR,
    churned_mrr: entry.revenue.churnedMRR,
    other_revenue: entry.revenue.otherRevenue,
    fixed_costs: entry.costs.fixedCosts,
    variable_costs: entry.costs.variableCosts,
    infrastructure: entry.costs.infrastructure,
    marketing: entry.costs.marketing,
    taxes: entry.costs.taxes,
    payroll: entry.personnel.payroll,
    benefits: entry.personnel.benefits,
    contractors: entry.personnel.contractors,
    total_customers: entry.customers.totalCustomers,
    new_customers: entry.customers.newCustomers,
    churned_customers: entry.customers.churnedCustomers,
    cash_balance: entry.cashBalance,
  };
}

export async function fetchEntries(): Promise<FinancialEntry[]> {
  const { data, error } = await supabase
    .from("financial_entries")
    .select("*")
    .order("month", { ascending: true });

  if (error) throw error;
  return (data as FinancialEntryRow[]).map(rowToEntry);
}

export async function upsertEntry(entry: FinancialEntry): Promise<void> {
  const row = entryToRow(entry);
  const { error } = await supabase
    .from("financial_entries")
    .upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: "month" }
    );

  if (error) throw error;
}

export async function deleteEntryById(id: string): Promise<void> {
  const { error } = await supabase
    .from("financial_entries")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function importEntriesBatch(
  entries: FinancialEntry[]
): Promise<void> {
  const rows = entries.map((e) => ({
    ...entryToRow(e),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("financial_entries")
    .upsert(rows, { onConflict: "month" });

  if (error) throw error;
}
