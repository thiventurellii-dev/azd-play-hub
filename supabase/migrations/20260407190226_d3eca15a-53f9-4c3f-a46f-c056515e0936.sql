
-- 1. Create game-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-assets', 'game-assets', true);

-- Storage policies for game-assets
CREATE POLICY "Game assets publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-assets');

CREATE POLICY "Admins can upload game assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'game-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update game assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'game-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete game assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'game-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Boardgame MMR recalculation RPC
CREATE OR REPLACE FUNCTION public.recalculate_boardgame_mmr(p_season_id uuid, p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  match_rec RECORD;
  result_rec RECORD;
  mmr_state JSONB := '{}'::jsonb;
  changes JSONB;
  n INT;
  k CONSTANT NUMERIC := 50;
  r_a NUMERIC; r_b NUMERIC; e_a NUMERIC; e_b NUMERIC;
  s_a NUMERIC; s_b NUMERIC;
  pid_a UUID; pid_b UUID;
  pos_a INT; pos_b INT;
  change_val NUMERIC;
  before_val NUMERIC;
  after_val NUMERIC;
  player_id_val UUID;
  results_arr UUID[];
  positions_arr INT[];
BEGIN
  -- Delete existing MMR ratings for this season+game
  DELETE FROM public.mmr_ratings WHERE season_id = p_season_id AND game_id = p_game_id;

  -- Loop through matches in chronological order
  FOR match_rec IN
    SELECT id FROM public.matches
    WHERE season_id = p_season_id AND game_id = p_game_id
    ORDER BY played_at ASC
  LOOP
    -- Get results for this match
    results_arr := ARRAY(
      SELECT player_id FROM public.match_results
      WHERE match_id = match_rec.id AND player_id IS NOT NULL
      ORDER BY position ASC
    );
    positions_arr := ARRAY(
      SELECT position FROM public.match_results
      WHERE match_id = match_rec.id AND player_id IS NOT NULL
      ORDER BY position ASC
    );

    n := array_length(results_arr, 1);
    IF n IS NULL OR n = 0 THEN CONTINUE; END IF;

    -- Initialize new players
    FOR i IN 1..n LOOP
      IF NOT mmr_state ? results_arr[i]::text THEN
        mmr_state := mmr_state || jsonb_build_object(
          results_arr[i]::text,
          jsonb_build_object('mmr', 1000, 'gp', 0, 'wins', 0)
        );
      END IF;
    END LOOP;

    -- Calculate ELO changes
    changes := '{}'::jsonb;
    FOR i IN 1..n LOOP
      changes := changes || jsonb_build_object(results_arr[i]::text, 0);
    END LOOP;

    -- Pairwise comparisons
    FOR i IN 1..n LOOP
      FOR j IN (i+1)..n LOOP
        pid_a := results_arr[i];
        pid_b := results_arr[j];
        r_a := (mmr_state->pid_a::text->>'mmr')::numeric;
        r_b := (mmr_state->pid_b::text->>'mmr')::numeric;
        e_a := 1.0 / (1.0 + power(10.0, (r_b - r_a) / 400.0));
        e_b := 1.0 / (1.0 + power(10.0, (r_a - r_b) / 400.0));

        IF positions_arr[i] < positions_arr[j] THEN
          s_a := 1; s_b := 0;
        ELSIF positions_arr[i] > positions_arr[j] THEN
          s_a := 0; s_b := 1;
        ELSE
          s_a := 0.5; s_b := 0.5;
        END IF;

        changes := jsonb_set(changes, ARRAY[pid_a::text],
          to_jsonb((changes->>pid_a::text)::numeric + k * (s_a - e_a)));
        changes := jsonb_set(changes, ARRAY[pid_b::text],
          to_jsonb((changes->>pid_b::text)::numeric + k * (s_b - e_b)));
      END LOOP;
    END LOOP;

    -- Position bonus
    FOR i IN 1..n LOOP
      changes := jsonb_set(changes, ARRAY[results_arr[i]::text],
        to_jsonb((changes->>results_arr[i]::text)::numeric + 5.0 * (n - positions_arr[i])));
    END LOOP;

    -- Apply changes
    FOR i IN 1..n LOOP
      player_id_val := results_arr[i];
      change_val := round((changes->>player_id_val::text)::numeric, 2);
      before_val := (mmr_state->player_id_val::text->>'mmr')::numeric;
      after_val := before_val + change_val;

      -- Update match_results
      UPDATE public.match_results
      SET mmr_before = before_val, mmr_change = change_val, mmr_after = after_val
      WHERE match_id = match_rec.id AND player_id = player_id_val;

      -- Update state
      mmr_state := jsonb_set(mmr_state, ARRAY[player_id_val::text],
        jsonb_build_object(
          'mmr', after_val,
          'gp', (mmr_state->player_id_val::text->>'gp')::int + 1,
          'wins', (mmr_state->player_id_val::text->>'wins')::int + CASE WHEN positions_arr[i] = 1 THEN 1 ELSE 0 END
        )
      );
    END LOOP;
  END LOOP;

  -- Upsert final ratings
  FOR player_id_val IN SELECT jsonb_object_keys(mmr_state)::uuid LOOP
    PERFORM public.upsert_mmr_for_match(
      player_id_val,
      p_season_id,
      p_game_id,
      (mmr_state->player_id_val::text->>'mmr')::numeric,
      (mmr_state->player_id_val::text->>'gp')::int,
      (mmr_state->player_id_val::text->>'wins')::int
    );
  END LOOP;
END;
$$;

-- 3. Blood ratings recalculation RPC
CREATE OR REPLACE FUNCTION public.recalculate_blood_ratings(p_season_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  match_rec RECORD;
  mp_rec RECORD;
  ratings JSONB := '{}'::jsonb;
  pid TEXT;
  st_id TEXT;
  st_is_player BOOLEAN;
  r JSONB;
BEGIN
  -- Get all matches for this season
  FOR match_rec IN
    SELECT id, storyteller_player_id, winning_team
    FROM public.blood_matches
    WHERE season_id = p_season_id
  LOOP
    st_id := match_rec.storyteller_player_id::text;

    -- Ensure storyteller entry
    IF NOT ratings ? st_id THEN
      ratings := ratings || jsonb_build_object(st_id,
        '{"gp":0,"we":0,"wg":0,"st":0}'::jsonb);
    END IF;

    -- Check if storyteller is also a player
    SELECT EXISTS(
      SELECT 1 FROM public.blood_match_players
      WHERE match_id = match_rec.id AND player_id = match_rec.storyteller_player_id
    ) INTO st_is_player;

    IF NOT st_is_player THEN
      ratings := jsonb_set(ratings, ARRAY[st_id, 'gp'],
        to_jsonb((ratings->st_id->>'gp')::int + 1));
      ratings := jsonb_set(ratings, ARRAY[st_id, 'st'],
        to_jsonb((ratings->st_id->>'st')::int + 1));
    END IF;

    -- Process match players
    FOR mp_rec IN
      SELECT player_id, team FROM public.blood_match_players
      WHERE match_id = match_rec.id
    LOOP
      pid := mp_rec.player_id::text;
      IF NOT ratings ? pid THEN
        ratings := ratings || jsonb_build_object(pid,
          '{"gp":0,"we":0,"wg":0,"st":0}'::jsonb);
      END IF;

      ratings := jsonb_set(ratings, ARRAY[pid, 'gp'],
        to_jsonb((ratings->pid->>'gp')::int + 1));

      IF mp_rec.player_id = match_rec.storyteller_player_id THEN
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

  -- Delete existing ratings
  DELETE FROM public.blood_mmr_ratings WHERE season_id = p_season_id;

  -- Insert new ratings
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
$$;
