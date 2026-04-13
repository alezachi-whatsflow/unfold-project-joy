-- ═══════════════════════════════════════════════════════════════
-- Migration: Custom Domain Resolution for WL Partners
-- Date: 2026-04-12
-- Purpose: Ensure custom_domain has proper index + RLS for
--          domain-based routing (partner visits their own URL)
-- ═══════════════════════════════════════════════════════════════

-- 1. Ensure custom_domain column exists and is UNIQUE on whitelabel_config
-- (column already exists from earlier migration, but add index if missing)
DO $$
BEGIN
  -- Add unique index for fast domain lookups (used by useWhiteLabelBranding)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'whitelabel_config'
    AND indexname = 'idx_whitelabel_config_custom_domain'
  ) THEN
    CREATE UNIQUE INDEX idx_whitelabel_config_custom_domain
    ON public.whitelabel_config (custom_domain)
    WHERE custom_domain IS NOT NULL;
  END IF;
END $$;

-- 2. Same for whitelabel_branding table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'whitelabel_branding'
    AND indexname = 'idx_whitelabel_branding_custom_domain'
  ) THEN
    CREATE UNIQUE INDEX idx_whitelabel_branding_custom_domain
    ON public.whitelabel_branding (custom_domain)
    WHERE custom_domain IS NOT NULL;
  END IF;
END $$;

-- 3. RLS policy: allow ANY authenticated user to read whitelabel_config
-- (needed so domain-resolver can look up partner branding before tenant context is known)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'whitelabel_config'
    AND policyname = 'wl_config_read_for_domain_resolution'
  ) THEN
    CREATE POLICY wl_config_read_for_domain_resolution
    ON public.whitelabel_config
    FOR SELECT
    USING (true);  -- Any authenticated user can read WL configs (branding is public info)
  END IF;
END $$;

-- 4. Same for whitelabel_branding (branding colors/logos are public info)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'whitelabel_branding'
    AND policyname = 'wl_branding_read_for_domain_resolution'
  ) THEN
    CREATE POLICY wl_branding_read_for_domain_resolution
    ON public.whitelabel_branding
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- 5. Helper function: resolve tenant_id from custom domain
-- Useful for edge functions and backend queries
CREATE OR REPLACE FUNCTION public.resolve_tenant_by_domain(p_domain TEXT)
RETURNS TABLE(tenant_id UUID, license_id UUID, slug TEXT, display_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_domain TEXT;
BEGIN
  -- Strip www. prefix
  clean_domain := regexp_replace(p_domain, '^www\.', '');

  RETURN QUERY
  SELECT l.tenant_id, wc.license_id, wc.slug, wc.display_name
  FROM whitelabel_config wc
  JOIN licenses l ON l.id = wc.license_id
  WHERE wc.custom_domain = clean_domain
     OR wc.custom_domain = 'www.' || clean_domain
  LIMIT 1;
END;
$$;

-- 6. Seed: set custom_domain for Whatsflow partner (if exists)
-- This is the first partner — sets their custom domain for domain-based routing
UPDATE public.whitelabel_config
SET custom_domain = 'new.whatsflow.com.br',
    updated_at = now()
WHERE slug = 'whatsflow'
  AND (custom_domain IS NULL OR custom_domain = '');
