import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";

/**
 * Curva de XP:
 * Para subir do nível L para L+1 → custa (floor((L-1)/10)+1) * 100 XP
 * Níveis 1-10: 100/nível | 11-20: 200/nível | 21-30: 300/nível ...
 */
export const xpToNextLevel = (level: number): number =>
  (Math.floor((level - 1) / 10) + 1) * 100;

export const totalXpForLevel = (level: number): number => {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNextLevel(l);
  return total;
};

export interface XpProgress {
  totalXp: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  pct: number;
}

export const computeProgress = (totalXp: number, level: number): XpProgress => {
  const baseXp = totalXpForLevel(level);
  const xpForNext = xpToNextLevel(level);
  const xpInLevel = Math.max(0, totalXp - baseXp);
  return {
    totalXp,
    level,
    xpInLevel,
    xpForNext,
    pct: Math.min(100, (xpInLevel / xpForNext) * 100),
  };
};

export interface UserXpRow {
  user_id: string;
  total_xp: number;
  level: number;
  updated_at: string;
}

export const useUserXp = (userId?: string) =>
  useQuery({
    queryKey: ["user-xp", userId],
    enabled: !!userId,
    queryFn: async (): Promise<XpProgress> => {
      const { data } = await supabase
        .from("user_xp" as any)
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      const row: any = data;
      const totalXp = row?.total_xp ?? 0;
      const level = row?.level ?? 1;
      return computeProgress(totalXp, level);
    },
  });

export interface XpEvent {
  id: string;
  amount: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
}

export const useXpEvents = (userId?: string, limit = 20) =>
  useQuery({
    queryKey: ["xp-events", userId, limit],
    enabled: !!userId,
    queryFn: async (): Promise<XpEvent[]> => {
      const { data } = await supabase
        .from("xp_events" as any)
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []) as any[];
    },
  });

export const xpReasonLabels: Record<string, string> = {
  match_played: "Partida jogada",
  match_win: "Vitória em partida",
  room_created: "Sala criada",
  room_joined: "Entrou em sala",
  community_joined: "Entrou em comunidade",
  topic_created: "Tópico criado",
  comment_created: "Comentário",
  achievement: "Conquista desbloqueada",
  profile_completed: "Perfil completo",
  game_cataloged: "Jogo catalogado",
  script_cataloged: "Script catalogado",
};
