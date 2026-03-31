-- Pipeline Stage Automations — triggers when a card enters a stage
CREATE TABLE IF NOT EXISTS public.pipeline_stage_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pipeline_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('send_whatsapp','send_email','add_tag','notify_agent','move_stage')),
  action_config JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psa_tenant ON pipeline_stage_automations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_psa_pipeline ON pipeline_stage_automations(pipeline_id, stage_name);

ALTER TABLE pipeline_stage_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psa_tenant_select" ON pipeline_stage_automations FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
CREATE POLICY "psa_tenant_insert" ON pipeline_stage_automations FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
CREATE POLICY "psa_tenant_update" ON pipeline_stage_automations FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
CREATE POLICY "psa_tenant_delete" ON pipeline_stage_automations FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

GRANT ALL ON pipeline_stage_automations TO authenticated;
GRANT ALL ON pipeline_stage_automations TO service_role;

-- Add automation_config to company_profile if not exists
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS automation_config JSONB DEFAULT '{}';
