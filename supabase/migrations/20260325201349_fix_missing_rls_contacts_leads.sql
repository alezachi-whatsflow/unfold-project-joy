-- Fix tables that lost ALL policies after the nuclear RLS cleanup
-- These tables don't have tenant_id, so they use instance_name → tenant mapping

CREATE POLICY "Instance_Tenant_Isolation" ON whatsapp_contacts FOR ALL
USING (is_nexus_user() OR instance_name IN (
  SELECT instance_name FROM whatsapp_instances WHERE tenant_id IN (SELECT get_authorized_tenant_ids())
));

CREATE POLICY "Instance_Tenant_Isolation" ON whatsapp_leads FOR ALL
USING (is_nexus_user() OR instance_name IN (
  SELECT instance_name FROM whatsapp_instances WHERE tenant_id IN (SELECT get_authorized_tenant_ids())
));

CREATE POLICY "Instance_Tenant_Isolation" ON whatsapp_campaigns FOR ALL
USING (is_nexus_user() OR instance_name IN (
  SELECT instance_name FROM whatsapp_instances WHERE tenant_id IN (SELECT get_authorized_tenant_ids())
));

CREATE POLICY "Authenticated_Access" ON customers FOR ALL TO authenticated USING (true);