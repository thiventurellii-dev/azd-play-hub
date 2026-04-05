
-- 1. game_scoring_schemas table
CREATE TABLE public.game_scoring_schemas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  schema JSONB NOT NULL DEFAULT '{"categories": []}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_id)
);

ALTER TABLE public.game_scoring_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scoring schemas viewable by everyone"
  ON public.game_scoring_schemas FOR SELECT
  USING (true);

CREATE POLICY "Admins manage scoring schemas"
  ON public.game_scoring_schemas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. match_result_scores table
CREATE TABLE public.match_result_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_result_id UUID NOT NULL REFERENCES public.match_results(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(match_result_id, category_key)
);

ALTER TABLE public.match_result_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Result scores viewable by everyone"
  ON public.match_result_scores FOR SELECT
  USING (true);

CREATE POLICY "Admins manage result scores"
  ON public.match_result_scores FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. New columns on match_results
ALTER TABLE public.match_results
  ADD COLUMN IF NOT EXISTS seat_position INTEGER,
  ADD COLUMN IF NOT EXISTS faction TEXT,
  ADD COLUMN IF NOT EXISTS is_new_player BOOLEAN DEFAULT false;

-- 4. Slug column on games
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 5. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_scoring_schemas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_result_scores;
