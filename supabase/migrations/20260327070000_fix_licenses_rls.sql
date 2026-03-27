-- Allow tenant users to read and update their own license
DROP POLICY IF EXISTS "Tenant users can view own license" ON public.licenses;
CREATE POLICY "Tenant users can view own license" ON public.licenses
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));

DROP POLICY IF EXISTS "Tenant users can update own license" ON public.licenses;
CREATE POLICY "Tenant users can update own license" ON public.licenses
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
