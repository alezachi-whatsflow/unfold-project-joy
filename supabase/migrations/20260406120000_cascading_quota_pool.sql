-- ============================================================================
-- Cascading Quota Pool System
-- Adds pool allocation columns to licenses (for WL parents)
-- and quota tracking for resource distribution Nexus → WL → Tenant
-- ============================================================================

-- 1. Add pool quota columns to licenses table
-- These define the MAXIMUM resources a WhiteLabel can distribute to its tenants
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS pool_max_attendants    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pool_max_devices_web   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pool_max_devices_meta  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pool_max_messages      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pool_max_storage_gb    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pool_max_ai_agents     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pool_enabled_modules   JSONB DEFAULT '[]'::jsonb;

-- 2. Add module-level controls to whitelabel_config
ALTER TABLE public.whitelabel_config
  ADD COLUMN IF NOT EXISTS modules_crm          BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS modules_financeiro   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS modules_mensageria   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS modules_ia           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS modules_pzaafi       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS modules_intelligence BOOLEAN DEFAULT false;

-- 3. DB function: calculate consumed resources for a parent license
-- Sums ALL child licenses' allocated resources
CREATE OR REPLACE FUNCTION public.get_pool_consumed(parent_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'attendants',   COALESCE(SUM(base_attendants + extra_attendants), 0),
      'devices_web',  COALESCE(SUM(base_devices_web + extra_devices_web), 0),
      'devices_meta', COALESCE(SUM(base_devices_meta + extra_devices_meta), 0),
      'messages',     COALESCE(SUM(monthly_messages_limit), 0),
      'storage_gb',   COALESCE(SUM(storage_limit_gb), 0),
      'ai_agents',    COALESCE(SUM(ai_agents_limit), 0),
      'ai_modules',   COUNT(*) FILTER (WHERE has_ai_module = true),
      'total_licenses', COUNT(*)
    )
    FROM public.licenses
    WHERE parent_license_id = parent_id
      AND status IN ('active', 'trial')
    ),
    '{"attendants":0,"devices_web":0,"devices_meta":0,"messages":0,"storage_gb":0,"ai_agents":0,"ai_modules":0,"total_licenses":0}'::jsonb
  );
$$;

-- 4. DB function: get available (remaining) pool for a parent
CREATE OR REPLACE FUNCTION public.get_pool_available(parent_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'attendants',   p.pool_max_attendants   - COALESCE((c->>'attendants')::int, 0),
    'devices_web',  p.pool_max_devices_web  - COALESCE((c->>'devices_web')::int, 0),
    'devices_meta', p.pool_max_devices_meta - COALESCE((c->>'devices_meta')::int, 0),
    'messages',     p.pool_max_messages     - COALESCE((c->>'messages')::int, 0),
    'storage_gb',   p.pool_max_storage_gb   - COALESCE((c->>'storage_gb')::int, 0),
    'ai_agents',    p.pool_max_ai_agents    - COALESCE((c->>'ai_agents')::int, 0),
    'max_licenses', COALESCE(wc.max_sub_licenses, 50) - COALESCE((c->>'total_licenses')::int, 0)
  )
  FROM public.licenses p
  LEFT JOIN public.whitelabel_config wc ON wc.license_id = p.id
  CROSS JOIN LATERAL public.get_pool_consumed(p.id) AS c
  WHERE p.id = parent_id;
$$;

