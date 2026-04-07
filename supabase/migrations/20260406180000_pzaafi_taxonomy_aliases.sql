-- ============================================================================
-- Pzaafi Taxonomy Migration — Safe Aliases via VIEWs
--
-- Strategy: Create VIEWs with new names pointing to existing tables.
-- This allows new code to use new names while old code continues working.
-- No data migration, no broken queries, no downtime.
--
-- Mapping:
--   nexus_users       → admin_core_users (VIEW)
--   whitelabel_config → pzaafi_partners  (VIEW)
--   license_type='whitelabel' → license_type='partner' (added alias)
-- ============================================================================

-- 1. admin_core_users — VIEW alias for nexus_users
CREATE OR REPLACE VIEW public.admin_core_users AS
  SELECT * FROM public.nexus_users;

-- Allow inserts/updates via the view
CREATE OR REPLACE RULE admin_core_users_insert AS
  ON INSERT TO public.admin_core_users
  DO INSTEAD INSERT INTO public.nexus_users VALUES (NEW.*);

CREATE OR REPLACE RULE admin_core_users_update AS
  ON UPDATE TO public.admin_core_users
  DO INSTEAD UPDATE public.nexus_users SET
    auth_user_id = NEW.auth_user_id,
    email = NEW.email,
    full_name = NEW.full_name,
    role = NEW.role,
    is_active = NEW.is_active,
    avatar_url = NEW.avatar_url,
    updated_at = NEW.updated_at
  WHERE id = OLD.id;

CREATE OR REPLACE RULE admin_core_users_delete AS
  ON DELETE TO public.admin_core_users
  DO INSTEAD DELETE FROM public.nexus_users WHERE id = OLD.id;

-- 2. pzaafi_partners — VIEW alias for whitelabel_config
CREATE OR REPLACE VIEW public.pzaafi_partners AS
  SELECT
    wc.*,
    l.tenant_id,
    l.status as license_status,
    l.monthly_value,
    l.pool_max_attendants,
    l.pool_max_devices_web,
    l.pool_max_devices_meta
  FROM public.whitelabel_config wc
  JOIN public.licenses l ON l.id = wc.license_id;

-- 3. Helper function: is_admin_core_user() — alias for is_nexus_user()
CREATE OR REPLACE FUNCTION public.is_admin_core_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.is_nexus_user();
$$;

-- 4. Add partner_id as alias column on licenses (nullable, maps to parent_license)
-- For new code: partner_id = the license_id of the Pzaafi Partner
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS partner_id UUID;

-- Backfill: set partner_id = parent_license_id for all individual licenses under WLs
UPDATE public.licenses
SET partner_id = parent_license_id
WHERE parent_license_id IS NOT NULL
  AND license_type = 'individual'
  AND partner_id IS NULL;

-- 5. Add brand metadata to tenants for Pzaafi branding
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS brand_name TEXT DEFAULT 'Pzaafi',
  ADD COLUMN IF NOT EXISTS brand_config JSONB DEFAULT '{}';

-- 6. Taxonomy constants table (for UI reference)
CREATE TABLE IF NOT EXISTS public.platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.platform_config (key, value) VALUES
  ('brand', '{"name":"Pzaafi","tagline":"Ambient Intelligence","version":"5.0"}'),
  ('taxonomy', '{"admin_panel":"Admin Core","partner_panel":"Pzaafi Partners","client_panel":"Pzaafi App"}'),
  ('colors', '{"primary":"#478BFF","accent":"#39F7B2","background":"#0D0E14","surface":"#121419","border":"#1E3757","foreground":"#E5E8ED"}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

COMMENT ON VIEW public.admin_core_users IS 'Alias for nexus_users — Pzaafi Admin Core team';
COMMENT ON VIEW public.pzaafi_partners IS 'Alias for whitelabel_config — Pzaafi Partners (resellers)';
COMMENT ON FUNCTION public.is_admin_core_user IS 'Alias for is_nexus_user()';
