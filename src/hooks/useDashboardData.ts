import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";
import type { MatchData, UpcomingRoom, TopPlayer, ActiveSeason, UserRankPosition } from "@/types/dashboard";

type JoinedRecord<T> = T | T[] | null;

type SeasonRatingRow = {
  player_id: string;
  current_mmr: number;
  wins: number;
  games_played: number;
  game_id: string | null;
};

function unwrapJoinedRecord<T>(value: JoinedRecord<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatBoardMatch(
  match: { id: string; played_at: string; game: { name: string } | { name: string }[] | null },
  userResult: { position: number; score: number | null } | undefined
): MatchData {
  return {
    id: match.id,
    played_at: match.played_at,
    game: unwrapJoinedRecord(match.game),
    position: userResult?.position ?? null,
    score: userResult?.score ?? null,
    type: "boardgame",
    isUserMatch: !!userResult,
  };
}

function formatBloodMatch(
  match: { id: string; played_at: string; winning_team: string; script: { name: string } | { name: string }[] | null },
  userPlay: { team: string } | undefined
): MatchData {
  const won = userPlay ? userPlay.team === match.winning_team : null;
  const scriptName = unwrapJoinedRecord(match.script)?.name || "?";

  return {
    id: `blood-${match.id}`,
    played_at: match.played_at,
    game: { name: `Blood — ${scriptName}` },
    position: won === null ? null : won ? 1 : 2,
    score: null,
    type: "blood",
    isUserMatch: !!userPlay,
  };
}

async function fetchUpcomingRooms(userId: string): Promise<UpcomingRoom[]> {
  const { data: playerRooms } = await supabase
    .from("match_room_players")
    .select("room_id")
    .eq("player_id", userId);

  if (!playerRooms?.length) return [];

  const roomIds = playerRooms.map((room) => room.room_id);
  const { data: rooms } = await supabase
    .from("match_rooms")
    .select("id, title, scheduled_at, status, max_players, game:games(name)")
    .in("id", roomIds)
    .in("status", ["open", "full"] as never)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(3);

  if (!rooms?.length) return [];

  const { data: playerCounts } = await supabase
    .from("match_room_players")
    .select("room_id")
    .in("room_id", rooms.map((room: { id: string }) => room.id))
    .eq("type", "confirmed" as never);

  const countMap: Record<string, number> = {};
  for (const player of playerCounts || []) {
    countMap[player.room_id] = (countMap[player.room_id] || 0) + 1;
  }

  return (rooms as Array<{ id: string; game: JoinedRecord<{ name: string }> } & Omit<UpcomingRoom, "game" | "confirmed_count">>).map((room) => ({
    ...room,
    game: unwrapJoinedRecord(room.game),
    confirmed_count: countMap[room.id] || 0,
  }));
}

async function fetchRecentMatches(userId: string): Promise<MatchData[]> {
  const [boardRes, bloodRes] = await Promise.all([
    supabase.from("matches").select("id, played_at, game:games(name)").order("played_at", { ascending: false }).limit(10),
    supabase.from("blood_matches").select("id, played_at, winning_team, script:blood_scripts(name)").order("played_at", { ascending: false }).limit(10),
  ]);

  const boardMatches = boardRes.data || [];
  const bloodMatches = bloodRes.data || [];

  const [boardResultsRes, bloodPlayersRes] = await Promise.all([
    boardMatches.length > 0
      ? supabase.from("match_results").select("match_id, position, score, player_id").in("match_id", boardMatches.map((match) => match.id))
      : Promise.resolve({ data: [] as Array<{ match_id: string; position: number; score: number | null; player_id: string | null }> }),
    bloodMatches.length > 0
      ? supabase.from("blood_match_players").select("match_id, team, player_id").in("match_id", bloodMatches.map((match) => match.id))
      : Promise.resolve({ data: [] as Array<{ match_id: string; team: string; player_id: string }> }),
  ]);

  const allMatches: MatchData[] = [];

  for (const match of boardMatches as Array<{ id: string; played_at: string; game: JoinedRecord<{ name: string }> }>) {
    const userResult = boardResultsRes.data?.find((result) => result.match_id === match.id && result.player_id === userId);
    allMatches.push(formatBoardMatch(match, userResult));
  }

  for (const match of bloodMatches as Array<{ id: string; played_at: string; winning_team: string; script: JoinedRecord<{ name: string }> }>) {
    const userPlay = bloodPlayersRes.data?.find((player) => player.match_id === match.id && player.player_id === userId);
    allMatches.push(formatBloodMatch(match, userPlay));
  }

  allMatches.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
  return allMatches.slice(0, 8);
}

async function fetchActiveSeason(): Promise<ActiveSeason | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("seasons")
    .select("id, name, end_date")
    .eq("type", "boardgame")
    .lte("start_date", today)
    .gte("end_date", today)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("season_id", data.id);

  return { ...data, match_count: count || 0 };
}

