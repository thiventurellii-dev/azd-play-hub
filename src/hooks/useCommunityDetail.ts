import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";
import type { CommunityListItem } from "./useCommunities";

export interface CommunityMember {
  id: string;
  user_id: string;
  role: "leader" | "moderator" | "member";
  status: "active" | "pending" | "banned";
  xp: number;
  joined_at: string;
  profile?: {
    nickname: string | null;
    name: string;
    avatar_url: string | null;
  };
}

export interface CommunityFull extends CommunityListItem {
  rules: string | null;
  created_by: string;
  members: CommunityMember[];
}

export const useCommunityDetail = (slug?: string) =>
  useQuery({
    queryKey: ["community-detail", slug],
    enabled: !!slug,
    queryFn: async (): Promise<CommunityFull | null> => {
      const { data: community, error } = await supabase
        .from("communities" as any)
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (!community) return null;

      const c: any = community;

      const [statsRes, tagsRes, gamesRes, membersRes] = await Promise.all([
        supabase.from("community_stats" as any).select("*").eq("community_id", c.id).maybeSingle(),
        supabase
          .from("community_tag_links" as any)
          .select("community_tags(name)")
          .eq("community_id", c.id),
        supabase.from("community_games" as any).select("game_id").eq("community_id", c.id),
        supabase
          .from("community_members" as any)
          .select("*")
          .eq("community_id", c.id)
          .order("xp", { ascending: false }),
      ]);

      const memberRows = (membersRes.data ?? []) as any[];
      const userIds = memberRows.map((m) => m.user_id);
      const profilesMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.rpc("get_public_profiles", {
          p_ids: userIds,
        });
        (profiles ?? []).forEach((p: any) => profilesMap.set(p.id, p));
      }

      const stats: any = statsRes.data ?? {};
      return {
        ...(c as any),
        members_count: Number(stats.members_count ?? 0),
        matches_count: Number(stats.matches_count ?? 0),
        tournaments_count: Number(stats.tournaments_count ?? 0),
        tags: (tagsRes.data ?? []).map((t: any) => t.community_tags?.name).filter(Boolean),
        game_ids: (gamesRes.data ?? []).map((g: any) => g.game_id),
        members: memberRows.map((m) => ({
          ...m,
          profile: profilesMap.get(m.user_id),
        })),
      } as CommunityFull;
    },
  });

export const useCommunityRooms = (communityId?: string) =>
  useQuery({
    queryKey: ["community-rooms", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_rooms")
        .select("*, game:games(id, name, image_url, slug)")
        .eq("community_id" as any, communityId!)
        .in("status", ["open", "full", "in_progress"])
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCommunitySeasons = (communityId?: string) =>
  useQuery({
    queryKey: ["community-seasons", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("community_id" as any, communityId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
