-- PZAAFI MODULE D — Split Executions, Payouts, and Provider Connection enhancement
-- Depends on: 20260330030000_pzaafi_foundation.sql

-- ══════════════════════════════════════════
-- TABLE: pzaafi_split_executions
-- Records each time a split rule is executed on a payment
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pzaafi_split_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.pzaafi_payments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id) ON DELETE CASCADE,
  split_rule_id UUID NOT NULL REFERENCES public.pzaafi_split_rules(id) ON DELETE RESTRICT,
  total_cents BIGINT NOT NULL,
  fee_cents BIGINT NOT NULL DEFAULT 0,
  net_cents BIGINT GENERATED ALWAYS AS (total_cents - fee_cents) STORED,
  receivers_json JSONB NOT NULL DEFAULT '[]',
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pzaafi_split_exec_payment ON public.pzaafi_split_executions(payment_id);
CREATE INDEX IF NOT EXISTS idx_pzaafi_split_exec_org ON public.pzaafi_split_executions(org_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pzaafi_split_exec_rule ON public.pzaafi_split_executions(split_rule_id);

-- ══════════════════════════════════════════
-- TABLE: pzaafi_payouts
-- Tracks withdrawal / transfer requests to bank accounts
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pzaafi_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  schedule TEXT NOT NULL CHECK (schedule IN ('immediate', 'daily', 'weekly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed')),
  description TEXT,
  external_id TEXT,
  error TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pzaafi_payouts_org ON public.pzaafi_payouts(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pzaafi_payouts_status ON public.pzaafi_payouts(status, scheduled_for) WHERE status = 'scheduled';

-- ══════════════════════════════════════════
-- ADD interest_retention_pct to provider_connections
-- ══════════════════════════════════════════

ALTER TABLE public.pzaafi_provider_connections
  ADD COLUMN IF NOT EXISTS interest_retention_pct NUMERIC(5,2) DEFAULT 0;

COMMENT ON COLUMN public.pzaafi_provider_connections.interest_retention_pct
  IS 'Percentage of interest retained by the platform on split payments (0-100)';

-- ══════════════════════════════════════════
-- RLS on new tables
-- ══════════════════════════════════════════

ALTER TABLE public.pzaafi_split_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_payouts ENABLE ROW LEVEL SECURITY;

-- Split executions: tenant-scoped read/write
CREATE POLICY "pzaafi_split_executions_tenant_select" ON public.pzaafi_split_executions
  FOR SELECT TO authenticated
  USING (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

CREATE POLICY "pzaafi_split_executions_tenant_insert" ON public.pzaafi_split_executions
  FOR INSERT TO authenticated
  WITH CHECK (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

CREATE POLICY "pzaafi_split_executions_tenant_update" ON public.pzaafi_split_executions
  FOR UPDATE TO authenticated
  USING (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

-- Payouts: tenant-scoped read/write
CREATE POLICY "pzaafi_payouts_tenant_select" ON public.pzaafi_payouts
  FOR SELECT TO authenticated
  USING (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

CREATE POLICY "pzaafi_payouts_tenant_insert" ON public.pzaafi_payouts
  FOR INSERT TO authenticated
  WITH CHECK (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

CREATE POLICY "pzaafi_payouts_tenant_update" ON public.pzaafi_payouts
  FOR UPDATE TO authenticated
  USING (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

-- Service role full access
GRANT ALL ON public.pzaafi_split_executions TO service_role;
GRANT ALL ON public.pzaafi_payouts TO service_role;
GRANT SELECT ON public.pzaafi_split_executions TO authenticated;
GRANT SELECT ON public.pzaafi_payouts TO authenticated;
