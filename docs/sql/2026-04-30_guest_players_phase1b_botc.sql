-- =====================================================================
-- Migração Fase 1B — Convidados em Blood on the Clocktower
-- Aplicar manualmente no SQL Editor da instância EXTERNA
-- (npinawelxdtsrcvzzvvs)
--
-- Pré-requisito: já ter aplicado 2026-04-30_guest_players_phase1.sql
--
-- Objetivos:
--   1. blood_match_players já tem ghost_player_id (Fase 1A) — garantir
--   2. blood_matches: storyteller_ghost_id + storyteller pode ser guest
--   3. Constraints XOR (player OU ghost, nunca os dois nem nenhum)
--   4. Recalcular ratings ignora guests (feito no client em bloodRatings.ts)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. blood_match_players — XOR (player_id XOR ghost_player_id)
--    A coluna ghost_player_id já foi criada na Fase 1A; aqui apenas
--    reforçamos a constraint XOR (substitui a OR criada antes).
-- ---------------------------------------------------------------------
ALTER TABLE public.blood_match_players
  ADD COLUMN IF NOT EXISTS ghost_player_id uuid
    REFERENCES public.ghost_players(id) ON DELETE SET NULL;

ALTER TABLE public.blood_match_players
  ALTER COLUMN player_id DROP NOT NULL;

ALTER TABLE public.blood_match_players
  DROP CONSTRAINT IF EXISTS blood_match_players_player_or_ghost;
ALTER TABLE public.blood_match_players
  DROP CONSTRAINT IF EXISTS blood_match_players_player_xor_ghost;

ALTER TABLE public.blood_match_players
  ADD CONSTRAINT blood_match_players_player_xor_ghost
  CHECK (
    (player_id IS NOT NULL AND ghost_player_id IS NULL)
    OR
    (player_id IS NULL AND ghost_player_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS blood_match_players_ghost_idx
  ON public.blood_match_players (ghost_player_id)
  WHERE ghost_player_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. blood_matches — Storyteller pode ser guest
-- ---------------------------------------------------------------------
ALTER TABLE public.blood_matches
  ADD COLUMN IF NOT EXISTS storyteller_ghost_id uuid
    REFERENCES public.ghost_players(id) ON DELETE SET NULL;

ALTER TABLE public.blood_matches
  ALTER COLUMN storyteller_player_id DROP NOT NULL;

ALTER TABLE public.blood_matches
  DROP CONSTRAINT IF EXISTS blood_matches_storyteller_xor_ghost;

ALTER TABLE public.blood_matches
  ADD CONSTRAINT blood_matches_storyteller_xor_ghost
  CHECK (
    (storyteller_player_id IS NOT NULL AND storyteller_ghost_id IS NULL)
    OR
    (storyteller_player_id IS NULL AND storyteller_ghost_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS blood_matches_storyteller_ghost_idx
  ON public.blood_matches (storyteller_ghost_id)
  WHERE storyteller_ghost_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. (Opcional) Atualizar a função recalculate_blood_ratings para
--    ignorar linhas com player_id NULL (guests). Como já fazemos o
--    recálculo via client em src/lib/bloodRatings.ts, esta atualização
--    é defensiva caso alguém chame a RPC manualmente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_blood_ratings(p_season_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  match_rec RECORD;
  mp_rec RECORD;
  ratings JSONB := '{}'::jsonb;
  pid TEXT;
  st_id TEXT;
  st_is_player BOOLEAN;
  r JSONB;
BEGIN
  FOR match_rec IN
    SELECT id, storyteller_player_id, winning_team
    FROM public.blood_matches
    WHERE season_id = p_season_id
  LOOP
    -- Storyteller só entra no ranking se for usuário registrado
    st_id := NULLIF(match_rec.storyteller_player_id::text, '');

    IF st_id IS NOT NULL THEN
      IF NOT ratings ? st_id THEN
        ratings := ratings || jsonb_build_object(st_id,
          '{"gp":0,"we":0,"wg":0,"st":0}'::jsonb);
      END IF;

      SELECT EXISTS(
        SELECT 1 FROM public.blood_match_players
        WHERE match_id = match_rec.id
          AND player_id = match_rec.storyteller_player_id
      ) INTO st_is_player;

      IF NOT st_is_player THEN
        ratings := jsonb_set(ratings, ARRAY[st_id, 'gp'],
          to_jsonb((ratings->st_id->>'gp')::int + 1));
        ratings := jsonb_set(ratings, ARRAY[st_id, 'st'],
          to_jsonb((ratings->st_id->>'st')::int + 1));
      END IF;
    END IF;

    -- Apenas players registrados (player_id NOT NULL) entram no ranking
    FOR mp_rec IN
      SELECT player_id, team
      FROM public.blood_match_players
      WHERE match_id = match_rec.id
        AND player_id IS NOT NULL
    LOOP
      pid := mp_rec.player_id::text;
      IF NOT ratings ? pid THEN
        ratings := ratings || jsonb_build_object(pid,
          '{"gp":0,"we":0,"wg":0,"st":0}'::jsonb);
      END IF;

      ratings := jsonb_set(ratings, ARRAY[pid, 'gp'],
        to_jsonb((ratings->pid->>'gp')::int + 1));

      IF st_id IS NOT NULL AND mp_rec.player_id::text = st_id THEN
        ratings := jsonb_set(ratings, ARRAY[pid, 'st'],
          to_jsonb((ratings->pid->>'st')::int + 1));
      END IF;

      IF mp_rec.team::text = match_rec.winning_team::text THEN
        IF mp_rec.team::text = 'evil' THEN
          ratings := jsonb_set(ratings, ARRAY[pid, 'we'],
            to_jsonb((ratings->pid->>'we')::int + 1));
        ELSE
          ratings := jsonb_set(ratings, ARRAY[pid, 'wg'],
            to_jsonb((ratings->pid->>'wg')::int + 1));
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  DELETE FROM public.blood_mmr_ratings WHERE season_id = p_season_id;

  FOR pid IN SELECT jsonb_object_keys(ratings) LOOP
    r := ratings->pid;
    INSERT INTO public.blood_mmr_ratings (
      player_id, season_id, games_played, wins_evil, wins_good,
      games_as_storyteller, total_points
    ) VALUES (
      pid::uuid, p_season_id,
      (r->>'gp')::int, (r->>'we')::int, (r->>'wg')::int,
      (r->>'st')::int,
      (r->>'gp')::int + (r->>'we')::int * 2 + (r->>'wg')::int
    );
  END LOOP;
END;
$function$;

COMMIT;
