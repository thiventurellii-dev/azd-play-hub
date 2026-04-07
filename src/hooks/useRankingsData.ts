import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RankingEntry, BloodRankingEntry, SeasonBase } from "@/types/database";

const fetchSeasons = async (): Promise<SeasonBase[]> => {
  const { data } = await supabase.from("seasons").select("*").order("start_date", { ascending: false });
  if (!data) return [];
  return data.map((s) => ({ ...s, type: (s as any).type || "boardgame" })) as SeasonBase[];
};

const fetchBoardgameRankings = async (seasonId: string): Promise<RankingEntry[]> => {
  const { data } = await supabase
    .from("mmr_ratings")
    .select("player_id, current_mmr, games_played, wins, profiles(name, nickname)")
    .eq("season_id", seasonId)
    .order("current_mmr", { ascending: false });
  if (!data) return [];
  return data.map((r: any) => ({
    ...r,
    player_name: r.profiles?.nickname || r.profiles?.name || "Unknown",
  }));
};

const fetchBloodRankings = async (seasonId: string): Promise<BloodRankingEntry[]> => {
  const { data } = await supabase
    .from("blood_mmr_ratings")
    .select("*")
    .eq("season_id", seasonId)
    .order("total_points", { ascending: false });
  if (!data || data.length === 0) return [];
  const playerIds = (data as any[]).map((r) => r.player_id);
  const { data: profiles } = await supabase.from("profiles").select("id, name, nickname").in("id", playerIds);
  const pMap: Record<string, string> = {};
  for (const p of profiles || []) pMap[p.id] = (p as any).nickname || p.name;
  return (data as any[]).map((r) => ({ ...r, player_name: pMap[r.player_id] || "?" }));
};

export const useSeasonsList = () => {
  return useQuery({
    queryKey: ["rankings-seasons"],
    queryFn: fetchSeasons,
  });
};

export const useBoardgameRankings = (seasonId: string | undefined) => {
  return useQuery({
    queryKey: ["boardgame-rankings", seasonId],
    queryFn: () => fetchBoardgameRankings(seasonId!),
    enabled: !!seasonId,
  });
};

export const useBloodRankings = (seasonId: string | undefined) => {
  return useQuery({
    queryKey: ["blood-rankings", seasonId],
    queryFn: () => fetchBloodRankings(seasonId!),
    enabled: !!seasonId,
  });
};
