-- ═══════════════════════════════════════════════════════════════
-- Nexus WhatsApp Providers — centralized provider management
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.whatsapp_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  base_url TEXT NOT NULL,
  admin_token TEXT,
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  max_instances INTEGER DEFAULT 0,
  current_instances INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link: which provider each license uses
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS whatsapp_provider_id UUID REFERENCES whatsapp_providers(id) ON DELETE SET NULL;

-- RLS: only nexus users can manage providers
ALTER TABLE whatsapp_providers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_providers' AND policyname = 'nexus_manage_providers') THEN
    CREATE POLICY "nexus_manage_providers" ON public.whatsapp_providers FOR ALL
      USING (is_nexus_user()) WITH CHECK (is_nexus_user());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_providers' AND policyname = 'authenticated_read_providers') THEN
    CREATE POLICY "authenticated_read_providers" ON public.whatsapp_providers FOR SELECT
      TO authenticated USING (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_providers TO anon, authenticated;

-- Seed: uazapi as default provider
INSERT INTO whatsapp_providers (name, slug, description, base_url, admin_token, is_active, is_default, max_instances)
VALUES (
  'uazapi v2', 'uazapi',
  'WhatsApp Web via Baileys — QR Code, multi-device',
  'https://whatsflow.uazapi.com',
  'Ip837aAHpTp4NEq7RUxgwIKdoA702Ijt7Y0JEYeLmoDicPvn07',
  true, true, 1000
) ON CONFLICT (slug) DO NOTHING;

-- Seed: Z-API as inactive provider
INSERT INTO whatsapp_providers (name, slug, description, base_url, is_active, is_default)
VALUES (
  'Z-API', 'zapi',
  'WhatsApp Web via Z-API — conexão por token',
  'https://api.z-api.io',
  false, false
) ON CONFLICT (slug) DO NOTHING;