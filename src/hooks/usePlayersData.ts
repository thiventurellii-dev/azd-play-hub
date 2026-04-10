import { useQuery } from "@tanstack/react-query";
import { fetchPublicProfiles, type PublicProfile } from "@/lib/profilesPublic";

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
  const profiles = await fetchPublicProfiles();
  return profiles
    .filter(p => p.status !== "disabled")
    .map(p => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname || "",
      city: p.city || "",
      state: p.state || "",
      created_at: p.created_at,
      avatar_url: p.avatar_url || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const usePlayersData = () => {
  return useQuery({
    queryKey: ["players-list"],
    queryFn: fetchPlayers,
  });
};
