-- ═══════════════════════════════════════════════════════════════
-- RLS V2 — Strict Multi-Tenancy Isolation
-- Nexus → WhiteLabel → Tenant
-- ═══════════════════════════════════════════════════════════════

-- 1. Function: check if current user is an active Nexus admin
CREATE OR REPLACE FUNCTION public.is_nexus_user() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM nexus_users WHERE auth_user_id = auth.uid() AND is_active = true);
$$;

-- 2. Function: return all tenant IDs the current user is authorized to access
CREATE OR REPLACE FUNCTION public.get_authorized_tenant_ids() RETURNS SETOF uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN QUERY
  -- Direct tenant access (admin, gestor, consultor)
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  UNION
  -- Sub-tenants via WhiteLabel ownership
  SELECT l_child.tenant_id FROM licenses l_child
  JOIN licenses l_parent ON l_child.parent_license_id = l_parent.id
  JOIN user_tenants ut ON ut.tenant_id = l_parent.tenant_id
  WHERE ut.user_id = auth.uid() AND ut.is_owner = true AND l_parent.license_type = 'whitelabel';
END;
$$;

-- 3. Apply Strict_Tenant_Isolation to all tables with tenant_id column
DO $$
DECLARE
  t_name text;
  tables_with_tenant text[] := ARRAY[
    'negocios', 'financial_entries', 'crm_contacts', 'activities',
    'asaas_payments', 'asaas_customers', 'asaas_revenue', 'asaas_expenses',
    'channel_integrations', 'conversations', 'chat_messages', 'whatsapp_connections'
  ];
BEGIN
  FOREACH t_name IN ARRAY tables_with_tenant LOOP
    -- Only apply if table actually exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
      EXECUTE format('DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.%I;', t_name);
      EXECUTE format(
        'CREATE POLICY "Strict_Tenant_Isolation" ON public.%I FOR ALL '
        'USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids())) '
        'WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));',
        t_name
      );
    END IF;
  END LOOP;
END $$;

-- 4. Profiles: user sees own profile + profiles in same tenant + nexus sees all
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles_Security" ON public.profiles;
CREATE POLICY "Profiles_Security" ON public.profiles FOR ALL
USING (
  id = auth.uid()
  OR is_nexus_user()
  OR id IN (SELECT user_id FROM user_tenants WHERE tenant_id IN (SELECT get_authorized_tenant_ids()))
);

-- 5. WhatsApp Messages: isolated by instance → tenant relationship
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "WA_Messages_Security" ON public.whatsapp_messages;
CREATE POLICY "WA_Messages_Security" ON public.whatsapp_messages FOR ALL
USING (
  is_nexus_user()
  OR instance_name IN (SELECT instance_name FROM whatsapp_instances WHERE tenant_id IN (SELECT get_authorized_tenant_ids()))
);
