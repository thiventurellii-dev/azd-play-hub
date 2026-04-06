
-- Room tags table
CREATE TABLE public.room_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.room_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room tags viewable by everyone" ON public.room_tags FOR SELECT USING (true);
CREATE POLICY "Admins manage room tags" ON public.room_tags FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can insert room tags" ON public.room_tags FOR INSERT TO authenticated WITH CHECK (true);

-- Room-tag links
CREATE TABLE public.match_room_tag_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.room_tags(id) ON DELETE CASCADE,
  UNIQUE(room_id, tag_id)
);
ALTER TABLE public.match_room_tag_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room tag links viewable by everyone" ON public.match_room_tag_links FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tag links" ON public.match_room_tag_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage tag links" ON public.match_room_tag_links FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Creator can delete tag links" ON public.match_room_tag_links FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.match_rooms mr WHERE mr.id = room_id AND (mr.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
);

-- Add season_id and blood_script_id to match_rooms
ALTER TABLE public.match_rooms ADD COLUMN season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;
ALTER TABLE public.match_rooms ADD COLUMN blood_script_id uuid REFERENCES public.blood_scripts(id) ON DELETE SET NULL;

-- Seed default tags
INSERT INTO public.room_tags (name) VALUES
  ('Iniciante'),
  ('Experiente'),
  ('Novatos Bem-Vindos'),
  ('Casual'),
  ('Competitivo');
