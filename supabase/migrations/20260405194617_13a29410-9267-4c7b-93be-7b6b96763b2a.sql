
-- Ghost players table
CREATE TABLE public.ghost_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  claim_code TEXT UNIQUE DEFAULT ('AZD-' || upper(substr(md5(random()::text), 1, 4))),
  linked_profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ghost_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ghost players viewable by everyone" ON public.ghost_players FOR SELECT USING (true);
CREATE POLICY "Admins manage ghost players" ON public.ghost_players FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add ghost_player_id to match_results
ALTER TABLE public.match_results ADD COLUMN ghost_player_id UUID NULL REFERENCES public.ghost_players(id) ON DELETE SET NULL;

-- Make player_id nullable (ghost players won't have a real player_id)
ALTER TABLE public.match_results ALTER COLUMN player_id DROP NOT NULL;
