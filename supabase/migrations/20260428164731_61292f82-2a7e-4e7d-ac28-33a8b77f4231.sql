ALTER TABLE public.match_rooms ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.blood_matches ADD COLUMN IF NOT EXISTS platform text;