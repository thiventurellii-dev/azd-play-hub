-- =====================================================================
-- Achievements v2 — Add automatic evaluation trigger for BotC matches.
-- Apply manually in the EXTERNAL Supabase SQL Editor (npinawelxdtsrcvzzvvs).
--
-- Mirrors trg_eval_after_match_result, but for blood_match_players so that
-- BotC participation/wins also trigger achievement evaluation.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.trg_eval_after_blood_player()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id uuid;
BEGIN
  IF NEW.player_id IS NULL THEN RETURN NEW; END IF;
  SELECT season_id INTO v_season_id
  FROM public.blood_matches WHERE id = NEW.match_id;
  -- BotC has no game_id (it's its own subsystem); pass NULL so only
  -- global/season-scoped automatic templates fire.
  PERFORM public.evaluate_player_achievements(
    NEW.player_id, NULL, v_season_id, NEW.match_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evaluate_achievements_blood_players ON public.blood_match_players;
CREATE TRIGGER trg_evaluate_achievements_blood_players
  AFTER INSERT OR UPDATE ON public.blood_match_players
  FOR EACH ROW EXECUTE FUNCTION public.trg_eval_after_blood_player();
