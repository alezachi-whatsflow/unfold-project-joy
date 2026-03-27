-- Fix tables that lost ALL policies after the nuclear RLS cleanup
-- These tables don't have tenant_id, so they use instance_name → tenant mapping

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_contacts' AND policyname = 'Instance_Tenant_Isolation') THEN
    CREATE POLICY "Instance_Tenant_Isolation" ON public.whatsapp_contacts FOR ALL
    USING (is_nexus_user() OR instance_name IN (
      SELECT instance_name FROM whatsapp_instances WHERE tenant_id IN (SELECT get_authorized_tenant_ids())
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_leads' AND policyname = 'Instance_Tenant_Isolation') THEN
    CREATE POLICY "Instance_Tenant_Isolation" ON public.whatsapp_leads FOR ALL
    USING (is_nexus_user() OR instance_name IN (
      SELECT instance_name FROM whatsapp_instances WHERE tenant_id IN (SELECT get_authorized_tenant_ids())
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_campaigns' AND policyname = 'Instance_Tenant_Isolation') THEN
    CREATE POLICY "Instance_Tenant_Isolation" ON public.whatsapp_campaigns FOR ALL
    USING (is_nexus_user() OR instance_name IN (
      SELECT instance_name FROM whatsapp_instances WHERE tenant_id IN (SELECT get_authorized_tenant_ids())
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Authenticated_Access') THEN
    CREATE POLICY "Authenticated_Access" ON public.customers FOR ALL TO authenticated USING (true);
  END IF;
END $$;
