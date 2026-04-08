import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";

const computeStatus = (start: string, end: string): string => {
  const now = new Date();
  if (now < new Date(start + "T00:00:00")) return "upcoming";
  if (now > new Date(end + "T23:59:59")) return "finished";
  return "active";
};

export interface SeasonItem {
  id: string; name: string; description: string | null; start_date: string; end_date: string;
  status: string; prize: string | null; prize_1st: number; prize_2nd: number; prize_3rd: number;
  prize_4th_6th: number; prize_7th_10th: number; type: "boardgame" | "blood";
}

const fetchSeasonsData = async () => {
  const [seasonsRes, sgRes, sbsRes] = await Promise.all([
    supabase.from("seasons").select("*").order("start_date", { ascending: true }),
    supabase.from("season_games").select("season_id, game_id"),
    supabase.from("season_blood_scripts").select("season_id, script_id"),
  ]);

  const seasons: SeasonItem[] = (seasonsRes.data || []).map((s) => ({
    ...s,
    status: computeStatus(s.start_date, s.end_date),
    prize_1st: s.prize_1st || 0, prize_2nd: s.prize_2nd || 0, prize_3rd: s.prize_3rd || 0,
    prize_4th_6th: (s as any).prize_4th_6th || 0, prize_7th_10th: (s as any).prize_7th_10th || 0,
    type: (s as any).type || "boardgame",
  }));

  const seasonGames: Record<string, string[]> = {};
  const sgData = sgRes.data || [];
  if (sgData.length > 0) {
    const gameIds = [...new Set(sgData.map(sg => sg.game_id))];
    const { data: gamesData } = await supabase.from("games").select("id, name").in("id", gameIds);
    const gameMap: Record<string, string> = {};
    for (const g of gamesData || []) gameMap[g.id] = g.name;
    for (const sg of sgData) {
      if (!seasonGames[sg.season_id]) seasonGames[sg.season_id] = [];
      const n = gameMap[sg.game_id];
      if (n) seasonGames[sg.season_id].push(n);
    }
  }

  const seasonScripts: Record<string, string[]> = {};
  const sbsData = (sbsRes.data || []) as any[];
  if (sbsData.length > 0) {
    const scriptIds = [...new Set(sbsData.map(s => s.script_id))];
    const { data: scriptsData } = await supabase.from("blood_scripts").select("id, name").in("id", scriptIds);
    const scriptMap: Record<string, string> = {};
    for (const s of (scriptsData || []) as any[]) scriptMap[s.id] = s.name;
    for (const sbs of sbsData) {
      if (!seasonScripts[sbs.season_id]) seasonScripts[sbs.season_id] = [];
      const n = scriptMap[sbs.script_id];
      if (n) seasonScripts[sbs.season_id].push(n);
    }
  }

  return { seasons, seasonGames, seasonScripts };
};

export const useSeasonsData = () => {
  return useQuery({
    queryKey: ["seasons-page-data"],
    queryFn: fetchSeasonsData,
  });
};
