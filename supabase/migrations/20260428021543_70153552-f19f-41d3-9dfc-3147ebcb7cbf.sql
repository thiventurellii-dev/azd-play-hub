-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.match_room_type AS ENUM ('boardgame', 'botc', 'rpg');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Coluna
ALTER TABLE public.match_rooms
  ADD COLUMN IF NOT EXISTS room_type public.match_room_type NOT NULL DEFAULT 'boardgame';

-- 3. Backfill
UPDATE public.match_rooms
SET room_type = 'botc'
WHERE blood_script_id IS NOT NULL AND room_type = 'boardgame';

-- 4. Substituir trigger de XP de sessão RPG
DROP TRIGGER IF EXISTS trg_xp_rpg_session ON public.match_rooms;
DROP FUNCTION IF EXISTS public.trg_xp_rpg_session();

CREATE OR REPLACE FUNCTION public.trg_xp_rpg_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  player_rec RECORD;
BEGIN
  -- Só dispara quando uma sala de RPG vira 'finished'
  IF NEW.room_type <> 'rpg' THEN RETURN NEW; END IF;
  IF NEW.status::text <> 'finished' THEN RETURN NEW; END IF;
  IF OLD.status::text = 'finished' THEN RETURN NEW; END IF;

  -- +25 para o mestre (criador da sala)
  INSERT INTO public.xp_events (user_id, reason, amount, ref_id)
  VALUES (NEW.created_by, 'rpg_session_master', 25, NEW.id)
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING;

  -- +25 para cada jogador confirmado (exceto o mestre, que já recebeu)
  FOR player_rec IN
    SELECT DISTINCT player_id
    FROM public.match_room_players
    WHERE room_id = NEW.id
      AND type::text = 'confirmed'
      AND player_id <> NEW.created_by
  LOOP
    INSERT INTO public.xp_events (user_id, reason, amount, ref_id)
    VALUES (player_rec.player_id, 'rpg_session_player', 25, NEW.id)
    ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_xp_rpg_session
AFTER UPDATE OF status ON public.match_rooms
FOR EACH ROW EXECUTE FUNCTION public.trg_xp_rpg_session();

-- 5. Remove tabela auxiliar
DROP TABLE IF EXISTS public.rpg_game_ids;