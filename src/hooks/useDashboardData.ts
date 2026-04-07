import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MatchData, UpcomingRoom, TopPlayer, ActiveSeason } from "@/types/dashboard";

export function useDashboardData(userId: string | undefined) {
  const [upcomingRooms, setUpcomingRooms] = useState<UpcomingRoom[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchData[]>([]);
  const [activeSeason, setActiveSeason] = useState<ActiveSeason | null>(null);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchDashboard = async () => {
      setLoading(true);

      const today = new Date().toISOString().slice(0, 10);
      const [playerRoomsRes, recentBoardRes, recentBloodRes, seasonRes] = await Promise.all([
        supabase.from("match_room_players").select("room_id").eq("player_id", userId),
        supabase.from("matches").select("id, played_at, game:games(name)").order("played_at", { ascending: false }).limit(10),
        supabase.from("blood_matches").select("id, played_at, winning_team, script:blood_scripts(name)").order("played_at", { ascending: false }).limit(10),
        supabase.from("seasons").select("id, name").eq("type", "boardgame").lte("start_date", today).gte("end_date", today).order("start_date", { ascending: false }).limit(1).maybeSingle(),
      ]);

      // Upcoming rooms
      const playerRooms = playerRoomsRes.data;
      if (playerRooms && playerRooms.length > 0) {
        const roomIds = playerRooms.map((r) => r.room_id);
        const { data: rooms } = await supabase
          .from("match_rooms")
          .select("id, title, scheduled_at, status, game:games(name)")
          .in("id", roomIds)
          .in("status", ["open", "full"] as any)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
          .limit(3);
        if (rooms) {
          setUpcomingRooms(
            rooms.map((r: any) => ({ ...r, game: Array.isArray(r.game) ? r.game[0] : r.game }))
          );
        }
      }

      // Recent matches
      const allRecent: MatchData[] = [];
      const recentBoardMatches = recentBoardRes.data;
      const recentBloodMatches = recentBloodRes.data;

      const [boardResultsRes, bloodPlayersRes] = await Promise.all([
        recentBoardMatches && recentBoardMatches.length > 0
          ? supabase.from("match_results").select("match_id, position, score, player_id").in("match_id", recentBoardMatches.map((m: any) => m.id))
          : Promise.resolve({ data: [] }),
        recentBloodMatches && recentBloodMatches.length > 0
          ? supabase.from("blood_match_players").select("match_id, team, player_id").in("match_id", recentBloodMatches.map((m: any) => m.id))
          : Promise.resolve({ data: [] }),
      ]);

      if (recentBoardMatches) {
        for (const m of recentBoardMatches as any[]) {
          const userResult = boardResultsRes.data?.find((r: any) => r.match_id === m.id && r.player_id === userId);
          allRecent.push({
            id: m.id,
            played_at: m.played_at,
            game: Array.isArray(m.game) ? m.game[0] : m.game,
            position: userResult?.position ?? null,
            score: userResult?.score ?? null,
            type: "boardgame",
            isUserMatch: !!userResult,
          });
        }
      }

      if (recentBloodMatches) {
        for (const m of recentBloodMatches as any[]) {
          const userPlay = bloodPlayersRes.data?.find((p: any) => p.match_id === m.id && p.player_id === userId);
          const won = userPlay ? userPlay.team === m.winning_team : null;
          allRecent.push({
            id: `blood-${m.id}`,
            played_at: m.played_at,
            game: { name: `Blood — ${(Array.isArray(m.script) ? m.script[0] : m.script)?.name || "?"}` },
            position: won === null ? null : won ? 1 : 2,
            score: null,
            type: "blood",
            isUserMatch: !!userPlay,
          });
        }
      }

      allRecent.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
      setRecentMatches(allRecent.slice(0, 8));

      // Season ranking
      const season = seasonRes.data;
      if (!season) {
        setActiveSeason(null);
        setTopPlayers([]);
      } else {
        setActiveSeason(season);
        const { data: ratings } = await supabase
          .from("mmr_ratings")
          .select("player_id, current_mmr, wins, games_played")
          .eq("season_id", season.id)
          .order("current_mmr", { ascending: false })
          .limit(5);

        if (ratings && ratings.length > 0) {
          const pIds = ratings.map((r) => r.player_id);
          const { data: profiles } = await supabase.from("profiles").select("id, nickname, name").in("id", pIds);
          const pMap = new Map((profiles || []).map((p: any) => [p.id, p.nickname || p.name]));
          setTopPlayers(ratings.map((r) => ({ ...r, name: pMap.get(r.player_id) || "?" })));
        } else {
          setTopPlayers([]);
        }
      }

      setLoading(false);
    };

    fetchDashboard();
  }, [userId]);

  return { upcomingRooms, recentMatches, activeSeason, topPlayers, loading };
}
