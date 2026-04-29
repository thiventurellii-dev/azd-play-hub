import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";

interface SeasonLink { season_id: string; season_name: string; status: string; }
interface GameTag { id: string; name: string; }

const fetchGamesData = async () => {
  const [gamesRes, sgRes, matchesRes, scriptsRes, charsRes, sbsRes, tagsRes, tagLinksRes, rpgSysRes, rpgAdvRes] = await Promise.all([
    supabase.from("games").select("*").order("name"),
    supabase.from("season_games").select("game_id, season_id"),
    supabase.from("matches").select("game_id, duration_minutes"),
    supabase.from("blood_scripts").select("*").order("name"),
    supabase.from("blood_characters").select("*").order("team, role_type, name"),
    supabase.from("season_blood_scripts").select("season_id, script_id"),
    supabase.from("game_tags").select("*").order("name"),
    supabase.from("game_tag_links").select("game_id, tag_id"),
    supabase.from("rpg_systems").select("*").order("name"),
    supabase.from("rpg_adventures").select("*").order("name"),
  ]);

  const games = ((gamesRes.data || []) as any[]).filter(
    (g) =>
      g.slug !== "blood-on-the-clocktower" &&
      g.slug !== "rpg-generico" &&
      g.slug !== "rpg-generic" &&
      (g.name || "").trim().toLowerCase() !== "rpg"
  );
  const bloodScripts = (scriptsRes.data || []) as any[];
  const bloodCharacters = (charsRes.data || []) as any[];
  const allTags = (tagsRes.data || []) as GameTag[];

  // Tag maps
  const gameTagMap: Record<string, string[]> = {};
  const tagNameMap: Record<string, string> = {};
  for (const t of allTags) tagNameMap[t.id] = t.name;
  for (const tl of (tagLinksRes.data || []) as any[]) {
    if (!gameTagMap[tl.game_id]) gameTagMap[tl.game_id] = [];
    const name = tagNameMap[tl.tag_id];
    if (name) gameTagMap[tl.game_id].push(name);
  }

  // Seasons for games
  const gameSeasons: Record<string, SeasonLink[]> = {};
  const sgData = sgRes.data || [];
  if (sgData.length > 0) {
    const seasonIds = [...new Set(sgData.map((sg) => sg.season_id))];
    const { data: seasons } = await supabase.from("seasons").select("id, name, status").in("id", seasonIds);
    const seasonMap: Record<string, { name: string; status: string }> = {};
    for (const s of seasons || []) seasonMap[s.id] = { name: s.name, status: s.status };
    for (const sg of sgData) {
      const s = seasonMap[sg.season_id];
      if (!s) continue;
      if (!gameSeasons[sg.game_id]) gameSeasons[sg.game_id] = [];
      gameSeasons[sg.game_id].push({ season_id: sg.season_id, season_name: s.name, status: s.status });
    }
  }

  // Seasons for scripts
  const scriptSeasons: Record<string, SeasonLink[]> = {};
  const sbsData = (sbsRes.data || []) as any[];
  if (sbsData.length > 0) {
    const bsSeasonIds = [...new Set(sbsData.map((s: any) => s.season_id))];
    const { data: bsSeasons } = await supabase.from("seasons").select("id, name, status").in("id", bsSeasonIds);
    const bsSeasonMap: Record<string, { name: string; status: string }> = {};
    for (const s of bsSeasons || []) bsSeasonMap[s.id] = { name: s.name, status: s.status };
    for (const sbs of sbsData) {
      const s = bsSeasonMap[sbs.season_id];
      if (!s) continue;
      if (!scriptSeasons[sbs.script_id]) scriptSeasons[sbs.script_id] = [];
      scriptSeasons[sbs.script_id].push({ season_id: sbs.season_id, season_name: s.name, status: s.status });
    }
  }

  // Avg durations + match counts + total playtime
  const avgDurations: Record<string, number> = {};
  const matchCounts: Record<string, number> = {};
  let totalPlaytime = 0;
  const durMap: Record<string, { total: number; count: number }> = {};
  for (const m of matchesRes.data || []) {
    matchCounts[m.game_id] = (matchCounts[m.game_id] || 0) + 1;
    if (m.duration_minutes) {
      totalPlaytime += m.duration_minutes;
      if (!durMap[m.game_id]) durMap[m.game_id] = { total: 0, count: 0 };
      durMap[m.game_id].total += m.duration_minutes;
      durMap[m.game_id].count += 1;
    }
  }
  for (const [gid, d] of Object.entries(durMap)) avgDurations[gid] = Math.round(d.total / d.count);

  // Games with an active season
  const activeSeasonGameIds = new Set<string>();
  for (const [gid, links] of Object.entries(gameSeasons)) {
    if (links.some((l) => l.status === "active")) activeSeasonGameIds.add(gid);
  }

  return {
    games,
    bloodScripts,
    bloodCharacters,
    allTags,
    gameTagMap,
    gameSeasons,
    scriptSeasons,
    avgDurations,
    matchCounts,
    totalPlaytime,
    activeSeasonGameIds,
    rpgSystems: rpgSysRes.data || [],
    rpgAdventures: rpgAdvRes.data || [],
  };
};

export const useGamesData = () => {
  return useQuery({
    queryKey: ["games-page-data"],
    queryFn: fetchGamesData,
  });
};
