-- Allow admins/superadmins to delete profiles (except their own, enforced in app code)
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (get_my_role() IN ('admin', 'superadmin'));