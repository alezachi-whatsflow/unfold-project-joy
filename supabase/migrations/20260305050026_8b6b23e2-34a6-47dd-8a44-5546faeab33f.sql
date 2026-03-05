
-- Enum types
DO $$ BEGIN
  CREATE TYPE asaas_environment AS ENUM ('sandbox', 'production');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 
    'REFUNDED', 'RECEIVED_IN_CASH', 'REFUND_REQUESTED',
    'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 
    'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL',
    'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_type AS ENUM ('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dunning_status AS ENUM ('draft', 'active', 'paused', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Asaas Connections
CREATE TABLE IF NOT EXISTS public.asaas_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  environment asaas_environment NOT NULL DEFAULT 'sandbox',
  api_key_hint TEXT,
  webhook_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, environment)
);

-- 3. Asaas Customers
CREATE TABLE IF NOT EXISTS public.asaas_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  asaas_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  cpf_cnpj TEXT,
  phone TEXT,
  mobile_phone TEXT,
  address JSONB,
  external_reference TEXT,
  additional_emails TEXT,
  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, asaas_id)
);

-- 4. Checkout Sources
CREATE TABLE IF NOT EXISTS public.checkout_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  billing_type billing_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Sales People
CREATE TABLE IF NOT EXISTS public.sales_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  asaas_wallet_id TEXT,
  commission_percent NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Asaas Payments
CREATE TABLE IF NOT EXISTS public.asaas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  asaas_id TEXT NOT NULL,
  asaas_customer_id TEXT,
  customer_id UUID REFERENCES public.asaas_customers(id),
  checkout_source_id UUID REFERENCES public.checkout_sources(id),
  salesperson_id UUID REFERENCES public.sales_people(id),
  billing_type billing_type NOT NULL DEFAULT 'UNDEFINED',
  status payment_status NOT NULL DEFAULT 'PENDING',
  value NUMERIC(12,2) NOT NULL,
  net_value NUMERIC(12,2),
  due_date DATE NOT NULL,
  payment_date DATE,
  confirmed_date DATE,
  invoice_url TEXT,
  bank_slip_url TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  description TEXT,
  external_reference TEXT,
  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, asaas_id)
);

-- 7. Splits
CREATE TABLE IF NOT EXISTS public.asaas_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES public.asaas_payments(id) ON DELETE CASCADE NOT NULL,
  salesperson_id UUID REFERENCES public.sales_people(id),
  wallet_id TEXT NOT NULL,
  fixed_value NUMERIC(12,2),
  percent_value NUMERIC(5,2),
  total_value NUMERIC(12,2),
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Expenses
CREATE TABLE IF NOT EXISTS public.asaas_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  value NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_period TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Revenue Rules
CREATE TABLE IF NOT EXISTS public.revenue_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  billing_type billing_type,
  checkout_source_id UUID REFERENCES public.checkout_sources(id),
  revenue_category TEXT DEFAULT 'mrr',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Dunning Rules
CREATE TABLE IF NOT EXISTS public.dunning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status dunning_status DEFAULT 'draft',
  rules JSONB NOT NULL DEFAULT '[]',
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Dunning Executions
CREATE TABLE IF NOT EXISTS public.dunning_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  dunning_rule_id UUID REFERENCES public.dunning_rules(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES public.asaas_payments(id) ON DELETE CASCADE NOT NULL,
  step_index INT NOT NULL,
  action TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now(),
  result JSONB,
  success BOOLEAN DEFAULT false
);

-- 12. Webhook Events
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  event_type TEXT NOT NULL,
  asaas_event_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asaas_event_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON public.asaas_payments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.asaas_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency ON public.webhook_events(asaas_event_id);
CREATE INDEX IF NOT EXISTS idx_asaas_customers_tenant ON public.asaas_customers(tenant_id);

-- RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Public access policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'tenants','asaas_connections','asaas_customers','checkout_sources',
    'sales_people','asaas_payments','asaas_splits','asaas_expenses',
    'revenue_rules','dunning_rules','dunning_executions','webhook_events'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Allow public select on %I" ON public.%I FOR SELECT TO anon, authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public insert on %I" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public update on %I" ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public delete on %I" ON public.%I FOR DELETE TO anon, authenticated USING (true)', tbl, tbl);
  END LOOP;
END $$;
