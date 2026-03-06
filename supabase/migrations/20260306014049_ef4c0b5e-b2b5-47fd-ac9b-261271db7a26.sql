CREATE TABLE public.financial_entries (
  id text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  month text NOT NULL UNIQUE,
  mrr numeric NOT NULL DEFAULT 0,
  new_mrr numeric NOT NULL DEFAULT 0,
  expansion_mrr numeric NOT NULL DEFAULT 0,
  churned_mrr numeric NOT NULL DEFAULT 0,
  other_revenue numeric NOT NULL DEFAULT 0,
  fixed_costs numeric NOT NULL DEFAULT 0,
  variable_costs numeric NOT NULL DEFAULT 0,
  infrastructure numeric NOT NULL DEFAULT 0,
  marketing numeric NOT NULL DEFAULT 0,
  taxes numeric NOT NULL DEFAULT 0,
  payroll numeric NOT NULL DEFAULT 0,
  benefits numeric NOT NULL DEFAULT 0,
  contractors numeric NOT NULL DEFAULT 0,
  total_customers numeric NOT NULL DEFAULT 0,
  new_customers numeric NOT NULL DEFAULT 0,
  churned_customers numeric NOT NULL DEFAULT 0,
  cash_balance numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on financial_entries" ON public.financial_entries FOR SELECT USING (true);
CREATE POLICY "Allow public insert on financial_entries" ON public.financial_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on financial_entries" ON public.financial_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on financial_entries" ON public.financial_entries FOR DELETE USING (true);