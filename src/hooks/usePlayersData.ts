import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";

export interface Player {
  id: string;
  name: string;
  nickname: string;
  city: string;
  state: string;
  created_at: string;
  avatar_url: string | null;
}

const fetchPlayers = async (): Promise<Player[]> => {
  const { data } = await supabase.from("profiles").select("id, name, nickname, city, state, created_at, avatar_url, status").neq("status", "disabled").order("name");
  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    nickname: p.nickname || "",
    city: p.city || "",
    state: p.state || "",
    created_at: p.created_at,
    avatar_url: (p as any).avatar_url || null,
  }));
};

export const usePlayersData = () => {
  return useQuery({
    queryKey: ["players-list"],
    queryFn: fetchPlayers,
  });
};
