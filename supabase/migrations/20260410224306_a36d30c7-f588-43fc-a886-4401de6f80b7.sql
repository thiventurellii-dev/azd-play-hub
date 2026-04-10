
-- 1. Create public profiles view (non-sensitive columns only)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT id, name, nickname, avatar_url, city, state, status, created_at, steam_id
FROM public.profiles;

-- 2. Restrict profiles SELECT to own profile + admins
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Grant SELECT on the public view to all roles
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- 4. Create SECURITY DEFINER function for inserting notifications for other users
CREATE OR REPLACE FUNCTION public.insert_notifications(
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, room_id)
    VALUES (
      (r->>'user_id')::uuid,
      COALESCE(r->>'type', 'info'),
      r->>'title',
      COALESCE(r->>'message', ''),
      (r->>'room_id')::uuid
    );
  END LOOP;
END;
$$;

-- 5. Restrict notifications INSERT to own user_id
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
