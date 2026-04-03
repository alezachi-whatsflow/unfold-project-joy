-- ============================================================
-- GOOGLE CALENDAR INTEGRATION
-- OAuth2 tokens per tenant for calendar read/write
-- Used by Assistente Autonomo to create events + Meet links
-- ============================================================

CREATE TABLE IF NOT EXISTS public.google_calendar_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Google Account
  google_email TEXT NOT NULL,
  google_name TEXT,

  -- OAuth2 Tokens (encrypted at rest by Supabase)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['https://www.googleapis.com/auth/calendar'],

  -- Config
  default_calendar_id TEXT DEFAULT 'primary',
  auto_add_meet BOOLEAN DEFAULT true, -- auto-create Google Meet link
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, google_email)
);

ALTER TABLE public.google_calendar_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict_Tenant_Isolation" ON public.google_calendar_configs FOR ALL TO authenticated
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

CREATE INDEX idx_gcal_tenant ON public.google_calendar_configs (tenant_id, is_active);

GRANT ALL ON public.google_calendar_configs TO authenticated;

COMMENT ON TABLE public.google_calendar_configs IS 'OAuth2 tokens do Google Calendar por tenant. Usado pelo Assistente Autonomo para criar eventos. Nivel: TENANT.';
