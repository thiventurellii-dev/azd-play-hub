
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO public
USING (public.has_role(auth.uid(), 'admin'::app_role));