async function fetchSeasonRankings(seasonId: string): Promise<TopPlayer[]> {
  const { data: ratings } = await supabase
    .from("mmr_ratings")
    .select("player_id, current_mmr, wins, games_played, game_id")
    .eq("season_id", seasonId);

  if (!ratings?.length) return [];

  const aggregateMap = new Map<string, { totalMmr: number; wins: number; gamesPlayed: number; gameCount: number }>();

  for (const rating of ratings as SeasonRatingRow[]) {
    const current = aggregateMap.get(rating.player_id) ?? { totalMmr: 0, wins: 0, gamesPlayed: 0, gameCount: 0 };
    current.totalMmr += Number(rating.current_mmr);
    current.wins += Number(rating.wins || 0);
    current.gamesPlayed += Number(rating.games_played || 0);
    current.gameCount += 1;
    aggregateMap.set(rating.player_id, current);
  }

  const playerIds = Array.from(aggregateMap.keys());
  const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: playerIds });
  const playerNameMap = new Map<string, string>((profiles || []).map((profile: { id: string; nickname: string | null; name: string }) => [profile.id, profile.nickname || profile.name || "?"]));

  return playerIds
    .map((playerId) => {
      const aggregate = aggregateMap.get(playerId)!;
      return {
        player_id: playerId,
        name: playerNameMap.get(playerId) || "?",
        current_mmr: Number((aggregate.totalMmr / aggregate.gameCount).toFixed(2)),
        wins: aggregate.wins,
        games_played: aggregate.gamesPlayed,
      };
    })
    .sort((a, b) => b.current_mmr - a.current_mmr || a.player_id.localeCompare(b.player_id));
}

type LatestUserSeasonMatch = {
  mmr_change: number | null;
  game_id: string | null;
  match_id: string | null;
  played_at: string | null;
};

async function fetchLatestUserSeasonMatch(userId: string, seasonId: string): Promise<LatestUserSeasonMatch | null> {
  const { data: results } = await supabase
    .from("match_results")
    .select("id, mmr_change, match_id, matches!inner(played_at, season_id, game_id)")
    .eq("player_id", userId)
    .eq("matches.season_id", seasonId);

  if (!results?.length) return null;

  const latestResult = [...results].sort((a: { id: string; matches: JoinedRecord<{ played_at: string }> }, b: { id: string; matches: JoinedRecord<{ played_at: string }> }) => {
    const playedAtA = new Date(unwrapJoinedRecord(a.matches)?.played_at || 0).getTime();
    const playedAtB = new Date(unwrapJoinedRecord(b.matches)?.played_at || 0).getTime();

    if (playedAtB !== playedAtA) return playedAtB - playedAtA;
    return b.id.localeCompare(a.id);
  })[0] as { id: string; mmr_change: number | null; match_id: string; matches: JoinedRecord<{ played_at: string; game_id: string }> } | undefined;

  if (!latestResult) return null;
  const m = unwrapJoinedRecord(latestResult.matches);
  return {
    mmr_change: latestResult.mmr_change ?? null,
    game_id: m?.game_id ?? null,
    match_id: latestResult.match_id ?? null,
    played_at: m?.played_at ?? null,
  };
}

type SeasonRatingFull = SeasonRatingRow;

async function fetchSeasonRatingsRaw(seasonId: string): Promise<SeasonRatingFull[]> {
  const { data } = await supabase
    .from("mmr_ratings")
    .select("player_id, current_mmr, wins, games_played, game_id")
    .eq("season_id", seasonId);
  return (data as SeasonRatingFull[]) ?? [];
}

async function fetchMatchMmrBefore(matchId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("match_results")
    .select("player_id, mmr_before")
    .eq("match_id", matchId);
  const map: Record<string, number> = {};
  for (const r of (data || []) as Array<{ player_id: string | null; mmr_before: number | null }>) {
    if (r.player_id && r.mmr_before != null) map[r.player_id] = Number(r.mmr_before);
  }
  return map;
}

function aggregateRatings(ratings: SeasonRatingFull[]): Map<string, number> {
  const agg = new Map<string, { total: number; count: number }>();
  for (const r of ratings) {
    const cur = agg.get(r.player_id) ?? { total: 0, count: 0 };
    cur.total += Number(r.current_mmr);
    cur.count += 1;
    agg.set(r.player_id, cur);
  }
  const out = new Map<string, number>();
  for (const [pid, v] of agg) out.set(pid, v.total / v.count);
  return out;
}

