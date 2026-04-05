
-- Re-add INSERT for matches (any authenticated user can register a match)
CREATE POLICY "Authenticated users can insert matches" ON public.matches
  FOR INSERT TO authenticated WITH CHECK (true);

-- Re-add INSERT for match_results
CREATE POLICY "Authenticated users can insert match results" ON public.match_results
  FOR INSERT TO authenticated WITH CHECK (true);

-- Re-add INSERT for match_result_scores
CREATE POLICY "Authenticated users can insert result scores" ON public.match_result_scores
  FOR INSERT TO authenticated WITH CHECK (true);

-- Re-add INSERT and UPDATE for mmr_ratings (match flow needs these)
CREATE POLICY "Authenticated users can insert mmr_ratings" ON public.mmr_ratings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update mmr_ratings" ON public.mmr_ratings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
