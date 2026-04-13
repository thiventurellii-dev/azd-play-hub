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

async function fetchLatestUserSeasonMmrChange(userId: string, seasonId: string): Promise<number | null> {
  const { data: results } = await supabase
    .from("match_results")
    .select("id, mmr_change, matches!inner(played_at, season_id)")
    .eq("player_id", userId)
    .eq("matches.season_id", seasonId);

  if (!results?.length) return null;

  const latestResult = [...results].sort((a: { id: string; matches: JoinedRecord<{ played_at: string }> }, b: { id: string; matches: JoinedRecord<{ played_at: string }> }) => {
    const playedAtA = new Date(unwrapJoinedRecord(a.matches)?.played_at || 0).getTime();
    const playedAtB = new Date(unwrapJoinedRecord(b.matches)?.played_at || 0).getTime();

    if (playedAtB !== playedAtA) return playedAtB - playedAtA;
    return b.id.localeCompare(a.id);
  })[0];

  return latestResult?.mmr_change ?? null;
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
    queryKey: ["dashboard", "latestUserSeasonResult", userId, seasonQuery.data?.id],
    queryFn: () => fetchLatestUserSeasonMmrChange(userId!, seasonQuery.data!.id),
    enabled: !!userId && !!seasonQuery.data?.id,
    staleTime: 60_000,
  });

  const rankings = seasonRankingsQuery.data ?? [];
  const userIndex = userId ? rankings.findIndex((entry) => entry.player_id === userId) : -1;
  const userRank: UserRankPosition | null = userIndex >= 0
    ? {
        position: userIndex + 1,
        current_mmr: rankings[userIndex].current_mmr,
        mmr_change: latestUserResultQuery.data ?? null,
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
