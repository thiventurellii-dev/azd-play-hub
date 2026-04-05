
-- 1. Fix mmr_ratings: remove open INSERT/UPDATE, keep admin-only
DROP POLICY IF EXISTS "Authenticated users can insert mmr_ratings" ON public.mmr_ratings;
DROP POLICY IF EXISTS "Authenticated users can update mmr_ratings" ON public.mmr_ratings;

-- 2. Fix user_roles: restrict SELECT to own role only
DROP POLICY IF EXISTS "Roles viewable by authenticated" ON public.user_roles;
CREATE POLICY "Users view own role" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
