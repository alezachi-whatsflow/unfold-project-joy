-- Fix asaas_expenses RLS to use the correct function pattern
DROP POLICY IF EXISTS "Tenant isolation on asaas_expenses" ON public.asaas_expenses;
CREATE POLICY "Strict_Tenant_Isolation_asaas_expenses" ON public.asaas_expenses
  FOR ALL TO authenticated
  USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
  WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));

-- Also grant access to the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asaas_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asaas_expenses TO anon;
