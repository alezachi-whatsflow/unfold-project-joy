
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  product_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  rule_type TEXT NOT NULL DEFAULT 'installment_based' CHECK (rule_type IN ('installment_based', 'fixed_percent', 'fixed_value')),
  installment_rates JSONB NOT NULL DEFAULT '[]',
  recurring_rate_min NUMERIC(5,2) DEFAULT 0,
  recurring_rate_max NUMERIC(5,2) DEFAULT 0,
  recurring_start_installment INT DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.commission_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
