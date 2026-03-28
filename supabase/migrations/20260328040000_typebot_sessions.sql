-- Typebot session tracking
CREATE TABLE IF NOT EXISTS public.typebot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  typebot_id TEXT NOT NULL,
  session_id TEXT, -- Typebot's session ID from startChat
  is_active BOOLEAN DEFAULT true,
  variables JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, remote_jid, typebot_id)
);

CREATE INDEX IF NOT EXISTS idx_typebot_sessions_active ON typebot_sessions(tenant_id, remote_jid) WHERE is_active = true;
ALTER TABLE typebot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on typebot_sessions"
  ON public.typebot_sessions FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

-- Add TYPEBOT to provider check
ALTER TABLE public.channel_integrations DROP CONSTRAINT IF EXISTS channel_integrations_provider_check;
ALTER TABLE public.channel_integrations ADD CONSTRAINT channel_integrations_provider_check
  CHECK (provider IN ('WABA','INSTAGRAM','TELEGRAM','MERCADOLIVRE','WEBCHAT','FACEBOOK','MESSENGER','N8N','TYPEBOT'));

-- Add typebot_id to automation_triggers for linking triggers to specific bots
ALTER TABLE public.automation_triggers ADD COLUMN IF NOT EXISTS typebot_id TEXT;
ALTER TABLE public.automation_triggers ADD COLUMN IF NOT EXISTS typebot_url TEXT;