-- 5. DB function: validate a child license does not exceed parent pool
-- Returns NULL if valid, or a text error message if quota exceeded
CREATE OR REPLACE FUNCTION public.validate_quota_allocation(
  p_parent_id UUID,
  p_child_license_id UUID,  -- NULL for new license
  p_attendants INT,
  p_devices_web INT,
  p_devices_meta INT,
  p_messages INT DEFAULT 0,
  p_storage_gb INT DEFAULT 0,
  p_ai_agents INT DEFAULT 0,
  p_has_ai BOOLEAN DEFAULT false
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  parent_pool RECORD;
  consumed JSONB;
  current_att INT := 0;
  current_dw INT := 0;
  current_dm INT := 0;
  current_msg INT := 0;
  current_stg INT := 0;
  current_ai INT := 0;
  violations TEXT[] := '{}';
BEGIN
  -- Get parent limits
  SELECT pool_max_attendants, pool_max_devices_web, pool_max_devices_meta,
         pool_max_messages, pool_max_storage_gb, pool_max_ai_agents,
         has_ai_module AS parent_has_ai
  INTO parent_pool
  FROM public.licenses
  WHERE id = p_parent_id;

  IF NOT FOUND THEN
    RETURN 'Licença pai não encontrada';
  END IF;

  -- Get current consumed (excluding the child being edited)
  SELECT jsonb_build_object(
    'attendants',   COALESCE(SUM(base_attendants + extra_attendants), 0),
    'devices_web',  COALESCE(SUM(base_devices_web + extra_devices_web), 0),
    'devices_meta', COALESCE(SUM(base_devices_meta + extra_devices_meta), 0),
    'messages',     COALESCE(SUM(monthly_messages_limit), 0),
    'storage_gb',   COALESCE(SUM(storage_limit_gb), 0),
    'ai_agents',    COALESCE(SUM(ai_agents_limit), 0)
  ) INTO consumed
  FROM public.licenses
  WHERE parent_license_id = p_parent_id
    AND status IN ('active', 'trial')
    AND (p_child_license_id IS NULL OR id != p_child_license_id);

  current_att := COALESCE((consumed->>'attendants')::int, 0);
  current_dw  := COALESCE((consumed->>'devices_web')::int, 0);
  current_dm  := COALESCE((consumed->>'devices_meta')::int, 0);
  current_msg := COALESCE((consumed->>'messages')::int, 0);
  current_stg := COALESCE((consumed->>'storage_gb')::int, 0);
  current_ai  := COALESCE((consumed->>'ai_agents')::int, 0);

  -- Validate each resource (only if parent pool > 0, meaning limit is set)
  IF parent_pool.pool_max_attendants > 0 AND (current_att + p_attendants) > parent_pool.pool_max_attendants THEN
    violations := array_append(violations,
      format('Atendentes: %s + %s = %s (limite: %s)', current_att, p_attendants, current_att + p_attendants, parent_pool.pool_max_attendants));
  END IF;

  IF parent_pool.pool_max_devices_web > 0 AND (current_dw + p_devices_web) > parent_pool.pool_max_devices_web THEN
    violations := array_append(violations,
      format('Dispositivos Web: %s + %s = %s (limite: %s)', current_dw, p_devices_web, current_dw + p_devices_web, parent_pool.pool_max_devices_web));
  END IF;

  IF parent_pool.pool_max_devices_meta > 0 AND (current_dm + p_devices_meta) > parent_pool.pool_max_devices_meta THEN
    violations := array_append(violations,
      format('Dispositivos Meta: %s + %s = %s (limite: %s)', current_dm, p_devices_meta, current_dm + p_devices_meta, parent_pool.pool_max_devices_meta));
  END IF;

  IF parent_pool.pool_max_messages > 0 AND (current_msg + p_messages) > parent_pool.pool_max_messages THEN
    violations := array_append(violations,
      format('Mensagens: %s + %s = %s (limite: %s)', current_msg, p_messages, current_msg + p_messages, parent_pool.pool_max_messages));
  END IF;

  IF parent_pool.pool_max_storage_gb > 0 AND (current_stg + p_storage_gb) > parent_pool.pool_max_storage_gb THEN
    violations := array_append(violations,
      format('Storage: %s + %s = %s GB (limite: %s GB)', current_stg, p_storage_gb, current_stg + p_storage_gb, parent_pool.pool_max_storage_gb));
  END IF;

  -- AI module: child can't have AI if parent doesn't
  IF p_has_ai AND NOT parent_pool.parent_has_ai THEN
    violations := array_append(violations, 'Módulo I.A. não habilitado na licença pai');
  END IF;

  IF array_length(violations, 1) > 0 THEN
    RETURN array_to_string(violations, '; ');
  END IF;

  RETURN NULL; -- valid
END;
$$;

-- 6. Backfill existing WhiteLabels with sensible pool defaults
-- Set pool limits = current WL own resources × 10 (generous initial pool)
UPDATE public.licenses
SET
  pool_max_attendants  = (base_attendants + extra_attendants) * 10,
  pool_max_devices_web = (base_devices_web + extra_devices_web) * 10,
  pool_max_devices_meta = (base_devices_meta + extra_devices_meta) * 10,
  pool_max_messages    = GREATEST(monthly_messages_limit, 100000),
  pool_max_storage_gb  = GREATEST(storage_limit_gb * 10, 10),
  pool_max_ai_agents   = CASE WHEN has_ai_module THEN 20 ELSE 0 END
WHERE license_type = 'whitelabel';

-- 7. Backfill whitelabel_config module flags
UPDATE public.whitelabel_config wc
SET
  modules_crm = true,
  modules_financeiro = true,
  modules_mensageria = true,
  modules_ia = l.has_ai_module,
  modules_pzaafi = false,
  modules_intelligence = l.has_ai_module
FROM public.licenses l
WHERE wc.license_id = l.id;

-- Done
COMMENT ON FUNCTION public.get_pool_consumed IS 'Returns consumed resources across all active child licenses of a parent';
COMMENT ON FUNCTION public.get_pool_available IS 'Returns remaining allocatable resources for a parent license';
COMMENT ON FUNCTION public.validate_quota_allocation IS 'Validates child license does not exceed parent pool. Returns NULL if OK, error text if exceeded.';
