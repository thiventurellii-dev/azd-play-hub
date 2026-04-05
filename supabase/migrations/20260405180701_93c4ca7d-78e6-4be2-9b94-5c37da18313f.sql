
-- Allow authenticated users to insert matches
CREATE POLICY "Authenticated users can insert matches"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert match results
CREATE POLICY "Authenticated users can insert match results"
ON public.match_results
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert match result scores
CREATE POLICY "Authenticated users can insert result scores"
ON public.match_result_scores
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert mmr_ratings
CREATE POLICY "Authenticated users can insert mmr_ratings"
ON public.mmr_ratings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update mmr_ratings
CREATE POLICY "Authenticated users can update mmr_ratings"
ON public.mmr_ratings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
