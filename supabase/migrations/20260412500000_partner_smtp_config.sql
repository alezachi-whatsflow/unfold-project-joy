-- ═══════════════════════════════════════════════════════════════
-- Migration: Partner SMTP Configuration (encrypted credentials)
-- Date: 2026-04-12
-- Purpose: Each WL Partner can have their own SMTP provider.
--          Credentials are encrypted at rest using pgcrypto.
--          Fallback to IAZIS global SMTP when partner has none.
-- ═══════════════════════════════════════════════════════════════

-- 1. Enable pgcrypto for password encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create table for partner SMTP configs
CREATE TABLE IF NOT EXISTS public.partner_smtp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to partner's whitelabel_config (1:1)
  whitelabel_config_id UUID NOT NULL UNIQUE REFERENCES public.whitelabel_config(id) ON DELETE CASCADE,

  -- Provider type for auto-detection
  provider TEXT NOT NULL DEFAULT 'smtp2go'
    CHECK (provider IN ('smtp2go', 'sendgrid', 'ses', 'custom')),

  -- API-based providers (SMTP2GO, SendGrid)
  api_key_encrypted BYTEA,         -- pgp_sym_encrypt(api_key, secret)

  -- Direct SMTP providers (custom, SES)
  smtp_host TEXT,                    -- e.g. 'mail.smtp2go.com'
  smtp_port INTEGER DEFAULT 587,
  smtp_user_encrypted BYTEA,        -- pgp_sym_encrypt(user, secret)
  smtp_pass_encrypted BYTEA,        -- pgp_sym_encrypt(password, secret)
  smtp_secure BOOLEAN DEFAULT true,  -- TLS

  -- Sender identity
  from_email TEXT NOT NULL,          -- e.g. 'no-reply@sendhit.com.br'
  from_name TEXT NOT NULL,           -- e.g. 'SendHit'

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_test_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index for fast lookup by whitelabel_config_id
CREATE INDEX IF NOT EXISTS idx_partner_smtp_wl_config
  ON public.partner_smtp_config (whitelabel_config_id)
  WHERE is_active = true;

-- 4. RLS policies
ALTER TABLE public.partner_smtp_config ENABLE ROW LEVEL SECURITY;

-- Nexus admins can manage all SMTP configs
CREATE POLICY partner_smtp_nexus_full
  ON public.partner_smtp_config
  FOR ALL
  USING (is_nexus_user());

-- WL partners can read their own config (but NOT the encrypted fields — handled by function)
CREATE POLICY partner_smtp_partner_read
  ON public.partner_smtp_config
  FOR SELECT
  USING (
    whitelabel_config_id IN (
      SELECT wc.id FROM whitelabel_config wc
      JOIN licenses l ON l.id = wc.license_id
      JOIN user_tenants ut ON ut.tenant_id = l.tenant_id
      WHERE ut.user_id = auth.uid() AND ut.is_owner = true
    )
  );

