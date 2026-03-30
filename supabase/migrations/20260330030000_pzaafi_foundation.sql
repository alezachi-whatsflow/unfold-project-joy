-- PZAAFI FOUNDATION — 18 tables, functions, RLS, triggers
-- Prerequisite: PZAAFI_MASTER.md rules

-- ══════════════════════════════════════════
-- PHASE 1: FUNCTIONS
-- ══════════════════════════════════════════

-- Add pzaafi columns to existing licenses table
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS pzaafi_tier TEXT CHECK (pzaafi_tier IN ('nexus', 'whitelabel', 'cliente')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pzaafi_enabled_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pzaafi_parent_org_id UUID DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_licenses_pzaafi_tier ON public.licenses(pzaafi_tier) WHERE pzaafi_tier IS NOT NULL;

-- Function: get tenant IDs the current user can access in Pzaafi context
CREATE OR REPLACE FUNCTION public.get_pzaafi_tenant_ids()
RETURNS UUID[] AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tier TEXT;
  v_tenant_id UUID;
BEGIN
  -- Find the user's tenant and pzaafi tier
  SELECT l.pzaafi_tier, ut.tenant_id
  INTO v_tier, v_tenant_id
  FROM public.user_tenants ut
  JOIN public.licenses l ON l.tenant_id = ut.tenant_id
  WHERE ut.user_id = v_user_id
    AND l.pzaafi_tier IS NOT NULL
  LIMIT 1;

  IF v_tier IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  IF v_tier = 'nexus' THEN
    RETURN ARRAY(SELECT id FROM public.pzaafi_organizations);
  ELSIF v_tier = 'whitelabel' THEN
    RETURN ARRAY(
      SELECT id FROM public.pzaafi_organizations
      WHERE parent_org_id IN (
        SELECT id FROM public.pzaafi_organizations WHERE tenant_id = v_tenant_id
      ) OR tenant_id = v_tenant_id
    );
  ELSE
    RETURN ARRAY(SELECT id FROM public.pzaafi_organizations WHERE tenant_id = v_tenant_id);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: check if user is Pzaafi Nexus admin
CREATE OR REPLACE FUNCTION public.is_pzaafi_nexus()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_tenants ut
    JOIN public.licenses l ON l.tenant_id = ut.tenant_id
    WHERE ut.user_id = auth.uid()
      AND l.pzaafi_tier = 'nexus'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ══════════════════════════════════════════
-- PHASE 2: TABLES (18 entities)
-- ══════════════════════════════════════════

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.pzaafi_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_org_id UUID REFERENCES public.pzaafi_organizations(id) ON DELETE SET NULL,
  tier TEXT NOT NULL CHECK (tier IN ('nexus', 'whitelabel', 'cliente')),
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  primary_color TEXT,
  custom_domain TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pzaafi_org_tenant ON public.pzaafi_organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pzaafi_org_parent ON public.pzaafi_organizations(parent_org_id);

-- 2. Wallet Accounts
CREATE TABLE IF NOT EXISTS public.pzaafi_wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  balance_available BIGINT NOT NULL DEFAULT 0,
  balance_blocked BIGINT NOT NULL DEFAULT 0,
  balance_pending BIGINT NOT NULL DEFAULT 0,
  balance_anticipated BIGINT NOT NULL DEFAULT 0,
  balance_disputed BIGINT NOT NULL DEFAULT 0,
  balance_refunded BIGINT NOT NULL DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pzaafi_wallet_org ON public.pzaafi_wallet_accounts(org_id);

-- 3. Provider Connections
CREATE TABLE IF NOT EXISTS public.pzaafi_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}',
  webhook_secret TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  last_health_at TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy','degraded','offline','unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, connector_id)
);

-- 4. Checkouts
CREATE TABLE IF NOT EXISTS public.pzaafi_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  theme_config JSONB NOT NULL DEFAULT '{}',
  accepted_methods TEXT[] NOT NULL DEFAULT ARRAY['pix','credit_card','boleto'],
  max_installments INT NOT NULL DEFAULT 12,
  routing_rules JSONB NOT NULL DEFAULT '{}',
  ab_test_enabled BOOLEAN NOT NULL DEFAULT false,
  ab_variant_b JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pzaafi_checkout_org ON public.pzaafi_checkouts(org_id);

-- 5. Products
CREATE TABLE IF NOT EXISTS public.pzaafi_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id) ON DELETE CASCADE,
  checkout_id UUID REFERENCES public.pzaafi_checkouts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('digital','physical','service','subscription')),
  price_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly','yearly','weekly','custom')),
  fiscal_code TEXT,
  fiscal_type TEXT CHECK (fiscal_type IN ('nfe','nfse')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pzaafi_product_org ON public.pzaafi_products(org_id);

-- 6. Orders
CREATE TABLE IF NOT EXISTS public.pzaafi_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id),
  checkout_id UUID REFERENCES public.pzaafi_checkouts(id),
  product_id UUID REFERENCES public.pzaafi_products(id),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_document TEXT,
  buyer_phone TEXT,
  subtotal_cents BIGINT NOT NULL,
  discount_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','refunded','disputed','expired')),
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
  ip_address TEXT, user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pzaafi_order_org ON public.pzaafi_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_pzaafi_order_status ON public.pzaafi_orders(org_id, status);

