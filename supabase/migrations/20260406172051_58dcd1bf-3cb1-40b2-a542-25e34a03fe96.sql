
-- Create enum for RPG adventure tags
CREATE TYPE public.rpg_adventure_tag AS ENUM ('official', 'homebrew');

-- Create RPG Systems table
CREATE TABLE public.rpg_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  rules_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rpg_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RPG systems viewable by everyone"
  ON public.rpg_systems FOR SELECT
  USING (true);

CREATE POLICY "Admins manage RPG systems"
  ON public.rpg_systems FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create RPG Adventures table
CREATE TABLE public.rpg_adventures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id UUID NOT NULL REFERENCES public.rpg_systems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tag rpg_adventure_tag NOT NULL DEFAULT 'official',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rpg_adventures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RPG adventures viewable by everyone"
  ON public.rpg_adventures FOR SELECT
  USING (true);

CREATE POLICY "Admins manage RPG adventures"
  ON public.rpg_adventures FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
