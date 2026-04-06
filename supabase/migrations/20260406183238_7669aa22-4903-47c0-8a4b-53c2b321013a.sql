
ALTER TABLE public.blood_scripts ADD COLUMN victory_conditions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.blood_scripts ADD COLUMN slug text;
ALTER TABLE public.blood_characters ADD COLUMN icon_url text;
