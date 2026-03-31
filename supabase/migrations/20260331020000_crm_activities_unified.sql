-- Unified CRM Activity Timeline
-- All actions from Inbox and Pipeline stored in one table

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  card_id UUID,                    -- links to negocios (nullable for inbox-only actions)
  contact_jid TEXT,                -- links to whatsapp contact (nullable for CRM-only actions)
  activity_type TEXT NOT NULL,     -- whatsapp_msg, note, call, stage_change, etc
  content JSONB NOT NULL DEFAULT '{}',
  performed_by UUID,               -- user who performed the action
  performed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_card ON crm_activities(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities(contact_jid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_tenant ON crm_activities(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(activity_type);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_activities_select" ON crm_activities FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));
CREATE POLICY "crm_activities_insert" ON crm_activities FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

GRANT ALL ON crm_activities TO authenticated;
GRANT ALL ON crm_activities TO service_role;

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE crm_activities;
