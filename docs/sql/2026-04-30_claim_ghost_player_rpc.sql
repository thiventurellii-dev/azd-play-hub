-- =====================================================================
-- Fase 1C (parte 2) — RPC claim_ghost_player
-- Aplicar no SQL Editor da instância EXTERNA (npinawelxdtsrcvzzvvs)
--
-- Auto-aprova se o claim_code bater. Mescla histórico do guest no
-- profile (deduplicando colisões), recalcula MMR/ratings das temporadas
-- afetadas, deleta o guest e registra o claim_request como 'approved'.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.claim_ghost_player(
  p_ghost_id    uuid,
  p_profile_id  uuid,
  p_claim_code  text,
  p_message     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ghost            ghost_players%ROWTYPE;
  v_request_id       uuid;
  v_dedup_results    int := 0;
  v_dedup_blood_mp   int := 0;
  v_seasons_bg       jsonb := '[]'::jsonb;
  v_seasons_blood    uuid[];
  rec                RECORD;
BEGIN
  -- 1) Carrega guest
  SELECT * INTO v_ghost FROM public.ghost_players WHERE id = p_ghost_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ghost_not_found');
  END IF;

  IF v_ghost.linked_profile_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_linked');
  END IF;

  -- 2) Valida código
  IF upper(trim(p_claim_code)) <> upper(trim(v_ghost.claim_code)) THEN
    -- registra tentativa rejeitada para auditoria
    INSERT INTO public.claim_requests (
      ghost_player_id, profile_id, claim_code, status, message, reviewed_at, review_note
    ) VALUES (
      p_ghost_id, p_profile_id, p_claim_code, 'rejected', p_message, now(), 'invalid_code'
    );
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  -- 3) Cria pedido como pending (será marcado approved no fim)
  INSERT INTO public.claim_requests (
    ghost_player_id, profile_id, claim_code, status, message
  ) VALUES (
    p_ghost_id, p_profile_id, p_claim_code, 'pending', p_message
  )
  RETURNING id INTO v_request_id;

  -- =================================================================
  -- 4) MERGE BOARDGAME — match_results
  -- =================================================================
  -- 4a) Coleta seasons/jogos afetados (para recálculo no fim)
  WITH affected AS (
    SELECT DISTINCT m.season_id, m.game_id
    FROM public.match_results mr
    JOIN public.matches m ON m.id = mr.match_id
    WHERE mr.ghost_player_id = p_ghost_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('season_id', season_id, 'game_id', game_id)), '[]'::jsonb)
    INTO v_seasons_bg
    FROM affected;

  -- 4b) Dedup: se profile JÁ está na mesma partida, deletar a linha do guest
  DELETE FROM public.match_results mr_g
  USING public.match_results mr_p
  WHERE mr_g.ghost_player_id = p_ghost_id
    AND mr_p.match_id        = mr_g.match_id
    AND mr_p.player_id       = p_profile_id;
  GET DIAGNOSTICS v_dedup_results = ROW_COUNT;

  -- 4c) Reescreve refs restantes para o profile
  UPDATE public.match_results
     SET player_id = p_profile_id,
         ghost_player_id = NULL
   WHERE ghost_player_id = p_ghost_id;

  -- =================================================================
  -- 5) MERGE BOTC — blood_match_players
  -- =================================================================
  -- 5a) Seasons afetadas
  SELECT COALESCE(array_agg(DISTINCT m.season_id), ARRAY[]::uuid[])
    INTO v_seasons_blood
    FROM public.blood_match_players bmp
    JOIN public.blood_matches m ON m.id = bmp.match_id
   WHERE bmp.ghost_player_id = p_ghost_id;

  -- também via storyteller_ghost_id
  SELECT COALESCE(array_agg(DISTINCT season_id), ARRAY[]::uuid[]) || v_seasons_blood
    INTO v_seasons_blood
    FROM (
      SELECT DISTINCT season_id FROM public.blood_matches
       WHERE storyteller_ghost_id = p_ghost_id
    ) s;

  -- 5b) Dedup blood_match_players
  DELETE FROM public.blood_match_players bmp_g
  USING public.blood_match_players bmp_p
  WHERE bmp_g.ghost_player_id = p_ghost_id
    AND bmp_p.match_id        = bmp_g.match_id
    AND bmp_p.player_id       = p_profile_id;
  GET DIAGNOSTICS v_dedup_blood_mp = ROW_COUNT;

  -- 5c) Reescreve refs restantes
  UPDATE public.blood_match_players
     SET player_id = p_profile_id,
         ghost_player_id = NULL
   WHERE ghost_player_id = p_ghost_id;

  UPDATE public.blood_matches
     SET storyteller_player_id = p_profile_id,
         storyteller_ghost_id  = NULL
   WHERE storyteller_ghost_id = p_ghost_id;

  -- =================================================================
  -- 6) Marca guest como linked (mantemos a linha por um instante apenas
  --    para satisfazer FKs; vamos deletar logo depois). Mas como o
  --    schema não tem FKs amarradas (segundo o catálogo), podemos
  --    deletar direto.
  -- =================================================================
  DELETE FROM public.ghost_players WHERE id = p_ghost_id;

  -- =================================================================
  -- 7) Recalcula MMR / ratings das temporadas afetadas
  -- =================================================================
  FOR rec IN
    SELECT (e->>'season_id')::uuid AS season_id,
           (e->>'game_id')::uuid   AS game_id
      FROM jsonb_array_elements(v_seasons_bg) e
  LOOP
    PERFORM public.recalculate_boardgame_mmr(rec.season_id, rec.game_id);
  END LOOP;

  IF v_seasons_blood IS NOT NULL THEN
    FOR rec IN SELECT DISTINCT unnest(v_seasons_blood) AS season_id LOOP
      IF rec.season_id IS NOT NULL THEN
        PERFORM public.recalculate_blood_ratings(rec.season_id);
      END IF;
    END LOOP;
  END IF;

  -- =================================================================
  -- 8) Marca o claim_request como approved + notifica admins
  -- =================================================================
  UPDATE public.claim_requests
     SET status = 'approved',
         reviewed_at = now(),
         review_note = format(
           'auto-approved | dedup_bg=%s | dedup_blood=%s',
           v_dedup_results, v_dedup_blood_mp
         )
   WHERE id = v_request_id;

  -- Notifica todos os admins (usa insert_notifications já existente)
  PERFORM public.insert_notifications(
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'user_id', ur.user_id,
              'type', 'claim_approved',
              'title', 'Conta de convidado vinculada',
              'message', format(
                'O perfil %s reivindicou o convidado "%s" (código %s).%s%s',
                COALESCE((SELECT nickname FROM public.profiles WHERE id = p_profile_id), p_profile_id::text),
                v_ghost.display_name,
                v_ghost.claim_code,
                CASE WHEN v_dedup_results > 0 THEN format(' Mescladas %s linhas duplicadas em boardgame.', v_dedup_results) ELSE '' END,
                CASE WHEN v_dedup_blood_mp > 0 THEN format(' Mescladas %s linhas duplicadas em BotC.', v_dedup_blood_mp) ELSE '' END
              )
            )), '[]'::jsonb)
       FROM public.user_roles ur
      WHERE ur.role IN ('admin','super_admin'))
  );

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'dedup_boardgame', v_dedup_results,
    'dedup_blood', v_dedup_blood_mp,
    'recalculated_boardgame', jsonb_array_length(v_seasons_bg),
    'recalculated_blood', COALESCE(array_length(v_seasons_blood, 1), 0)
  );
END;
$$;

-- Permite chamada via PostgREST por usuário autenticado
GRANT EXECUTE ON FUNCTION public.claim_ghost_player(uuid, uuid, text, text) TO authenticated;
