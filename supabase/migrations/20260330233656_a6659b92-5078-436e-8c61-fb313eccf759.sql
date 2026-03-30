
-- Add first_player_id to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS first_player_id uuid;

-- Add prize to seasons
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS prize text DEFAULT '';

-- Add game_id to mmr_ratings for per-game rankings
ALTER TABLE public.mmr_ratings ADD COLUMN IF NOT EXISTS game_id uuid;

-- Add profile fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code text DEFAULT '+55';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text DEFAULT '';
