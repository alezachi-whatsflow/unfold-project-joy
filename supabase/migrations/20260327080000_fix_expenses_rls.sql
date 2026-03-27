-- Allow tenant users to manage their own expenses
ALTER TABLE public.asaas_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation on asaas_expenses" ON public.asaas_expenses;
CREATE POLICY "Tenant isolation on asaas_expenses" ON public.asaas_expenses
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
