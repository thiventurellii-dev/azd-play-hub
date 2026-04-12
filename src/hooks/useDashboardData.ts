import { useQuery, useQueries } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";
import type { MatchData, UpcomingRoom, TopPlayer, ActiveSeason } from "@/types/dashboard";

// ---------- helpers ----------

function formatBoardMatch(
  match: { id: string; played_at: string; game: { name: string } | { name: string }[] | null },
  userResult: { position: number; score: number | null } | undefined
): MatchData {
  return {
    id: match.id,
    played_at: match.played_at,
    game: Array.isArray(match.game) ? match.game[0] : match.game,
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
  const scriptName = (Array.isArray(match.script) ? match.script[0] : match.script)?.name || "?";
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

// ---------- fetchers ----------

async function fetchUpcomingRooms(userId: string): Promise<UpcomingRoom[]> {
  const { data: playerRooms } = await supabase
    .from("match_room_players")
    .select("room_id")
    .eq("player_id", userId);

  if (!playerRooms?.length) return [];

  const roomIds = playerRooms.map((r) => r.room_id);
  const { data: rooms } = await supabase
    .from("match_rooms")
    .select("id, title, scheduled_at, status, game:games(name)")
    .in("id", roomIds)
    .in("status", ["open", "full"] as any)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(3);

  return (rooms || []).map((r: any) => ({
    ...r,
    game: Array.isArray(r.game) ? r.game[0] : r.game,
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
      ? supabase.from("match_results").select("match_id, position, score, player_id").in("match_id", boardMatches.map((m) => m.id))
      : Promise.resolve({ data: [] as any[] }),
    bloodMatches.length > 0
      ? supabase.from("blood_match_players").select("match_id, team, player_id").in("match_id", bloodMatches.map((m) => m.id))
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const all: MatchData[] = [];

  for (const m of boardMatches as any[]) {
    const userResult = boardResultsRes.data?.find((r: any) => r.match_id === m.id && r.player_id === userId);
    all.push(formatBoardMatch(m, userResult));
  }

  for (const m of bloodMatches as any[]) {
    const userPlay = bloodPlayersRes.data?.find((p: any) => p.match_id === m.id && p.player_id === userId);
    all.push(formatBloodMatch(m, userPlay));
  }

  all.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
  return all.slice(0, 8);
}

async function fetchActiveSeason(): Promise<ActiveSeason | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("type", "boardgame")
    .lte("start_date", today)
    .gte("end_date", today)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function fetchTopPlayers(seasonId: string): Promise<TopPlayer[]> {
  const { data: ratings } = await supabase
    .from("mmr_ratings")
    .select("player_id, current_mmr, wins, games_played")
    .eq("season_id", seasonId)
    .order("current_mmr", { ascending: false })
    .limit(5);

  if (!ratings?.length) return [];

  const pIds = ratings.map((r) => r.player_id);
  const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: pIds });
  const pMap = new Map((profiles || []).map((p: any) => [p.id, p.nickname || p.name]));

  return ratings.map((r) => ({ ...r, name: (pMap.get(r.player_id) || "?") as string }));
}

// ---------- hook ----------

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

  const topPlayersQuery = useQuery({
    queryKey: ["dashboard", "topPlayers", seasonQuery.data?.id],
    queryFn: () => fetchTopPlayers(seasonQuery.data!.id),
    enabled: !!seasonQuery.data?.id,
    staleTime: 60_000,
  });

  const loading = roomsQuery.isLoading || matchesQuery.isLoading || seasonQuery.isLoading ||
    (!!seasonQuery.data?.id && topPlayersQuery.isLoading);

  return {
    upcomingRooms: roomsQuery.data ?? [],
    recentMatches: matchesQuery.data ?? [],
    activeSeason: seasonQuery.data ?? null,
    topPlayers: topPlayersQuery.data ?? [],
    loading,
    errors: {
      rooms: roomsQuery.error,
      matches: matchesQuery.error,
      season: seasonQuery.error,
      topPlayers: topPlayersQuery.error,
    },
  };
}
