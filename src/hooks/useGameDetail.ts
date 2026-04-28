import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";

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

  // Try to fetch with platform; fall back if column doesn't exist on external DB
  let { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("id, played_at, duration_minutes, image_url, season_id, first_player_id, platform")
    .eq("game_id", game.id)
    .order("played_at", { ascending: false });
  if (mErr) {
    const retry = await supabase
      .from("matches")
      .select("id, played_at, duration_minutes, image_url, season_id, first_player_id")
      .eq("game_id", game.id)
      .order("played_at", { ascending: false });
    matches = retry.data as any;
  }
  const matchIds = (matches || []).map((m: any) => m.id);

  if (matchIds.length === 0) {
    return { game, tags, matches: [], results: [], playerMap: {} as Record<string, string>, avatarMap: {} as Record<string, string | null> };
  }

  const { data: results } = await supabase
    .from("match_results")
    .select("id, match_id, player_id, position, score, seat_position, faction, mmr_change, mmr_before, mmr_after")
    .in("match_id", matchIds);
  const playerIds = [...new Set((results || []).map((r: any) => r.player_id))];
  const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: playerIds });
  const playerMap: Record<string, string> = {};
  const avatarMap: Record<string, string | null> = {};
  for (const p of profiles || []) {
    playerMap[p.id] = (p as any).nickname || p.name;
    avatarMap[p.id] = (p as any).avatar_url || null;
  }

  return { game, tags, matches: matches || [], results: results || [], playerMap, avatarMap };
};

export const useGameDetail = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["game-detail", slug],
    queryFn: () => fetchGameDetail(slug!),
    enabled: !!slug,
  });
};
