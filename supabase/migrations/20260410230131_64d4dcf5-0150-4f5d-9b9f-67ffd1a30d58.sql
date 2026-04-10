-- Fix 1: Ghost players - remove public SELECT, restrict to authenticated
-- and hide claim_code from non-admin users
DROP POLICY IF EXISTS "Ghost players viewable by everyone" ON public.ghost_players;

-- Authenticated users can see ghost players (without claim_code via a view, but RLS can't hide columns)
-- So we restrict to authenticated only, and create a secure function for public access without claim_code
CREATE POLICY "Authenticated users can view ghost players"
ON public.ghost_players
FOR SELECT
TO authenticated
USING (true);

-- Create a function that returns ghost players WITHOUT claim_code for non-admin users
CREATE OR REPLACE FUNCTION public.get_ghost_players()
RETURNS TABLE(id uuid, display_name text, linked_profile_id uuid, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gp.id, gp.display_name, gp.linked_profile_id, gp.created_at
  FROM public.ghost_players gp;
$$;

-- Fix 2: Match results - restrict INSERT to admin-only
-- Regular users submit matches through match rooms which are admin-validated
DROP POLICY IF EXISTS "Authenticated users can insert match results" ON public.match_results;

CREATE POLICY "Admins can insert match results"
ON public.match_results
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also fix match_result_scores INSERT policy (same issue)
DROP POLICY IF EXISTS "Authenticated users can insert result scores" ON public.match_result_scores;

CREATE POLICY "Admins can insert result scores"
ON public.match_result_scores
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also fix matches INSERT policy (same pattern)
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON public.matches;

CREATE POLICY "Admins can insert matches"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also fix games INSERT policy
DROP POLICY IF EXISTS "Authenticated users can suggest games" ON public.games;
