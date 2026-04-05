
-- Game tags system
CREATE TABLE public.game_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags viewable by everyone" ON public.game_tags FOR SELECT USING (true);
CREATE POLICY "Admins manage tags" ON public.game_tags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Game-tag links
CREATE TABLE public.game_tag_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.game_tags(id) ON DELETE CASCADE,
  UNIQUE(game_id, tag_id)
);

ALTER TABLE public.game_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tag links viewable by everyone" ON public.game_tag_links FOR SELECT USING (true);
CREATE POLICY "Admins manage tag links" ON public.game_tag_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Achievement triggers
ALTER TABLE public.achievement_definitions
  ADD COLUMN trigger_type TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN trigger_config JSONB DEFAULT NULL;
