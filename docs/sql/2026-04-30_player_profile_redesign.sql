-- =====================================================================
-- Player Profile Redesign — schema additions
-- Apply manually in EXTERNAL Supabase SQL Editor (npinawelxdtsrcvzzvvs).
-- =====================================================================

-- 1) Bio field on profiles (max 140 chars enforced via trigger to allow
--    future tweaks; CHECK is fine here since it's purely length-based).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_bio_length_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length_chk
  CHECK (bio IS NULL OR char_length(bio) <= 140);

-- 2) Showcased games table — curated by the player (up to 4).
CREATE TABLE IF NOT EXISTS public.profile_showcased_games (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, game_id)
);

CREATE INDEX IF NOT EXISTS profile_showcased_games_profile_idx
  ON public.profile_showcased_games(profile_id, display_order);

ALTER TABLE public.profile_showcased_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "showcased_games_select_all" ON public.profile_showcased_games;
CREATE POLICY "showcased_games_select_all"
  ON public.profile_showcased_games
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "showcased_games_owner_write" ON public.profile_showcased_games;
CREATE POLICY "showcased_games_owner_write"
  ON public.profile_showcased_games
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