-- 7. Payments
CREATE TABLE IF NOT EXISTS public.pzaafi_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.pzaafi_orders(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id),
  connector_id TEXT NOT NULL,
  external_id TEXT,
  external_charge_id TEXT,
  amount_cents BIGINT NOT NULL,
  fee_cents BIGINT NOT NULL DEFAULT 0,
  net_cents BIGINT GENERATED ALWAYS AS (amount_cents - fee_cents) STORED,
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix','credit_card','debit_card','boleto')),
  installments INT NOT NULL DEFAULT 1,
  card_token TEXT, card_last4 TEXT, card_brand TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','authorized','paid','failed','refunded','disputed','cancelled')),
  failure_reason TEXT,
  authorized_at TIMESTAMPTZ, paid_at TIMESTAMPTZ, failed_at TIMESTAMPTZ, refunded_at TIMESTAMPTZ,
  interest_rate NUMERIC(5,4) DEFAULT 0,
  interest_retained BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pzaafi_payment_order ON public.pzaafi_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_pzaafi_payment_org ON public.pzaafi_payments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_pzaafi_payment_ext ON public.pzaafi_payments(connector_id, external_id);

-- 8. Split Rules
CREATE TABLE IF NOT EXISTS public.pzaafi_split_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id),
  product_id UUID REFERENCES public.pzaafi_products(id),
  name TEXT NOT NULL,
  receivers JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Settlements
CREATE TABLE IF NOT EXISTS public.pzaafi_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id),
  payment_id UUID REFERENCES public.pzaafi_payments(id),
  connector_id TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  fee_cents BIGINT NOT NULL DEFAULT 0,
  net_cents BIGINT GENERATED ALWAYS AS (amount_cents - fee_cents) STORED,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','processing','settled','failed')),
  scheduled_for DATE NOT NULL,
  settled_at TIMESTAMPTZ,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Refunds
CREATE TABLE IF NOT EXISTS public.pzaafi_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.pzaafi_payments(id),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id),
  amount_cents BIGINT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','refunded','failed')),
  external_id TEXT,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Chargebacks
CREATE TABLE IF NOT EXISTS public.pzaafi_chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.pzaafi_payments(id),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id),
  amount_cents BIGINT NOT NULL,
  reason TEXT,
  liability_tier TEXT NOT NULL CHECK (liability_tier IN ('nexus','whitelabel','cliente')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','evidence_submitted','won','lost','cancelled')),
  deadline DATE,
  evidence_url TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Ledger Entries (IMMUTABLE)
CREATE TABLE IF NOT EXISTS public.pzaafi_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id),
  wallet_id UUID NOT NULL REFERENCES public.pzaafi_wallet_accounts(id),
  event_type TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  balance_type TEXT NOT NULL CHECK (balance_type IN ('available','blocked','pending','anticipated','disputed','refunded')),
  payment_id UUID REFERENCES public.pzaafi_payments(id),
  order_id UUID REFERENCES public.pzaafi_orders(id),
  settlement_id UUID REFERENCES public.pzaafi_settlements(id),
  refund_id UUID REFERENCES public.pzaafi_refunds(id),
  chargeback_id UUID REFERENCES public.pzaafi_chargebacks(id),
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  balance_after BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pzaafi_ledger_org ON public.pzaafi_ledger_entries(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pzaafi_ledger_wallet ON public.pzaafi_ledger_entries(wallet_id, created_at DESC);

-- Immutability trigger
CREATE OR REPLACE FUNCTION public.pzaafi_ledger_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'pzaafi_ledger_entries is immutable - create a reversal entry instead';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_no_update ON public.pzaafi_ledger_entries;
CREATE TRIGGER trg_ledger_no_update BEFORE UPDATE ON public.pzaafi_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.pzaafi_ledger_immutable();
DROP TRIGGER IF EXISTS trg_ledger_no_delete ON public.pzaafi_ledger_entries;
CREATE TRIGGER trg_ledger_no_delete BEFORE DELETE ON public.pzaafi_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.pzaafi_ledger_immutable();

-- 13. Webhook Events
CREATE TABLE IF NOT EXISTS public.pzaafi_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id TEXT NOT NULL,
  external_event_id TEXT,
  event_type TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  normalized JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(connector_id, external_event_id)
);
CREATE INDEX IF NOT EXISTS idx_pzaafi_webhook_pending ON public.pzaafi_webhook_events(processed, created_at) WHERE NOT processed;

-- 14. Subscriptions
CREATE TABLE IF NOT EXISTS public.pzaafi_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id),
  product_id UUID NOT NULL REFERENCES public.pzaafi_products(id),
  buyer_email TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_document TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','past_due')),
  billing_cycle TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  next_billing_at TIMESTAMPTZ NOT NULL,
  card_token TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

