
CREATE OR REPLACE FUNCTION public.upsert_mmr_for_match(
  p_player_id uuid,
  p_season_id uuid,
  p_game_id uuid,
  p_current_mmr numeric DEFAULT 1000,
  p_games_played integer DEFAULT 0,
  p_wins integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.mmr_ratings (player_id, season_id, game_id, current_mmr, games_played, wins, updated_at)
  VALUES (p_player_id, p_season_id, p_game_id, p_current_mmr, p_games_played, p_wins, now())
  ON CONFLICT (player_id, season_id) 
  DO UPDATE SET
    current_mmr = EXCLUDED.current_mmr,
    games_played = EXCLUDED.games_played,
    wins = EXCLUDED.wins,
    game_id = EXCLUDED.game_id,
    updated_at = now();
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_mmr_for_match TO authenticated;
