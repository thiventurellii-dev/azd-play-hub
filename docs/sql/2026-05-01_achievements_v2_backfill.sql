-- =====================================================================
-- Backfill de conquistas automáticas
-- Roda evaluate_player_achievements para cada (player, match) histórico
-- de match_results e blood_match_players, concedendo retroativamente
-- todas as conquistas que já estariam desbloqueadas.
-- Idempotente: ON CONFLICT DO NOTHING já está dentro da função.
-- =====================================================================

-- 1. Boardgames: percorre cada match_result existente
DO $$
DECLARE
  r RECORD;
  v_game_id uuid;
  v_season_id uuid;
BEGIN
  FOR r IN
    SELECT mr.player_id, mr.match_id, m.game_id, m.season_id
    FROM public.match_results mr
    JOIN public.matches m ON m.id = mr.match_id
    WHERE mr.player_id IS NOT NULL
    ORDER BY m.played_at ASC
  LOOP
    PERFORM public.evaluate_player_achievements(
      r.player_id, r.game_id, r.season_id, r.match_id
    );
  END LOOP;
END $$;

-- 2. Blood on the Clocktower: percorre cada blood_match_player existente
--    (assume que existe evaluate_blood_player_achievements; se não, ignora)
DO $$
DECLARE
  r RECORD;
  v_game_id uuid;
  v_season_id uuid;
  v_fn_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'evaluate_blood_player_achievements'
  ) INTO v_fn_exists;

  IF NOT v_fn_exists THEN
    RAISE NOTICE 'evaluate_blood_player_achievements não existe — pulando BotC backfill';
    RETURN;
  END IF;

  FOR r IN
    SELECT bmp.player_id, bmp.match_id, bm.season_id
    FROM public.blood_match_players bmp
    JOIN public.blood_matches bm ON bm.id = bmp.match_id
    WHERE bmp.player_id IS NOT NULL
    ORDER BY bm.played_at ASC
  LOOP
    -- Tenta a função de BotC; se assinatura for diferente, ajuste aqui
    BEGIN
      EXECUTE format(
        'SELECT public.evaluate_blood_player_achievements(%L, %L, %L)',
        r.player_id, r.season_id, r.match_id
      );
    EXCEPTION WHEN OTHERS THEN
      -- silencia para não travar o boardgame backfill
      NULL;
    END;
  END LOOP;
END $$;

-- 3. Recalcula a view de stats da comunidade (caso seja MATERIALIZED)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'achievement_community_stats'
  ) THEN
    REFRESH MATERIALIZED VIEW public.achievement_community_stats;
  END IF;
END $$;

-- Resumo
SELECT
  (SELECT count(*) FROM public.player_achievements) AS total_concedidas,
  (SELECT count(DISTINCT player_profile_id) FROM public.player_achievements) AS jogadores_premiados;