function rankToPositions(avgMap: Map<string, number>): Map<string, number> {
  const sorted = [...avgMap.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const pos = new Map<string, number>();
  sorted.forEach(([pid], i) => pos.set(pid, i + 1));
  return pos;
}


export function useDashboardData(userId: string | undefined) {
  const enabled = !!userId;

  const roomsQuery = useQuery({
    queryKey: ["dashboard", "upcomingRooms", userId],
    queryFn: () => fetchUpcomingRooms(userId!),
    enabled,
    staleTime: 60_000,
  });

  const matchesQuery = useQuery({
    queryKey: ["dashboard", "recentMatches", userId],
    queryFn: () => fetchRecentMatches(userId!),
    enabled,
    staleTime: 60_000,
  });

  const seasonQuery = useQuery({
    queryKey: ["dashboard", "activeSeason"],
    queryFn: fetchActiveSeason,
    enabled,
    staleTime: 5 * 60_000,
  });

  const seasonRankingsQuery = useQuery({
    queryKey: ["dashboard", "seasonRankings", seasonQuery.data?.id],
    queryFn: () => fetchSeasonRankings(seasonQuery.data!.id),
    enabled: !!seasonQuery.data?.id,
    staleTime: 60_000,
  });

  const latestUserResultQuery = useQuery({
    queryKey: ["dashboard", "latestUserSeasonMatch", userId, seasonQuery.data?.id],
    queryFn: () => fetchLatestUserSeasonMatch(userId!, seasonQuery.data!.id),
    enabled: !!userId && !!seasonQuery.data?.id,
    staleTime: 60_000,
  });

  const positionChangeQuery = useQuery({
    queryKey: [
      "dashboard",
      "positionChange",
      userId,
      seasonQuery.data?.id,
      latestUserResultQuery.data?.match_id,
      latestUserResultQuery.data?.game_id,
    ],
    queryFn: async () => {
      const last = latestUserResultQuery.data!;
      if (!last.match_id || !last.game_id) return null;
      const [ratings, mmrBefore] = await Promise.all([
        fetchSeasonRatingsRaw(seasonQuery.data!.id),
        fetchMatchMmrBefore(last.match_id),
      ]);
      if (!ratings.length) return null;

      // Current avg MMR per player (across all games in season)
      const currentAvg = aggregateRatings(ratings);
      const currentPos = rankToPositions(currentAvg);

      // Previous: replace current_mmr for the last-match game with mmr_before
      const prevRatings: SeasonRatingFull[] = ratings.map((r) => {
        if (r.game_id === last.game_id && mmrBefore[r.player_id] != null) {
          return { ...r, current_mmr: mmrBefore[r.player_id] };
        }
        return r;
      });
      const prevAvg = aggregateRatings(prevRatings);
      const prevPos = rankToPositions(prevAvg);

      const cur = currentPos.get(userId!);
      const prev = prevPos.get(userId!);
      if (cur == null || prev == null) return null;
      return prev - cur; // positive = subiu
    },
    enabled:
      !!userId &&
      !!seasonQuery.data?.id &&
      !!latestUserResultQuery.data?.match_id &&
      !!latestUserResultQuery.data?.game_id,
    staleTime: 60_000,
  });

  const rankings = seasonRankingsQuery.data ?? [];
  const userIndex = userId ? rankings.findIndex((entry) => entry.player_id === userId) : -1;
  const userRank: UserRankPosition | null = userIndex >= 0
    ? {
        position: userIndex + 1,
        current_mmr: rankings[userIndex].current_mmr,
        mmr_change: latestUserResultQuery.data?.mmr_change ?? null,
        position_change: positionChangeQuery.data ?? null,
      }
    : null;

  const loading = roomsQuery.isLoading || matchesQuery.isLoading || seasonQuery.isLoading ||
    (!!seasonQuery.data?.id && (seasonRankingsQuery.isLoading || latestUserResultQuery.isLoading));

  return {
    upcomingRooms: roomsQuery.data ?? [],
    recentMatches: matchesQuery.data ?? [],
    activeSeason: seasonQuery.data ?? null,
    topPlayers: rankings.slice(0, 5),
    userRank,
    loading,
    errors: {
      rooms: roomsQuery.error,
      matches: matchesQuery.error,
      season: seasonQuery.error,
      rankings: seasonRankingsQuery.error,
      userRank: latestUserResultQuery.error,
    },
  };
}
