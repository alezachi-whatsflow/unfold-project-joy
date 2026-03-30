-- PZAAFI MODULE E — WhiteLabel Platform tables
-- org_members, kyc_records, commission_rules

-- ══════════════════════════════════════════
-- 1. ORG MEMBERS (RBAC)
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pzaafi_org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','finance','support','ops','viewer')),
  invited_by UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pzaafi_org_members_org ON public.pzaafi_org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_pzaafi_org_members_user ON public.pzaafi_org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pzaafi_org_members_active ON public.pzaafi_org_members(org_id, active) WHERE active = true;

-- ══════════════════════════════════════════
-- 2. KYC RECORDS
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pzaafi_kyc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'manual',
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected')),
  external_id TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pzaafi_kyc_org ON public.pzaafi_kyc_records(org_id);
CREATE INDEX IF NOT EXISTS idx_pzaafi_kyc_status ON public.pzaafi_kyc_records(org_id, status);
CREATE INDEX IF NOT EXISTS idx_pzaafi_kyc_external ON public.pzaafi_kyc_records(provider, external_id) WHERE external_id IS NOT NULL;

-- ══════════════════════════════════════════
-- 3. COMMISSION RULES
-- ══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pzaafi_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_org_id UUID NOT NULL REFERENCES public.pzaafi_organizations(id) ON DELETE CASCADE,
  child_org_id UUID REFERENCES public.pzaafi_organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('percent','fixed_cents')),
  value BIGINT NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('all','pix','credit_card','boleto','subscription')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pzaafi_commission_parent ON public.pzaafi_commission_rules(parent_org_id);
CREATE INDEX IF NOT EXISTS idx_pzaafi_commission_child ON public.pzaafi_commission_rules(child_org_id) WHERE child_org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pzaafi_commission_active ON public.pzaafi_commission_rules(parent_org_id, active) WHERE active = true;

-- ══════════════════════════════════════════
-- 4. RLS
-- ══════════════════════════════════════════

ALTER TABLE public.pzaafi_org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pzaafi_commission_rules ENABLE ROW LEVEL SECURITY;

-- org_members policies
CREATE POLICY "pzaafi_org_members_tenant_select" ON public.pzaafi_org_members
  FOR SELECT TO authenticated
  USING (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

CREATE POLICY "pzaafi_org_members_tenant_insert" ON public.pzaafi_org_members
  FOR INSERT TO authenticated
  WITH CHECK (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

CREATE POLICY "pzaafi_org_members_tenant_update" ON public.pzaafi_org_members
  FOR UPDATE TO authenticated
  USING (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

-- kyc_records policies
CREATE POLICY "pzaafi_kyc_records_tenant_select" ON public.pzaafi_kyc_records
  FOR SELECT TO authenticated
  USING (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

CREATE POLICY "pzaafi_kyc_records_tenant_insert" ON public.pzaafi_kyc_records
  FOR INSERT TO authenticated
  WITH CHECK (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

CREATE POLICY "pzaafi_kyc_records_tenant_update" ON public.pzaafi_kyc_records
  FOR UPDATE TO authenticated
  USING (org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

-- commission_rules policies (use parent_org_id as the org column)
CREATE POLICY "pzaafi_commission_rules_tenant_select" ON public.pzaafi_commission_rules
  FOR SELECT TO authenticated
  USING (parent_org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

CREATE POLICY "pzaafi_commission_rules_tenant_insert" ON public.pzaafi_commission_rules
  FOR INSERT TO authenticated
  WITH CHECK (parent_org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

CREATE POLICY "pzaafi_commission_rules_tenant_update" ON public.pzaafi_commission_rules
  FOR UPDATE TO authenticated
  USING (parent_org_id = ANY(get_pzaafi_tenant_ids()) OR is_pzaafi_nexus());

-- ══════════════════════════════════════════
-- 5. GRANTS
-- ══════════════════════════════════════════

GRANT ALL ON public.pzaafi_org_members TO service_role;
GRANT SELECT ON public.pzaafi_org_members TO authenticated;

GRANT ALL ON public.pzaafi_kyc_records TO service_role;
GRANT SELECT ON public.pzaafi_kyc_records TO authenticated;

GRANT ALL ON public.pzaafi_commission_rules TO service_role;
GRANT SELECT ON public.pzaafi_commission_rules TO authenticated;
