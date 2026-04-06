import { supabase } from "@/integrations/supabase/client";

interface BloodPlayerEntry {
  player_id: string;
  character_id: string;
  team: 'good' | 'evil';
}

/**
 * Recalculates all blood_mmr_ratings for a given season from scratch.
 * Shared between AdminBloodMatches and NewMatchBotcFlow.
 */
export const recalculateSeasonRatings = async (seasonId: string) => {
  const { data: sMatches } = await supabase
    .from('blood_matches')
    .select('id, storyteller_player_id, winning_team')
    .eq('season_id', seasonId);
  if (!sMatches || sMatches.length === 0) return;

  const matchIds = sMatches.map(m => m.id);
  const { data: sPlayers } = await supabase
    .from('blood_match_players')
    .select('match_id, player_id, team')
    .in('match_id', matchIds);

  const ratings: Record<string, { games_played: number; wins_evil: number; wins_good: number; games_as_storyteller: number }> = {};

  const ensure = (pid: string) => {
    if (!ratings[pid]) ratings[pid] = { games_played: 0, wins_evil: 0, wins_good: 0, games_as_storyteller: 0 };
  };

  for (const match of sMatches) {
    const matchPlayers = (sPlayers || []).filter(p => p.match_id === match.id);
    const stId = match.storyteller_player_id;

    ensure(stId);
    const stIsAlsoPlayer = matchPlayers.some(p => p.player_id === stId);
    if (!stIsAlsoPlayer) {
      ratings[stId].games_played += 1;
      ratings[stId].games_as_storyteller += 1;
    }

    for (const mp of matchPlayers) {
      ensure(mp.player_id);
      ratings[mp.player_id].games_played += 1;
      if (mp.player_id === stId) {
        ratings[mp.player_id].games_as_storyteller += 1;
      }
      const won = mp.team === match.winning_team;
      if (won && mp.team === 'evil') ratings[mp.player_id].wins_evil += 1;
      if (won && mp.team === 'good') ratings[mp.player_id].wins_good += 1;
    }
  }

  await supabase.from('blood_mmr_ratings').delete().eq('season_id', seasonId);

  const inserts = Object.entries(ratings).map(([player_id, r]) => ({
    player_id,
    season_id: seasonId,
    games_played: r.games_played,
    wins_evil: r.wins_evil,
    wins_good: r.wins_good,
    games_as_storyteller: r.games_as_storyteller,
    total_points: r.games_played + (r.wins_evil * 2) + r.wins_good,
  }));

  if (inserts.length > 0) {
    await supabase.from('blood_mmr_ratings').insert(inserts as any);
  }
};

/**
 * Submits a Blood on the Clocktower match to the database.
 * Used by both AdminBloodMatches and NewMatchBotcFlow.
 */
export const submitBloodMatch = async (params: {
  seasonId: string;
  scriptId: string;
  playedAt: string;
  durationMinutes: number | null;
  storytellerId: string;
  winningTeam: 'good' | 'evil';
  players: BloodPlayerEntry[];
}) => {
  const { data: match, error: matchErr } = await supabase
    .from('blood_matches')
    .insert({
      season_id: params.seasonId,
      script_id: params.scriptId,
      played_at: params.playedAt,
      duration_minutes: params.durationMinutes,
      storyteller_player_id: params.storytellerId,
      winning_team: params.winningTeam,
    } as any)
    .select().single();
  if (matchErr) throw matchErr;

  const matchPlayers = params.players.map(p => ({
    match_id: (match as any).id,
    player_id: p.player_id,
    character_id: p.character_id,
    team: p.team,
  }));
  const { error: playersErr } = await supabase.from('blood_match_players').insert(matchPlayers as any);
  if (playersErr) throw playersErr;

  await recalculateSeasonRatings(params.seasonId);

  return match;
};