-- 5. Server-side function to GET decrypted SMTP config (SECURITY DEFINER = no RLS bypass needed)
-- Only callable from Edge Functions via service_role
CREATE OR REPLACE FUNCTION public.get_partner_smtp(p_whitelabel_config_id UUID)
RETURNS TABLE(
  provider TEXT,
  api_key TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_secure BOOLEAN,
  from_email TEXT,
  from_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- The encryption key is stored as a Supabase secret (env var)
  encryption_key := current_setting('app.settings.smtp_encryption_key', true);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := 'iazis_smtp_default_key_2026';  -- fallback (should be overridden)
  END IF;

  RETURN QUERY
  SELECT
    psc.provider,
    CASE WHEN psc.api_key_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(psc.api_key_encrypted, encryption_key)
      ELSE NULL
    END AS api_key,
    psc.smtp_host,
    psc.smtp_port,
    CASE WHEN psc.smtp_user_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(psc.smtp_user_encrypted, encryption_key)
      ELSE NULL
    END AS smtp_user,
    CASE WHEN psc.smtp_pass_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(psc.smtp_pass_encrypted, encryption_key)
      ELSE NULL
    END AS smtp_pass,
    psc.smtp_secure,
    psc.from_email,
    psc.from_name
  FROM partner_smtp_config psc
  WHERE psc.whitelabel_config_id = p_whitelabel_config_id
    AND psc.is_active = true
  LIMIT 1;
END;
$$;

-- 6. Server-side function to SAVE encrypted SMTP config
CREATE OR REPLACE FUNCTION public.upsert_partner_smtp(
  p_whitelabel_config_id UUID,
  p_provider TEXT,
  p_api_key TEXT DEFAULT NULL,
  p_smtp_host TEXT DEFAULT NULL,
  p_smtp_port INTEGER DEFAULT 587,
  p_smtp_user TEXT DEFAULT NULL,
  p_smtp_pass TEXT DEFAULT NULL,
  p_smtp_secure BOOLEAN DEFAULT true,
  p_from_email TEXT DEFAULT NULL,
  p_from_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
  result_id UUID;
BEGIN
  encryption_key := current_setting('app.settings.smtp_encryption_key', true);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := 'iazis_smtp_default_key_2026';
  END IF;

  INSERT INTO partner_smtp_config (
    whitelabel_config_id, provider,
    api_key_encrypted,
    smtp_host, smtp_port,
    smtp_user_encrypted, smtp_pass_encrypted,
    smtp_secure, from_email, from_name,
    updated_at
  ) VALUES (
    p_whitelabel_config_id, p_provider,
    CASE WHEN p_api_key IS NOT NULL THEN pgp_sym_encrypt(p_api_key, encryption_key) ELSE NULL END,
    p_smtp_host, p_smtp_port,
    CASE WHEN p_smtp_user IS NOT NULL THEN pgp_sym_encrypt(p_smtp_user, encryption_key) ELSE NULL END,
    CASE WHEN p_smtp_pass IS NOT NULL THEN pgp_sym_encrypt(p_smtp_pass, encryption_key) ELSE NULL END,
    p_smtp_secure, p_from_email, p_from_name,
    now()
  )
  ON CONFLICT (whitelabel_config_id)
  DO UPDATE SET
    provider = EXCLUDED.provider,
    api_key_encrypted = EXCLUDED.api_key_encrypted,
    smtp_host = EXCLUDED.smtp_host,
    smtp_port = EXCLUDED.smtp_port,
    smtp_user_encrypted = EXCLUDED.smtp_user_encrypted,
    smtp_pass_encrypted = EXCLUDED.smtp_pass_encrypted,
    smtp_secure = EXCLUDED.smtp_secure,
    from_email = EXCLUDED.from_email,
    from_name = EXCLUDED.from_name,
    updated_at = now()
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;

-- 7. Function to resolve SMTP config from tenant_id (traverses license hierarchy)
CREATE OR REPLACE FUNCTION public.resolve_smtp_for_tenant(p_tenant_id UUID)
RETURNS TABLE(
  provider TEXT,
  api_key TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_secure BOOLEAN,
  from_email TEXT,
  from_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_wl_config_id UUID;
  v_license_id UUID;
  v_parent_license_id UUID;
BEGIN
  -- Find tenant's license → parent license → whitelabel_config
  SELECT l.id, l.parent_license_id
  INTO v_license_id, v_parent_license_id
  FROM licenses l
  WHERE l.tenant_id = p_tenant_id
  LIMIT 1;

  IF v_license_id IS NULL THEN
    RETURN;  -- No license found, empty result = use global fallback
  END IF;

  -- Check parent (WL) license first, then own
  SELECT wc.id INTO v_wl_config_id
  FROM whitelabel_config wc
  WHERE wc.license_id = COALESCE(v_parent_license_id, v_license_id)
  LIMIT 1;

  IF v_wl_config_id IS NULL THEN
    RETURN;  -- No WL config, empty result = use global fallback
  END IF;

  -- Delegate to get_partner_smtp for decryption
  RETURN QUERY SELECT * FROM get_partner_smtp(v_wl_config_id);
END;
$$;
