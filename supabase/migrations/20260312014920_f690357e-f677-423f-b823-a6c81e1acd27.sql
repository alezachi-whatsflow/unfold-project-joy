
-- Table to store Meta Business API (API Oficial) connection credentials
CREATE TABLE public.meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT ''::text,
  app_id TEXT NOT NULL,
  app_secret TEXT,
  config_id TEXT NOT NULL,
  access_token TEXT,
  waba_id TEXT,
  phone_number_id TEXT,
  phone_display TEXT,
  webhook_verify_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their meta connections
CREATE POLICY "Users can view meta connections" ON public.meta_connections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert meta connections" ON public.meta_connections
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update meta connections" ON public.meta_connections
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
