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
  cover_url: string | null;
  /** Auto-derived cover from cover_url OR first linked game/script image */
  effective_cover_url: string | null;
  participants_count: number;
  champion_name: string | null;
}

const fetchSeasonsData = async () => {
  const [seasonsRes, sgRes, sbsRes, mmrRes, bmmrRes] = await Promise.all([
    supabase.from("seasons").select("*").order("start_date", { ascending: true }),
    supabase.from("season_games").select("season_id, game_id"),
    supabase.from("season_blood_scripts").select("season_id, script_id"),
    supabase.from("mmr_ratings").select("season_id, player_id, current_mmr, wins, games_played"),
    supabase.from("blood_mmr_ratings").select("season_id, player_id, total_points"),
  ]);

  const sgData = sgRes.data || [];
  const sbsData = (sbsRes.data || []) as any[];
  const gameIds = [...new Set(sgData.map((sg) => sg.game_id))];
  const scriptIds = [...new Set(sbsData.map((s) => s.script_id))];

  const [gamesRes, scriptsRes] = await Promise.all([
    gameIds.length > 0
      ? supabase.from("games").select("id, name, image_url").in("id", gameIds)
      : Promise.resolve({ data: [] as any[] }),
    scriptIds.length > 0
      ? supabase.from("blood_scripts").select("id, name, image_url").in("id", scriptIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const gameMap: Record<string, { name: string; image_url: string | null }> = {};
  for (const g of (gamesRes.data || []) as any[]) gameMap[g.id] = { name: g.name, image_url: g.image_url };
  const scriptMap: Record<string, { name: string; image_url: string | null }> = {};
  for (const s of (scriptsRes.data || []) as any[]) scriptMap[s.id] = { name: s.name, image_url: s.image_url };

  const seasonGames: Record<string, string[]> = {};
  const seasonGameImages: Record<string, string | null> = {};
  for (const sg of sgData) {
    const info = gameMap[sg.game_id];
    if (!info) continue;
    if (!seasonGames[sg.season_id]) seasonGames[sg.season_id] = [];
    seasonGames[sg.season_id].push(info.name);
    if (!seasonGameImages[sg.season_id] && info.image_url) seasonGameImages[sg.season_id] = info.image_url;
  }

  const seasonScripts: Record<string, string[]> = {};
  const seasonScriptImages: Record<string, string | null> = {};
  for (const sbs of sbsData) {
    const info = scriptMap[sbs.script_id];
    if (!info) continue;
    if (!seasonScripts[sbs.season_id]) seasonScripts[sbs.season_id] = [];
    seasonScripts[sbs.season_id].push(info.name);
    if (!seasonScriptImages[sbs.season_id] && info.image_url) seasonScriptImages[sbs.season_id] = info.image_url;
  }

  // Aggregate participants and champion per season
  const participantsBySeason: Record<string, Set<string>> = {};
  const championBySeason: Record<string, { player_id: string; metric: number } | null> = {};

  for (const r of (mmrRes.data || []) as any[]) {
    if (!participantsBySeason[r.season_id]) participantsBySeason[r.season_id] = new Set();
    participantsBySeason[r.season_id].add(r.player_id);
    const cur = championBySeason[r.season_id];
    if (!cur || r.current_mmr > cur.metric) championBySeason[r.season_id] = { player_id: r.player_id, metric: r.current_mmr };
  }
  for (const r of (bmmrRes.data || []) as any[]) {
    if (!participantsBySeason[r.season_id]) participantsBySeason[r.season_id] = new Set();
    participantsBySeason[r.season_id].add(r.player_id);
    const cur = championBySeason[r.season_id];
    if (!cur || r.total_points > cur.metric) championBySeason[r.season_id] = { player_id: r.player_id, metric: r.total_points };
  }

  // Resolve champion names
  const championIds = Object.values(championBySeason).filter(Boolean).map((c) => c!.player_id);
  const uniqueChampionIds = [...new Set(championIds)];
  const championNames: Record<string, string> = {};
  if (uniqueChampionIds.length > 0) {
    const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: uniqueChampionIds });
    for (const p of (profiles || []) as any[]) championNames[p.id] = p.nickname || p.name || "?";
  }

  const seasons: SeasonItem[] = ((seasonsRes.data || []) as any[]).map((s) => {
    const fallbackImg = s.type === "blood" ? seasonScriptImages[s.id] : seasonGameImages[s.id];
    const champ = championBySeason[s.id];
    return {
      ...s,
      status: computeStatus(s.start_date, s.end_date),
      prize_1st: s.prize_1st || 0, prize_2nd: s.prize_2nd || 0, prize_3rd: s.prize_3rd || 0,
      prize_4th_6th: s.prize_4th_6th || 0, prize_7th_10th: s.prize_7th_10th || 0,
      type: s.type || "boardgame",
      cover_url: s.cover_url || null,
      effective_cover_url: s.cover_url || fallbackImg || null,
      participants_count: participantsBySeason[s.id]?.size || 0,
      champion_name: champ ? championNames[champ.player_id] || null : null,
    };
  });

  return { seasons, seasonGames, seasonScripts };
};

export const useSeasonsData = () => {
  return useQuery({
    queryKey: ["seasons-page-data"],
    queryFn: fetchSeasonsData,
  });
};
