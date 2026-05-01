-- =====================================================================
-- Achievements v2 — Foundation (Phase 1)
-- Apply manually in the EXTERNAL Supabase SQL Editor (npinawelxdtsrcvzzvvs).
-- Drops legacy tables and recreates the new schema, seed catalog and
-- automatic evaluation trigger.
-- =====================================================================

-- ---------- 0. Drop legacy ----------
DROP TABLE IF EXISTS public.player_achievements CASCADE;
DROP TABLE IF EXISTS public.achievement_definitions CASCADE;

-- ---------- 1. Enums ----------
DO $$ BEGIN
  CREATE TYPE public.achievement_category AS ENUM
    ('participation','competitive','social','season','special','contribution');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.achievement_rarity AS ENUM
    ('common','uncommon','rare','epic','legendary','mesa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.achievement_scope_type AS ENUM
    ('global','game','season','event','player_pair','group','ranking');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.achievement_type AS ENUM
    ('automatic','manual_claim','admin_only','event_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.player_achievement_status AS ENUM
    ('pending','approved','rejected','expired','disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 2. achievement_templates ----------
CREATE TABLE public.achievement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description_template text,
  category public.achievement_category NOT NULL,
  type public.achievement_type NOT NULL DEFAULT 'automatic',
  trigger_type text,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  scope_type public.achievement_scope_type NOT NULL DEFAULT 'global',
  threshold int,
  rarity public.achievement_rarity NOT NULL DEFAULT 'common',
  progression_group text,
  progression_level int,
  replaces_previous boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  requires_match boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ach_templates_active ON public.achievement_templates(is_active);
CREATE INDEX idx_ach_templates_progression ON public.achievement_templates(progression_group, progression_level);

ALTER TABLE public.achievement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates viewable by everyone"
  ON public.achievement_templates FOR SELECT USING (true);
CREATE POLICY "Admins manage templates"
  ON public.achievement_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- 3. player_achievements ----------
CREATE TABLE public.player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_profile_id uuid NOT NULL,
  achievement_template_id uuid NOT NULL REFERENCES public.achievement_templates(id) ON DELETE CASCADE,
  scope_type public.achievement_scope_type NOT NULL DEFAULT 'global',
  scope_id uuid,
  match_id uuid,
  status public.player_achievement_status NOT NULL DEFAULT 'approved',
  unlocked_at timestamptz DEFAULT now(),
  requested_by uuid,
  approved_at timestamptz DEFAULT now(),
  rejected_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- UNIQUE constraint: scope_id can be NULL for 'global' scope, so we use a partial pair of indexes.
CREATE UNIQUE INDEX uniq_player_ach_scoped
  ON public.player_achievements(player_profile_id, achievement_template_id, scope_type, scope_id)
  WHERE scope_id IS NOT NULL;
CREATE UNIQUE INDEX uniq_player_ach_global
  ON public.player_achievements(player_profile_id, achievement_template_id, scope_type)
  WHERE scope_id IS NULL;

CREATE INDEX idx_player_ach_player ON public.player_achievements(player_profile_id);
CREATE INDEX idx_player_ach_template ON public.player_achievements(achievement_template_id);
CREATE INDEX idx_player_ach_scope ON public.player_achievements(scope_type, scope_id);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Player achievements viewable by everyone"
  ON public.player_achievements FOR SELECT USING (true);
CREATE POLICY "Admins manage player achievements"
  ON public.player_achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- 4. achievement_community_stats ----------
CREATE TABLE public.achievement_community_stats (
  achievement_template_id uuid NOT NULL REFERENCES public.achievement_templates(id) ON DELETE CASCADE,
  scope_type public.achievement_scope_type NOT NULL,
  scope_id uuid,
  unlocked_count int NOT NULL DEFAULT 0,
  total_eligible_players int NOT NULL DEFAULT 0,
  community_percentage numeric(5,2) NOT NULL DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_ach_stats_scoped
  ON public.achievement_community_stats(achievement_template_id, scope_type, scope_id)
  WHERE scope_id IS NOT NULL;
CREATE UNIQUE INDEX uniq_ach_stats_global
  ON public.achievement_community_stats(achievement_template_id, scope_type)
  WHERE scope_id IS NULL;

ALTER TABLE public.achievement_community_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stats viewable by everyone"
  ON public.achievement_community_stats FOR SELECT USING (true);
CREATE POLICY "Admins manage stats"
  ON public.achievement_community_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- 5. updated_at trigger on templates ----------
CREATE TRIGGER trg_ach_templates_updated
  BEFORE UPDATE ON public.achievement_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 6. Automatic evaluation trigger
-- =====================================================================
CREATE OR REPLACE FUNCTION public.evaluate_player_achievements(
  p_player_id uuid,
  p_game_id uuid DEFAULT NULL,
  p_season_id uuid DEFAULT NULL,
  p_match_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  v_count int;
  v_streak int;
  v_max_streak int;
  v_prev_pos int;
  v_pos int;
  v_scope_id uuid;
  rec RECORD;
BEGIN
  IF p_player_id IS NULL THEN RETURN; END IF;

  FOR t IN
    SELECT * FROM public.achievement_templates
    WHERE is_active = true AND type = 'automatic'
  LOOP
    v_count := 0;
    v_scope_id := NULL;

    -- Resolve scope_id based on template scope_type
    IF t.scope_type = 'game' THEN
      v_scope_id := p_game_id;
      IF v_scope_id IS NULL THEN CONTINUE; END IF;
    ELSIF t.scope_type = 'season' THEN
      v_scope_id := p_season_id;
      IF v_scope_id IS NULL THEN CONTINUE; END IF;
    END IF;

    -- Evaluate by trigger_type
    IF t.trigger_type = 'matches_total' THEN
      SELECT count(*) INTO v_count
      FROM public.match_results
      WHERE player_id = p_player_id;

    ELSIF t.trigger_type = 'wins_total' THEN
      SELECT count(*) INTO v_count
      FROM public.match_results
      WHERE player_id = p_player_id AND position = 1;

    ELSIF t.trigger_type = 'matches_by_game' THEN
      SELECT count(*) INTO v_count
      FROM public.match_results mr
      JOIN public.matches m ON m.id = mr.match_id
      WHERE mr.player_id = p_player_id AND m.game_id = p_game_id;

    ELSIF t.trigger_type = 'wins_by_game' THEN
      SELECT count(*) INTO v_count
      FROM public.match_results mr
      JOIN public.matches m ON m.id = mr.match_id
      WHERE mr.player_id = p_player_id AND m.game_id = p_game_id AND mr.position = 1;

    ELSIF t.trigger_type = 'distinct_games_played' THEN
      SELECT count(DISTINCT m.game_id) INTO v_count
      FROM public.match_results mr
      JOIN public.matches m ON m.id = mr.match_id
      WHERE mr.player_id = p_player_id;

    ELSIF t.trigger_type = 'first_win' THEN
      SELECT count(*) INTO v_count
      FROM public.match_results
      WHERE player_id = p_player_id AND position = 1
      LIMIT 1;

    ELSIF t.trigger_type = 'first_match_by_game' THEN
      SELECT count(*) INTO v_count
      FROM public.match_results mr
      JOIN public.matches m ON m.id = mr.match_id
      WHERE mr.player_id = p_player_id AND m.game_id = p_game_id
      LIMIT 1;

    ELSIF t.trigger_type = 'win_streak_by_game' THEN
      v_max_streak := 0;
      v_streak := 0;
      FOR rec IN
        SELECT mr.position
        FROM public.match_results mr
        JOIN public.matches m ON m.id = mr.match_id
        WHERE mr.player_id = p_player_id AND m.game_id = p_game_id
        ORDER BY m.played_at ASC
      LOOP
        IF rec.position = 1 THEN
          v_streak := v_streak + 1;
          IF v_streak > v_max_streak THEN v_max_streak := v_streak; END IF;
        ELSE
          v_streak := 0;
        END IF;
      END LOOP;
      v_count := v_max_streak;

    ELSIF t.trigger_type = 'season_top1' THEN
      -- Player has highest current_mmr in given season+game (any game in that season)
      SELECT count(*) INTO v_count
      FROM public.mmr_ratings r
      WHERE r.season_id = p_season_id
        AND r.player_id = p_player_id
        AND r.current_mmr = (
          SELECT max(current_mmr) FROM public.mmr_ratings
          WHERE season_id = p_season_id AND game_id = r.game_id
        );

    ELSE
      CONTINUE;
    END IF;

    -- Compare to threshold and insert if reached
    IF v_count >= COALESCE(t.threshold, 1) THEN
      INSERT INTO public.player_achievements (
        player_profile_id, achievement_template_id,
        scope_type, scope_id, match_id, status,
        unlocked_at, approved_at, metadata
      ) VALUES (
        p_player_id, t.id,
        t.scope_type, v_scope_id, p_match_id, 'approved',
        now(), now(),
        jsonb_build_object('progress', v_count, 'threshold', t.threshold)
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Trigger on match_results: evaluate for the affected player
CREATE OR REPLACE FUNCTION public.trg_eval_after_match_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id uuid;
  v_season_id uuid;
BEGIN
  IF NEW.player_id IS NULL THEN RETURN NEW; END IF;
  SELECT game_id, season_id INTO v_game_id, v_season_id
  FROM public.matches WHERE id = NEW.match_id;
  PERFORM public.evaluate_player_achievements(
    NEW.player_id, v_game_id, v_season_id, NEW.match_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evaluate_achievements_match_results ON public.match_results;
CREATE TRIGGER trg_evaluate_achievements_match_results
  AFTER INSERT OR UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.trg_eval_after_match_result();

-- =====================================================================
-- 7. Seed catalog
-- =====================================================================
-- Helper: insert seed templates (idempotent via UNIQUE code)

-- Game participation progression (scope=game, trigger=matches_by_game)
INSERT INTO public.achievement_templates
  (code, name, description_template, category, type, trigger_type, scope_type, threshold,
   rarity, progression_group, progression_level)
VALUES
  ('game_part_1','Primeira Mesa','Jogou {threshold} partida de {game_name}.',
    'participation','automatic','matches_by_game','game',1,'common','game_participation',1),
  ('game_part_2','Frequente','Jogou {threshold} partidas de {game_name}.',
    'participation','automatic','matches_by_game','game',5,'common','game_participation',2),
  ('game_part_3','Veterano','Jogou {threshold} partidas de {game_name}.',
    'participation','automatic','matches_by_game','game',15,'uncommon','game_participation',3),
  ('game_part_4','Especialista','Jogou {threshold} partidas de {game_name}.',
    'participation','automatic','matches_by_game','game',30,'rare','game_participation',4),
  ('game_part_5','Mestre','Jogou {threshold} partidas de {game_name}.',
    'participation','automatic','matches_by_game','game',60,'epic','game_participation',5),
  ('game_part_6','Lenda do Tabuleiro','Jogou {threshold} partidas de {game_name}.',
    'participation','automatic','matches_by_game','game',100,'legendary','game_participation',6)
ON CONFLICT (code) DO NOTHING;

-- Game wins progression (scope=game, trigger=wins_by_game)
INSERT INTO public.achievement_templates
  (code, name, description_template, category, type, trigger_type, scope_type, threshold,
   rarity, progression_group, progression_level)
VALUES
  ('game_win_1','Primeira Vitória','Venceu {threshold} partida de {game_name}.',
    'competitive','automatic','wins_by_game','game',1,'common','game_wins',1),
  ('game_win_2','Vencedor','Venceu {threshold} partidas de {game_name}.',
    'competitive','automatic','wins_by_game','game',3,'common','game_wins',2),
  ('game_win_3','Conquistador','Venceu {threshold} partidas de {game_name}.',
    'competitive','automatic','wins_by_game','game',10,'uncommon','game_wins',3),
  ('game_win_4','Dominador','Venceu {threshold} partidas de {game_name}.',
    'competitive','automatic','wins_by_game','game',20,'rare','game_wins',4),
  ('game_win_5','Campeão','Venceu {threshold} partidas de {game_name}.',
    'competitive','automatic','wins_by_game','game',40,'epic','game_wins',5),
  ('game_win_6','Imbatível','Venceu {threshold} partidas de {game_name}.',
    'competitive','automatic','wins_by_game','game',75,'legendary','game_wins',6)
ON CONFLICT (code) DO NOTHING;

-- Win streak (scope=game, trigger=win_streak_by_game)
INSERT INTO public.achievement_templates
  (code, name, description_template, category, type, trigger_type, scope_type, threshold,
   rarity, progression_group, progression_level)
VALUES
  ('game_streak_3','Sequência Quente','Venceu {threshold} partidas seguidas de {game_name}.',
    'competitive','automatic','win_streak_by_game','game',3,'uncommon','game_streak',1),
  ('game_streak_5','Em Chamas','Venceu {threshold} partidas seguidas de {game_name}.',
    'competitive','automatic','win_streak_by_game','game',5,'rare','game_streak',2),
  ('game_streak_8','Invencível','Venceu {threshold} partidas seguidas de {game_name}.',
    'competitive','automatic','win_streak_by_game','game',8,'legendary','game_streak',3)
ON CONFLICT (code) DO NOTHING;

-- Global participation (scope=global)
INSERT INTO public.achievement_templates
  (code, name, description_template, category, type, trigger_type, scope_type, threshold,
   rarity, progression_group, progression_level)
VALUES
  ('global_part_1','Iniciante da Comunidade','Jogou {threshold} partidas no total.',
    'participation','automatic','matches_total','global',1,'common','global_participation',1),
  ('global_part_2','Ativo na Comunidade','Jogou {threshold} partidas no total.',
    'participation','automatic','matches_total','global',25,'uncommon','global_participation',2),
  ('global_part_3','Veterano da Comunidade','Jogou {threshold} partidas no total.',
    'participation','automatic','matches_total','global',100,'rare','global_participation',3),
  ('global_part_4','Pilar da Comunidade','Jogou {threshold} partidas no total.',
    'participation','automatic','matches_total','global',300,'epic','global_participation',4)
ON CONFLICT (code) DO NOTHING;

-- Distinct games (scope=global, social-ish exploration → category social)
INSERT INTO public.achievement_templates
  (code, name, description_template, category, type, trigger_type, scope_type, threshold,
   rarity, progression_group, progression_level)
VALUES
  ('explorer_5','Explorador','Experimentou {threshold} jogos diferentes.',
    'social','automatic','distinct_games_played','global',5,'common','explorer',1),
  ('explorer_15','Polivalente','Experimentou {threshold} jogos diferentes.',
    'social','automatic','distinct_games_played','global',15,'uncommon','explorer',2),
  ('explorer_30','Colecionador','Experimentou {threshold} jogos diferentes.',
    'social','automatic','distinct_games_played','global',30,'epic','explorer',3)
ON CONFLICT (code) DO NOTHING;
