
DROP POLICY "Authenticated users can insert room tags" ON public.room_tags;
DROP POLICY "Authenticated users can create tag links" ON public.match_room_tag_links;

CREATE POLICY "Authenticated users can insert room tags" ON public.room_tags FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can create tag links" ON public.match_room_tag_links FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.match_rooms mr WHERE mr.id = room_id AND (mr.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
);
