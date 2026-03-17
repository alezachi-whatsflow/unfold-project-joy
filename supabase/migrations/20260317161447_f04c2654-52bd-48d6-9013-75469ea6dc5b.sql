
-- Fix SELECT policy to include superadmin
DROP POLICY "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (auth.uid() = id) 
    OR (get_my_role() = ANY (ARRAY['admin'::text, 'gestor'::text, 'superadmin'::text]))
  );

-- Fix UPDATE policy to include superadmin
DROP POLICY "Users can update profiles" ON public.profiles;
CREATE POLICY "Users can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (auth.uid() = id) 
    OR (get_my_role() = ANY (ARRAY['admin'::text, 'superadmin'::text]))
  );
