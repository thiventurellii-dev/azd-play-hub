import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";

export interface GameLite {
  id: string;
  name: string;
}

/**
 * Mapa { id -> nome } de todos os jogos. Usado para resolver
 * o nome do escopo de uma conquista (scope_id -> game name).
 */
export const useGamesMap = () =>
  useQuery({
    queryKey: ["games-map"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, name");
      if (error) throw error;
      const map = new Map<string, string>();
      for (const g of (data ?? []) as GameLite[]) map.set(g.id, g.name);
      return map;
    },
  });

/**
 * Identifica o domínio (boardgame/botc/rpg) de uma conquista
 * a partir do template + nome do jogo do escopo.
 */
export const BOTC_GAME_NAME = "Blood on the Clocktower";

export type AchievementDomain = "boardgame" | "botc" | "rpg" | "global";

export const resolveDomain = (
  scopeType: string,
  scopeGameName: string | undefined,
  templateCode: string,
): AchievementDomain => {
  if (templateCode?.startsWith("rpg_")) return "rpg";
  if (templateCode?.startsWith("botc_") || scopeGameName === BOTC_GAME_NAME) return "botc";
  if (scopeType === "game") return "boardgame";
  return "global";
};

export const DOMAIN_LABEL: Record<AchievementDomain, string> = {
  boardgame: "Boardgame",
  botc: "Blood on the Clocktower",
  rpg: "RPG",
  global: "Global",
};
