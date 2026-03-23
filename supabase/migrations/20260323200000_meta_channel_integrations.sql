-- =====================================================================
-- META CHANNEL INTEGRATIONS — WhatsApp API Oficial + Instagram Messaging
-- Tabelas para persistir integrações OAuth Meta
-- =====================================================================

-- 1. Channel Integrations — tabela principal
CREATE TABLE IF NOT EXISTS public.channel_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Identification
  provider TEXT NOT NULL CHECK (provider IN ('WABA', 'INSTAGRAM')),
  channel_id TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL DEFAULT '',

  -- WhatsApp fields
  phone_number_id TEXT,            -- ID oficial Meta (chave operacional principal)
  display_phone_number TEXT,       -- Ex: +5511954665605 (auxiliar/visual)
  verified_name TEXT,              -- Nome verificado pela Meta
  waba_id TEXT,                    -- WhatsApp Business Account ID

  -- Instagram fields
  instagram_business_account_id TEXT,
  facebook_page_id TEXT,
  instagram_username TEXT,

  -- Auth & Webhook
  access_token TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  webhook_url TEXT,
  webhook_id TEXT,

  -- Operational
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending', 'error')),
  default_queue TEXT DEFAULT 'geral',
  error_message TEXT,
  meta_app_id TEXT DEFAULT '440046068424112',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_channel_integrations_tenant ON public.channel_integrations(tenant_id);
CREATE INDEX idx_channel_integrations_provider ON public.channel_integrations(tenant_id, provider);
CREATE UNIQUE INDEX idx_channel_integrations_phone ON public.channel_integrations(phone_number_id) WHERE phone_number_id IS NOT NULL;
CREATE UNIQUE INDEX idx_channel_integrations_instagram ON public.channel_integrations(instagram_business_account_id) WHERE instagram_business_account_id IS NOT NULL;

-- RLS
ALTER TABLE public.channel_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant integrations"
  ON public.channel_integrations FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage integrations"
  ON public.channel_integrations FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'superadmin'))
  WITH CHECK (public.get_my_role() IN ('admin', 'superadmin'));

CREATE POLICY "Nexus users can manage all integrations"
  ON public.channel_integrations FOR ALL TO authenticated
  USING (public.is_nexus_user())
  WITH CHECK (public.is_nexus_user());

-- 2. OAuth States — anti-CSRF, temporário
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('WABA', 'INSTAGRAM')),
  state_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  redirect_uri TEXT NOT NULL,
  meta_config_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_oauth_states_token ON public.oauth_states(state_token);
CREATE INDEX idx_oauth_states_cleanup ON public.oauth_states(expires_at) WHERE used = FALSE;

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage oauth states"
  ON public.oauth_states FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'superadmin'))
  WITH CHECK (public.get_my_role() IN ('admin', 'superadmin'));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_channel_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_channel_integrations_updated
  BEFORE UPDATE ON public.channel_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_channel_integration_timestamp();
