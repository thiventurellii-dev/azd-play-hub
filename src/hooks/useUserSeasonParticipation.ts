import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the Set of season IDs in which the current user has played at least one match
 * (boardgame match_results OR blood_match_players). Used to highlight participated
 * seasons in the timeline.
 */
export const useUserSeasonParticipation = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-season-participation", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const set = new Set<string>();
      if (!user?.id) return set;

      // Boardgame: match_results -> matches.season_id
      const { data: mrData } = await supabase
        .from("match_results")
        .select("match_id")
        .eq("player_id", user.id);
      const matchIds = [...new Set((mrData || []).map((r: any) => r.match_id))];
      if (matchIds.length > 0) {
        const { data: matches } = await supabase
          .from("matches")
          .select("season_id")
          .in("id", matchIds);
        for (const m of matches || []) if (m.season_id) set.add(m.season_id);
      }

      // Blood: blood_match_players -> blood_matches.season_id
      const { data: bmpData } = await supabase
        .from("blood_match_players")
        .select("match_id")
        .eq("player_id", user.id);
      const bmIds = [...new Set((bmpData || []).map((r: any) => r.match_id))];
      if (bmIds.length > 0) {
        const { data: bmatches } = await supabase
          .from("blood_matches")
          .select("season_id")
          .in("id", bmIds);
        for (const m of bmatches || []) if (m.season_id) set.add(m.season_id);
      }

      return set;
    },
  });
};
