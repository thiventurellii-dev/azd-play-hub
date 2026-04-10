import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";
import { fetchPublicProfiles } from "@/lib/profilesPublic";

interface BloodScript {
  id: string; name: string; description: string | null; slug: string | null; victory_conditions: string[];
  image_url: string | null;
}
interface BloodCharacter {
  id: string; script_id: string; name: string; name_en: string; team: "good" | "evil";
  role_type: "townsfolk" | "outsider" | "minion" | "demon"; description: string | null; icon_url: string | null;
}
interface BloodMatch {
  id: string; played_at: string; duration_minutes: number | null; winning_team: "good" | "evil";
  storyteller_player_id: string; season_id: string; victory_conditions?: string[];
}
interface MatchPlayer { match_id: string; player_id: string; character_id: string; team: "good" | "evil"; }

const fetchScriptDetail = async (slug: string) => {
  const { data: scriptsData } = await supabase.from("blood_scripts").select("*").order("name");
  const allScripts = (scriptsData || []) as any[];
  const found = allScripts.find((s: any) => s.slug === slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === slug);
  if (!found) return null;

  const script: BloodScript = {
    id: found.id, name: found.name, description: found.description, slug: found.slug,
    victory_conditions: Array.isArray(found.victory_conditions) ? found.victory_conditions : [],
    image_url: found.image_url || null,
  };

  const [charsRes, matchesRes, playersRes] = await Promise.all([
    supabase.from("blood_characters").select("*").eq("script_id", found.id).order("team, role_type, name"),
    supabase.from("blood_matches").select("*").eq("script_id", found.id).order("played_at", { ascending: false }),
    supabase.from("profiles").select("id, name, nickname").order("name"),
  ]);

  const characters = (charsRes.data || []) as BloodCharacter[];
  const allPlayers = (playersRes.data || []) as any[];
  const matches = (matchesRes.data || []) as BloodMatch[];

  let matchPlayers: MatchPlayer[] = [];
  let profiles: Record<string, string> = {};

  if (matches.length > 0) {
    const matchIds = matches.map((m) => m.id);
    const { data: mpData } = await supabase.from("blood_match_players").select("*").in("match_id", matchIds);
    matchPlayers = (mpData || []) as MatchPlayer[];
    const playerIds = new Set<string>();
    for (const mp of mpData || []) playerIds.add(mp.player_id);
    for (const m of matches) playerIds.add(m.storyteller_player_id);
    if (playerIds.size > 0) {
      const { data: profilesData } = await supabase.from("profiles").select("id, nickname, name").in("id", [...playerIds]);
      for (const p of profilesData || []) profiles[p.id] = p.nickname || p.name;
    }
  }

  return { script, characters, matches, matchPlayers, profiles, allPlayers };
};

export const useScriptDetail = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["script-detail", slug],
    queryFn: () => fetchScriptDetail(slug!),
    enabled: !!slug,
  });
};
