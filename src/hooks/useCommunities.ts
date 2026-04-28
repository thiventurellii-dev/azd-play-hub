import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";

export interface CommunityListItem {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  country: string;
  language: string;
  visibility: "public" | "private" | "invite_only";
  join_policy: "open" | "approval" | "invite_only";
  community_type: "boardgame" | "botc" | "rpg" | "mixed";
  created_at: string;
  members_count: number;
  matches_count: number;
  tournaments_count: number;
  tags: string[];
  game_ids: string[];
}

export interface GlobalStats {
  communities: number;
  members: number;
  matches: number;
  tournaments: number;
}

export const useCommunities = () =>
  useQuery({
    queryKey: ["communities-list"],
    queryFn: async (): Promise<CommunityListItem[]> => {
      const { data: communities, error } = await supabase
        .from("communities" as any)
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (communities ?? []).map((c: any) => c.id);
      if (ids.length === 0) return [];

      const [statsRes, tagsRes, gamesRes] = await Promise.all([
        supabase.from("community_stats" as any).select("*").in("community_id", ids),
        supabase
          .from("community_tag_links" as any)
          .select("community_id, community_tags(name)")
          .in("community_id", ids),
        supabase
          .from("community_games" as any)
          .select("community_id, game_id")
          .in("community_id", ids),
      ]);

      const statsMap = new Map<string, any>();
      (statsRes.data ?? []).forEach((s: any) => statsMap.set(s.community_id, s));

      const tagsMap = new Map<string, string[]>();
      (tagsRes.data ?? []).forEach((t: any) => {
        const arr = tagsMap.get(t.community_id) ?? [];
        if (t.community_tags?.name) arr.push(t.community_tags.name);
        tagsMap.set(t.community_id, arr);
      });

      const gamesMap = new Map<string, string[]>();
      (gamesRes.data ?? []).forEach((g: any) => {
        const arr = gamesMap.get(g.community_id) ?? [];
        arr.push(g.game_id);
        gamesMap.set(g.community_id, arr);
      });

      return (communities ?? []).map((c: any) => {
        const s = statsMap.get(c.id) ?? {};
        return {
          ...c,
          members_count: Number(s.members_count ?? 0),
          matches_count: Number(s.matches_count ?? 0),
          tournaments_count: Number(s.tournaments_count ?? 0),
          tags: tagsMap.get(c.id) ?? [],
          game_ids: gamesMap.get(c.id) ?? [],
        } as CommunityListItem;
      });
    },
  });

export const useGlobalCommunityStats = () =>
  useQuery({
    queryKey: ["communities-global-stats"],
    queryFn: async (): Promise<GlobalStats> => {
      const sb: any = supabase;
      const [c, m, mt, bm, t] = await Promise.all([
        sb.from("communities").select("id", { count: "exact", head: true }),
        sb.from("community_members").select("id", { count: "exact", head: true }).eq("status", "active"),
        sb.from("matches").select("id", { count: "exact", head: true }).not("community_id", "is", null),
        sb.from("blood_matches").select("id", { count: "exact", head: true }).not("community_id", "is", null),
        sb.from("seasons").select("id", { count: "exact", head: true }).not("community_id", "is", null),
      ]);
      return {
        communities: c.count ?? 0,
        members: m.count ?? 0,
        matches: (mt.count ?? 0) + (bm.count ?? 0),
        tournaments: t.count ?? 0,
      };
    },
  });
