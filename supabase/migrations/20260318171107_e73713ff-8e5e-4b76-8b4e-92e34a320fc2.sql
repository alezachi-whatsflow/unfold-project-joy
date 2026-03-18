
-- Phase 1: Add AI columns to licenses
ALTER TABLE public.licenses 
  ADD COLUMN IF NOT EXISTS ai_active_skills JSONB DEFAULT '{"auditor": false, "copilot": false, "closer": false}',
  ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT '{}';

-- Knowledge Base (used by Copilot and Closer)
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  segment TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on knowledge_base" ON public.knowledge_base
  FOR ALL TO authenticated
  USING (license_id IN (SELECT l.id FROM public.licenses l WHERE l.tenant_id IN (SELECT get_my_tenant_ids())))
  WITH CHECK (license_id IN (SELECT l.id FROM public.licenses l WHERE l.tenant_id IN (SELECT get_my_tenant_ids())));

-- Phase 2: Audit Evaluations
CREATE TABLE public.audit_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  attendant_id UUID,
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  period_date DATE NOT NULL,
  overall_score NUMERIC(4,2),
  score_label TEXT,
  criteria_scores JSONB DEFAULT '[]',
  errors_found JSONB DEFAULT '[]',
  opportunities_missed JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  ai_summary TEXT,
  source TEXT DEFAULT 'human',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on audit_evaluations" ON public.audit_evaluations
  FOR ALL TO authenticated
  USING (license_id IN (SELECT l.id FROM public.licenses l WHERE l.tenant_id IN (SELECT get_my_tenant_ids())))
  WITH CHECK (license_id IN (SELECT l.id FROM public.licenses l WHERE l.tenant_id IN (SELECT get_my_tenant_ids())));

CREATE INDEX idx_audit_eval_license ON public.audit_evaluations(license_id, period_date);

-- Audit Reports
CREATE TABLE public.audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_conversations INTEGER,
  avg_overall_score NUMERIC(4,2),
  below_threshold_pct NUMERIC(5,2),
  top_errors JSONB DEFAULT '[]',
  attendant_ranking JSONB DEFAULT '[]',
  daily_trend JSONB DEFAULT '[]',
  management_recommendations JSONB DEFAULT '[]',
  text_summary TEXT,
  generated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on audit_reports" ON public.audit_reports
  FOR ALL TO authenticated
  USING (license_id IN (SELECT l.id FROM public.licenses l WHERE l.tenant_id IN (SELECT get_my_tenant_ids())))
  WITH CHECK (license_id IN (SELECT l.id FROM public.licenses l WHERE l.tenant_id IN (SELECT get_my_tenant_ids())));

CREATE INDEX idx_audit_reports_license ON public.audit_reports(license_id, period_start);
