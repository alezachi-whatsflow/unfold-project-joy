-- ══════════════════════════════════════════════════════════════════════════
-- STRICT RLS AUDIT — Tenant Isolation + Admin Core (formerly Nexus)
-- Ensures no cross-tenant data leakage
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Rename is_nexus_user → is_admin_core_user (rebranding)
CREATE OR REPLACE FUNCTION public.is_admin_core_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM nexus_users
    WHERE auth_user_id = auth.uid()
      AND is_active = true
      AND role IN ('nexus_superadmin', 'nexus_admin', 'admin_core_superadmin', 'admin_core_admin')
  );
$$;

-- Keep backward compat
CREATE OR REPLACE FUNCTION public.is_nexus_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_core_user();
$$;

-- 2. Optimized tenant resolution function (cached via STABLE)
CREATE OR REPLACE FUNCTION public.get_my_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid();
$$;

-- 3. Ensure RLS is enabled on ALL sensitive tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'whatsapp_instances', 'whatsapp_messages', 'whatsapp_leads', 'whatsapp_contacts',
    'channel_integrations', 'asaas_connections', 'asaas_customers', 'asaas_payments',
    'licenses', 'profiles', 'user_tenants', 'tenants',
    'departments', 'sla_rules', 'quick_replies', 'contact_tags',
    'whatsapp_groups', 'activities', 'tickets', 'negocios'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END;
  END LOOP;
END;
$$;

-- 4. Grant usage to the helper functions
GRANT EXECUTE ON FUNCTION public.is_admin_core_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_nexus_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_ids() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_authorized_tenant_ids() TO authenticated;