-- 15. Fiscal Documents
CREATE TABLE IF NOT EXISTS public.pzaafi_fiscal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id),
  payment_id UUID REFERENCES public.pzaafi_payments(id),
  order_id UUID REFERENCES public.pzaafi_orders(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('nfe','nfse')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','issued','failed','cancelled')),
  external_id TEXT, series TEXT, number TEXT,
  issued_at TIMESTAMPTZ, pdf_url TEXT, xml_url TEXT, error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Audit Log (IMMUTABLE - LGPD)
CREATE TABLE IF NOT EXISTS public.pzaafi_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.pzaafi_organizations(id),
  user_id UUID,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pzaafi_audit_org ON public.pzaafi_audit_log(org_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_audit_no_update ON public.pzaafi_audit_log;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON public.pzaafi_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.pzaafi_ledger_immutable();
DROP TRIGGER IF EXISTS trg_audit_no_delete ON public.pzaafi_audit_log;
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON public.pzaafi_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.pzaafi_ledger_immutable();

-- ══════════════════════════════════════════
-- PHASE 3: LEDGER WRITE FUNCTION
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.pzaafi_ledger_entry(
  p_org_id UUID, p_wallet_id UUID, p_event_type TEXT,
  p_amount_cents BIGINT, p_balance_type TEXT, p_description TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_payment_id UUID DEFAULT NULL, p_order_id UUID DEFAULT NULL,
  p_settlement_id UUID DEFAULT NULL, p_refund_id UUID DEFAULT NULL,
  p_chargeback_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_current BIGINT;
  v_new BIGINT;
  v_id UUID;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_current
  FROM public.pzaafi_ledger_entries
  WHERE wallet_id = p_wallet_id AND balance_type = p_balance_type;

  v_new := v_current + p_amount_cents;

  IF p_balance_type = 'available' AND v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient available balance: % cents', v_current;
  END IF;

  INSERT INTO public.pzaafi_ledger_entries (
    org_id, wallet_id, event_type, amount_cents, balance_type,
    description, metadata, balance_after,
    payment_id, order_id, settlement_id, refund_id, chargeback_id
  ) VALUES (
    p_org_id, p_wallet_id, p_event_type, p_amount_cents, p_balance_type,
    p_description, p_metadata, v_new,
    p_payment_id, p_order_id, p_settlement_id, p_refund_id, p_chargeback_id
  ) RETURNING id INTO v_id;

  EXECUTE format(
    'UPDATE public.pzaafi_wallet_accounts SET balance_%s = $1, updated_at = NOW() WHERE id = $2',
    p_balance_type
  ) USING v_new, p_wallet_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════
-- PHASE 4: RLS ON ALL TABLES
-- ══════════════════════════════════════════

ALTER TABLE public.pzaafi_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_split_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_chargebacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for org-scoped tables
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'pzaafi_organizations','pzaafi_wallet_accounts','pzaafi_provider_connections',
    'pzaafi_checkouts','pzaafi_products','pzaafi_orders','pzaafi_payments',
    'pzaafi_split_rules','pzaafi_settlements','pzaafi_refunds','pzaafi_chargebacks',
    'pzaafi_subscriptions','pzaafi_fiscal_documents'
  ];
  col TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Determine the org column name
    IF t = 'pzaafi_organizations' THEN col := 'id'; ELSE col := 'org_id'; END IF;

    EXECUTE format(
      'CREATE POLICY "%s_tenant_select" ON public.%s FOR SELECT TO authenticated USING (%s = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus())',
      t, t, col
    );
    EXECUTE format(
      'CREATE POLICY "%s_tenant_insert" ON public.%s FOR INSERT TO authenticated WITH CHECK (%s = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus())',
      t, t, col
    );
    EXECUTE format(
      'CREATE POLICY "%s_tenant_update" ON public.%s FOR UPDATE TO authenticated USING (%s = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus())',
      t, t, col
    );
  END LOOP;
END $$;

-- Service role full access for Edge Functions
DO $$
DECLARE t TEXT;
  tables TEXT[] := ARRAY[
    'pzaafi_organizations','pzaafi_wallet_accounts','pzaafi_provider_connections',
    'pzaafi_checkouts','pzaafi_products','pzaafi_orders','pzaafi_payments',
    'pzaafi_split_rules','pzaafi_settlements','pzaafi_refunds','pzaafi_chargebacks',
    'pzaafi_subscriptions','pzaafi_fiscal_documents','pzaafi_ledger_entries',
    'pzaafi_webhook_events','pzaafi_audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('GRANT ALL ON public.%s TO service_role', t);
    EXECUTE format('GRANT SELECT ON public.%s TO authenticated', t);
  END LOOP;
END $$;

-- Ledger: read-only for tenants
CREATE POLICY "pzaafi_ledger_select" ON public.pzaafi_ledger_entries
  FOR SELECT TO authenticated USING (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

-- Audit: read-only
CREATE POLICY "pzaafi_audit_select" ON public.pzaafi_audit_log
  FOR SELECT TO authenticated USING (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

-- Webhook: nexus only
CREATE POLICY "pzaafi_webhook_select" ON public.pzaafi_webhook_events
  FOR SELECT TO authenticated USING (is_pzaafi_nexus());
