import { supabase } from '@/integrations/supabase/client';

/**
 * Recalculate all MMR ratings for a given season and game
 * by replaying all remaining matches in chronological order.
 */
export const recalculateSeasonGameMmr = async (seasonId: string, gameId: string) => {
  // Get all matches for this season+game ordered by played_at
  const { data: matches } = await supabase
    .from('matches')
    .select('id, played_at, first_player_id')
    .eq('season_id', seasonId)
    .eq('game_id', gameId)
    .order('played_at', { ascending: true });

  if (!matches) return;

  // Get all match results for these matches
  const matchIds = matches.map(m => m.id);
  
  // Delete existing MMR ratings for this season+game
  const { data: existingRatings } = await supabase
    .from('mmr_ratings')
    .select('id')
    .eq('season_id', seasonId)
    .eq('game_id', gameId);
  
  if (existingRatings && existingRatings.length > 0) {
    await supabase.from('mmr_ratings').delete().eq('season_id', seasonId).eq('game_id', gameId);
  }

  if (matchIds.length === 0) return;

  const { data: allResults } = await supabase
    .from('match_results')
    .select('match_id, player_id, position, score')
    .in('match_id', matchIds);

  if (!allResults) return;

  // Track running MMR state
  const mmrState: Record<string, { mmr: number; gamesPlayed: number; wins: number }> = {};

  const K = 50;

  for (const match of matches) {
    const results = allResults
      .filter(r => r.match_id === match.id && r.player_id)
      .sort((a, b) => a.position - b.position);

    if (results.length === 0) continue;

    // Initialize new players
    for (const r of results) {
      if (!r.player_id) continue;
      if (!mmrState[r.player_id]) {
        mmrState[r.player_id] = { mmr: 1000, gamesPlayed: 0, wins: 0 };
      }
    }

    const n = results.length;
    const changes: Record<string, number> = {};
    for (const r of results) {
      if (r.player_id) changes[r.player_id] = 0;
    }

    // ELO pairwise
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pidA = results[i].player_id!;
        const pidB = results[j].player_id!;
        const rA = mmrState[pidA].mmr;
        const rB = mmrState[pidB].mmr;
        const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
        const eB = 1 / (1 + Math.pow(10, (rA - rB) / 400));
        let sA: number, sB: number;
        if (results[i].position < results[j].position) { sA = 1; sB = 0; }
        else if (results[i].position > results[j].position) { sA = 0; sB = 1; }
        else { sA = 0.5; sB = 0.5; }
        changes[pidA] += K * (sA - eA);
        changes[pidB] += K * (sB - eB);
      }
    }

    // Position bonus
    for (const r of results) {
      if (!r.player_id) continue;
      changes[r.player_id] += 5 * (n - r.position);
    }

    // Update MMR state and match_results
    for (const r of results) {
      if (!r.player_id) continue;
      const change = parseFloat(changes[r.player_id].toFixed(2));
      const before = mmrState[r.player_id].mmr;
      const after = before + change;
      mmrState[r.player_id].mmr = after;
      mmrState[r.player_id].gamesPlayed += 1;
      if (r.position === 1) mmrState[r.player_id].wins += 1;

      // Update the match_result row with recalculated values
      await supabase
        .from('match_results')
        .update({ mmr_before: before, mmr_change: change, mmr_after: after })
        .eq('match_id', match.id)
        .eq('player_id', r.player_id);
    }
  }

  // Upsert final MMR ratings
  for (const [playerId, state] of Object.entries(mmrState)) {
    await supabase.rpc('upsert_mmr_for_match', {
      p_player_id: playerId,
      p_season_id: seasonId,
      p_game_id: gameId,
      p_current_mmr: state.mmr,
      p_games_played: state.gamesPlayed,
      p_wins: state.wins,
    });
  }
};
