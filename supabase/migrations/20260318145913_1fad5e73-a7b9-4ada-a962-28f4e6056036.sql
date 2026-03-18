
-- ═══════════════════════════════════════════
-- MÓDULO INTELIGÊNCIA COMERCIAL — Tabelas Core
-- ═══════════════════════════════════════════

-- 1. PERFIL DA EMPRESA
CREATE TABLE public.company_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_name TEXT,
  segment TEXT,
  sub_segment TEXT,
  main_product TEXT,
  value_proposition TEXT,
  avg_ticket_min NUMERIC(12,2),
  avg_ticket_max NUMERIC(12,2),
  currency TEXT DEFAULT 'BRL',
  avg_sales_cycle_days INTEGER,
  billing_type TEXT,
  ideal_client_size TEXT,
  decision_maker TEXT,
  client_pain TEXT,
  best_clients_desc TEXT,
  disqualifiers JSONB DEFAULT '[]',
  language TEXT DEFAULT 'pt-BR',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  wizard_completed BOOLEAN DEFAULT false,
  wizard_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- 2. ICP PROFILES
CREATE TABLE public.icp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'ICP Principal',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_auto_generated BOOLEAN DEFAULT true,
  hot_score_threshold INTEGER DEFAULT 70,
  warm_score_threshold INTEGER DEFAULT 40,
  criteria JSONB DEFAULT '[]',
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES public.icp_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ICP QUESTIONNAIRES
CREATE TABLE public.icp_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  icp_id UUID REFERENCES public.icp_profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Questionário Principal',
  is_active BOOLEAN DEFAULT true,
  is_auto_generated BOOLEAN DEFAULT true,
  questions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add ICP fields to negocios table
ALTER TABLE public.negocios
  ADD COLUMN IF NOT EXISTS icp_score INTEGER,
  ADD COLUMN IF NOT EXISTS icp_label TEXT,
  ADD COLUMN IF NOT EXISTS icp_radar JSONB,
  ADD COLUMN IF NOT EXISTS recommended_action TEXT,
  ADD COLUMN IF NOT EXISTS questionnaire_answers JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT now();

-- 5. RLS
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icp_questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on company_profile"
  ON public.company_profile FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE POLICY "Tenant isolation on icp_profiles"
  ON public.icp_profiles FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

CREATE POLICY "Tenant isolation on icp_questionnaires"
  ON public.icp_questionnaires FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

-- Indexes
CREATE INDEX idx_icp_profiles_tenant ON public.icp_profiles(tenant_id);
CREATE INDEX idx_icp_questionnaires_tenant ON public.icp_questionnaires(tenant_id);
CREATE INDEX idx_negocios_icp_score ON public.negocios(icp_score);
