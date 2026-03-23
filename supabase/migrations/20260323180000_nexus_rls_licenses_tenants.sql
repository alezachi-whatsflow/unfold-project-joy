-- ============================================================
-- Fix: Nexus users cannot see licenses or tenants due to RLS
-- The is_nexus_user() function exists but no policy on
-- licenses or tenants grants access to Nexus users.
-- ============================================================

-- 1. licenses: Nexus users can SELECT all licenses
CREATE POLICY "nexus_select_licenses"
  ON public.licenses
  FOR SELECT TO authenticated
  USING (public.is_nexus_user());

-- 2. licenses: Nexus users can INSERT/UPDATE/DELETE
CREATE POLICY "nexus_manage_licenses"
  ON public.licenses
  FOR ALL TO authenticated
  USING (public.is_nexus_user())
  WITH CHECK (public.is_nexus_user());

-- 3. tenants: Nexus users can SELECT all tenants
--    (needed for the JOIN licenses → tenants)
CREATE POLICY "nexus_select_tenants"
  ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_nexus_user());

-- 4. tenants: Also allow regular authenticated users to see their own tenant
CREATE POLICY "users_select_own_tenant"
  ON public.tenants
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM public.user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- 5. tenants: Nexus users can manage tenants
CREATE POLICY "nexus_manage_tenants"
  ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_nexus_user())
  WITH CHECK (public.is_nexus_user());
