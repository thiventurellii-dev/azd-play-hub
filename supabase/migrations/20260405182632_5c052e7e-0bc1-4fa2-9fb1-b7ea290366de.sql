-- Community Documents table
CREATE TABLE public.community_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents viewable by everyone"
ON public.community_documents FOR SELECT TO public
USING (true);

CREATE POLICY "Admins manage documents"
ON public.community_documents FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Achievement Definitions
CREATE TABLE public.achievement_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  criteria TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by everyone"
ON public.achievement_definitions FOR SELECT TO public
USING (true);

CREATE POLICY "Admins manage achievements"
ON public.achievement_definitions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Player Achievements
CREATE TABLE public.player_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID,
  UNIQUE (player_id, achievement_id)
);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Player achievements viewable by everyone"
ON public.player_achievements FOR SELECT TO public
USING (true);

CREATE POLICY "Admins manage player achievements"
ON public.player_achievements FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add factions JSON to games
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS factions JSONB DEFAULT NULL;

-- Allow authenticated users to insert games (suggest new games)
CREATE POLICY "Authenticated users can suggest games"
ON public.games FOR INSERT TO authenticated
WITH CHECK (true);