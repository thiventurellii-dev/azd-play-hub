import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";
import { fetchPublicProfiles } from "@/lib/profilesPublic";

const fetchGameDetail = async (slug: string) => {
  const { data } = await supabase.from("games").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const game = data as any;

  const { data: tagLinks } = await supabase.from("game_tag_links").select("tag_id").eq("game_id", game.id);
  let tags: string[] = [];
  if (tagLinks && tagLinks.length > 0) {
    const tagIds = tagLinks.map((t: any) => t.tag_id);
    const { data: tagData } = await supabase.from("game_tags").select("name").in("id", tagIds);
    tags = (tagData || []).map((t: any) => t.name);
  }

  const { data: matches } = await supabase.from("matches").select("id, played_at, duration_minutes, season_id").eq("game_id", game.id).order("played_at", { ascending: false });
  const matchIds = (matches || []).map((m) => m.id);

  if (matchIds.length === 0) {
    return { game, tags, matches: [], results: [], playerMap: {} as Record<string, string> };
  }

  const { data: results } = await supabase.from("match_results").select("*").in("match_id", matchIds);
  const playerIds = [...new Set((results || []).map((r) => r.player_id))];
  const profiles = await fetchPublicProfiles(playerIds as string[]);
  const playerMap: Record<string, string> = {};
  for (const p of profiles) playerMap[p.id] = p.nickname || p.name;

  return { game, tags, matches: matches || [], results: results || [], playerMap };
};

export const useGameDetail = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["game-detail", slug],
    queryFn: () => fetchGameDetail(slug!),
    enabled: !!slug,
  });
};
