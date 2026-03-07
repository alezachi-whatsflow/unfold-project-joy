-- Create a SECURITY DEFINER function to check role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Drop existing recursive SELECT policy
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Recreate SELECT policy using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.get_my_role() IN ('admin', 'gestor')
);

-- Also fix the UPDATE policy which has the same recursion issue
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;

CREATE POLICY "Users can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.get_my_role() = 'admin'
);