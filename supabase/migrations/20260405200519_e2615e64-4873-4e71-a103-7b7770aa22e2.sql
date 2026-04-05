
-- 1. Profiles: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 2. user_roles: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Roles viewable by everyone" ON public.user_roles;
CREATE POLICY "Roles viewable by authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

-- 3. mmr_ratings: remove open UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update mmr_ratings" ON public.mmr_ratings;

-- 4. mmr_ratings: remove open INSERT policy (admin already has ALL)
DROP POLICY IF EXISTS "Authenticated users can insert mmr_ratings" ON public.mmr_ratings;

-- 5. match_results: restrict INSERT to admins only
DROP POLICY IF EXISTS "Authenticated users can insert match results" ON public.match_results;

-- 6. matches: restrict INSERT to admins only
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON public.matches;

-- 7. match_result_scores: restrict INSERT to admins only (admin-managed via scoring flow)
DROP POLICY IF EXISTS "Authenticated users can insert result scores" ON public.match_result_scores;
