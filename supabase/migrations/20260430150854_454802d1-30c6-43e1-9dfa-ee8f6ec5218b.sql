-- BotC guests support

ALTER TABLE public.blood_match_players
  ADD COLUMN IF NOT EXISTS ghost_player_id uuid NULL REFERENCES public.ghost_players(id) ON DELETE CASCADE;

ALTER TABLE public.blood_match_players
  ALTER COLUMN player_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blood_match_players_player_xor_ghost'
  ) THEN
    ALTER TABLE public.blood_match_players
      ADD CONSTRAINT blood_match_players_player_xor_ghost
      CHECK (
        (player_id IS NOT NULL AND ghost_player_id IS NULL)
        OR (player_id IS NULL AND ghost_player_id IS NOT NULL)
      );
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_blood_match_players_ghost
  ON public.blood_match_players(ghost_player_id);

ALTER TABLE public.blood_matches
  ADD COLUMN IF NOT EXISTS storyteller_ghost_id uuid NULL REFERENCES public.ghost_players(id) ON DELETE SET NULL;

ALTER TABLE public.blood_matches
  ALTER COLUMN storyteller_player_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blood_matches_st_player_xor_ghost'
  ) THEN
    ALTER TABLE public.blood_matches
      ADD CONSTRAINT blood_matches_st_player_xor_ghost
      CHECK (
        (storyteller_player_id IS NOT NULL AND storyteller_ghost_id IS NULL)
        OR (storyteller_player_id IS NULL AND storyteller_ghost_id IS NOT NULL)
      );
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_blood_matches_storyteller_ghost
  ON public.blood_matches(storyteller_ghost_id);
