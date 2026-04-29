-- =====================================================================
-- Suporte a sessões de RPG dentro de match_rooms (Onda 2)
-- Aplicar no SQL Editor da instância EXTERNA: npinawelxdtsrcvzzvvs
-- =====================================================================

-- 1) Colunas adicionais em match_rooms
ALTER TABLE public.match_rooms
  ADD COLUMN IF NOT EXISTS room_type        text          DEFAULT 'boardgame',
  ADD COLUMN IF NOT EXISTS campaign_id      uuid          REFERENCES public.rpg_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_number   integer,
  ADD COLUMN IF NOT EXISTS session_title    text,
  ADD COLUMN IF NOT EXISTS session_recap    text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- room_type aceita: 'boardgame' | 'botc' | 'rpg'
ALTER TABLE public.match_rooms
  DROP CONSTRAINT IF EXISTS match_rooms_room_type_check;
ALTER TABLE public.match_rooms
  ADD CONSTRAINT match_rooms_room_type_check
  CHECK (room_type IN ('boardgame','botc','rpg'));

CREATE INDEX IF NOT EXISTS match_rooms_campaign_id_idx
  ON public.match_rooms (campaign_id) WHERE campaign_id IS NOT NULL;

-- 2) Trigger pra numeração automática de sessão por campanha
CREATE OR REPLACE FUNCTION public.trg_rpg_assign_session_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.campaign_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.session_number IS NULL THEN
    SELECT COALESCE(MAX(session_number),0)+1
      INTO NEW.session_number
      FROM public.match_rooms
     WHERE campaign_id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_rooms_session_number_trg ON public.match_rooms;
CREATE TRIGGER match_rooms_session_number_trg
  BEFORE INSERT ON public.match_rooms
  FOR EACH ROW EXECUTE FUNCTION public.trg_rpg_assign_session_number();

-- 3) Tabela de eventos marcantes da sessão (alimenta a Crônica + página do personagem)
CREATE TABLE IF NOT EXISTS public.rpg_session_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       uuid NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
  event_type    text NOT NULL CHECK (event_type IN
                  ('death','level_up','milestone','legendary_item',
                   'important_npc','betrayal','achievement')),
  character_id  uuid REFERENCES public.rpg_characters(id) ON DELETE SET NULL,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rpg_session_events_room_idx ON public.rpg_session_events(room_id);
CREATE INDEX IF NOT EXISTS rpg_session_events_char_idx ON public.rpg_session_events(character_id);

ALTER TABLE public.rpg_session_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session events readable" ON public.rpg_session_events;
CREATE POLICY "session events readable"
  ON public.rpg_session_events FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "session events writable by master" ON public.rpg_session_events;
CREATE POLICY "session events writable by master"
  ON public.rpg_session_events FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.match_rooms r
    WHERE r.id = room_id AND r.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.match_rooms r
    WHERE r.id = room_id AND r.created_by = auth.uid()
  ));

-- 4) Garantir um jogo "RPG" genérico (game_id é obrigatório em match_rooms)
INSERT INTO public.games (name, slug, min_players, max_players)
SELECT 'RPG', 'rpg-generico', 2, 10
WHERE NOT EXISTS (SELECT 1 FROM public.games WHERE slug = 'rpg-generico');
