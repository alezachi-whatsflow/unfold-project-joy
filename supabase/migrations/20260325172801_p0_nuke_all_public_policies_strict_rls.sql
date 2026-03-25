-- ═══════════════════════════════════════════════════════════════
-- P0 NUCLEAR FIX: Remove ALL "USING (true)" policies and enforce
-- Strict_Tenant_Isolation on every table with tenant_id.
--
-- ROOT CAUSE: 80+ policies with USING(true) ("Allow public *")
-- were created by Lovable/Supabase auto-generated defaults.
-- In PostgreSQL, policies are OR'd — one USING(true) policy
-- makes ALL other restrictive policies meaningless.
--
-- This migration:
-- 1. Drops every USING(true) policy (except Service role bypass)
-- 2. Applies Strict_Tenant_Isolation to all 43+ tables with tenant_id
-- 3. Keeps WA_Messages_Security for instance-based isolation
-- 4. Keeps Profiles_Security for user-based isolation
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Remove ALL dangerous USING(true) policies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT cls.relname AS tbl, pol.polname AS pol
    FROM pg_policy pol
    JOIN pg_class cls ON cls.oid = pol.polrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    WHERE ns.nspname = 'public'
      AND pg_get_expr(pol.polqual, pol.polrelid) = 'true'
      AND pol.polname NOT LIKE '%Service role%'
      AND pol.polname NOT LIKE '%nexus%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
  END LOOP;
END $$;

-- Step 2: Apply Strict_Tenant_Isolation to ALL UUID tenant_id tables
DO $$
DECLARE
  t_name text;
  uuid_tables text[] := ARRAY[
    'activities','ai_configurations','asaas_connections','asaas_customers',
    'asaas_expenses','asaas_payments','asaas_revenue','asaas_splits',
    'audit_logs','channel_integrations','chat_messages','checkout_sources',
    'commercial_profiles','commission_rules','company_profile','conversations',
    'crm_contacts','deal_qualifications','dunning_executions','dunning_rules',
    'financial_entries','icp_profiles','icp_questionnaires','license_history',
    'message_logs','negocios','notifications','oauth_states',
    'payment_dunnings','prospect_campaigns','revenue_rules','sales_people',
    'sales_targets','tasks','webhook_events','whatsapp_billing_rules',
    'whatsapp_connections','whatsapp_instances','whatsapp_messages'
  ];
BEGIN
  FOREACH t_name IN ARRAY uuid_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
      EXECUTE format('DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.%I', t_name);
      EXECUTE format(
        'CREATE POLICY "Strict_Tenant_Isolation" ON public.%I FOR ALL '
        'USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids())) '
        'WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))',
        t_name
      );
    END IF;
  END LOOP;
END $$;

-- Step 3: Apply to TEXT tenant_id tables (need ::uuid cast)
DO $$
DECLARE
  t_name text;
  text_tables text[] := ARRAY['sales_pipelines','manual_articles','meta_connections','tutorials'];
BEGIN
  FOREACH t_name IN ARRAY text_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
      EXECUTE format('DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.%I', t_name);
      EXECUTE format(
        'CREATE POLICY "Strict_Tenant_Isolation" ON public.%I FOR ALL '
        'USING (is_nexus_user() OR tenant_id::uuid IN (SELECT get_authorized_tenant_ids())) '
        'WITH CHECK (is_nexus_user() OR tenant_id::uuid IN (SELECT get_authorized_tenant_ids()))',
        t_name
      );
    END IF;
  END LOOP;
END $$;
