-- ============================================================
-- ASAAS INTEGRATION SCHEMA
-- Execute no Supabase SQL Editor
-- ============================================================

-- Enum types
CREATE TYPE asaas_environment AS ENUM ('sandbox', 'production');
CREATE TYPE payment_status AS ENUM (
  'PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 
  'REFUNDED', 'RECEIVED_IN_CASH', 'REFUND_REQUESTED',
  'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 
  'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL',
  'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS'
);
CREATE TYPE billing_type AS ENUM ('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED');
CREATE TYPE dunning_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- 1. Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT, -- CNPJ
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Asaas Connections (1 per tenant per environment)
CREATE TABLE IF NOT EXISTS asaas_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  environment asaas_environment NOT NULL DEFAULT 'sandbox',
  api_key_hint TEXT, -- last 4 chars only, for display
  webhook_token TEXT, -- token for webhook validation
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, environment)
);

-- 3. Asaas Customers (mirror)
CREATE TABLE IF NOT EXISTS asaas_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  asaas_id TEXT NOT NULL, -- ID no Asaas (cus_xxx)
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
CREATE TABLE IF NOT EXISTS checkout_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g. "Boleto Mensal", "Cartão Anual"
  billing_type billing_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Sales People (vendedores/parceiros para split)
CREATE TABLE IF NOT EXISTS sales_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  asaas_wallet_id TEXT, -- Wallet ID no Asaas para split
  commission_percent NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Payments (cobranças do Asaas)
CREATE TABLE IF NOT EXISTS asaas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  asaas_id TEXT NOT NULL, -- ID no Asaas (pay_xxx)
  asaas_customer_id TEXT, -- cus_xxx
  customer_id UUID REFERENCES asaas_customers(id),
  checkout_source_id UUID REFERENCES checkout_sources(id),
  salesperson_id UUID REFERENCES sales_people(id),
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
CREATE TABLE IF NOT EXISTS asaas_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES asaas_payments(id) ON DELETE CASCADE NOT NULL,
  salesperson_id UUID REFERENCES sales_people(id),
  wallet_id TEXT NOT NULL, -- Wallet do destinatário
  fixed_value NUMERIC(12,2),
  percent_value NUMERIC(5,2),
  total_value NUMERIC(12,2),
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Expenses (despesas manuais)
CREATE TABLE IF NOT EXISTS asaas_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- CSP, MKT, SAL, GA, FIN, TAX
  value NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_period TEXT, -- monthly, quarterly, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Revenue Rules
CREATE TABLE IF NOT EXISTS revenue_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  billing_type billing_type,
  checkout_source_id UUID REFERENCES checkout_sources(id),
  revenue_category TEXT DEFAULT 'mrr', -- mrr, newMRR, expansionMRR, otherRevenue
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Dunning Rules
CREATE TABLE IF NOT EXISTS dunning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status dunning_status DEFAULT 'draft',
  rules JSONB NOT NULL DEFAULT '[]', 
  -- Array of: { days_after_due: number, action: 'notification'|'sms'|'email'|'protest', message: string }
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Dunning Executions
CREATE TABLE IF NOT EXISTS dunning_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  dunning_rule_id UUID REFERENCES dunning_rules(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES asaas_payments(id) ON DELETE CASCADE NOT NULL,
  step_index INT NOT NULL, -- which rule step was executed
  action TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now(),
  result JSONB, -- response from Asaas
  success BOOLEAN DEFAULT false
);

-- 12. Webhook Events (idempotency + audit)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  event_type TEXT NOT NULL,
  asaas_event_id TEXT, -- for idempotency
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asaas_event_id)
);

-- Indexes
CREATE INDEX idx_payments_tenant_status ON asaas_payments(tenant_id, status);
CREATE INDEX idx_payments_due_date ON asaas_payments(due_date);
CREATE INDEX idx_webhook_events_idempotency ON webhook_events(asaas_event_id);
CREATE INDEX idx_asaas_customers_tenant ON asaas_customers(tenant_id);

-- RLS: allow public access (matches project pattern)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching existing project pattern)
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
    EXECUTE format('CREATE POLICY "Allow public select on %I" ON %I FOR SELECT TO anon, authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public insert on %I" ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public update on %I" ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public delete on %I" ON %I FOR DELETE TO anon, authenticated USING (true)', tbl, tbl);
  END LOOP;
END $$;

-- Insert default tenant
INSERT INTO tenants (id, name, document) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Whatsflow', null)
ON CONFLICT DO NOTHING;
