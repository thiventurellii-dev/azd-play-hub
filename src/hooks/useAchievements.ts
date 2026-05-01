import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseExternal";
import type {
  AchievementCategory,
  AchievementRarity,
} from "@/components/achievements/AchievementBadge";

export type AchievementType = "automatic" | "manual_claim" | "admin_only" | "event_only";
export type AchievementScopeType =
  | "global" | "game" | "season" | "event" | "player_pair" | "group" | "ranking";

export interface AchievementTemplate {
  id: string;
  code: string;
  name: string;
  description_template: string | null;
  category: AchievementCategory;
  type: AchievementType;
  trigger_type: string | null;
  trigger_config: any;
  scope_type: AchievementScopeType;
  threshold: number | null;
  rarity: AchievementRarity;
  progression_group: string | null;
  progression_level: number | null;
  replaces_previous: boolean;
  is_active: boolean;
  requires_match: boolean;
}

export interface PlayerAchievement {
  id: string;
  player_profile_id: string;
  achievement_template_id: string;
  scope_type: AchievementScopeType;
  scope_id: string | null;
  match_id: string | null;
  status: string;
  unlocked_at: string | null;
  metadata: any;
  template: AchievementTemplate;
  community_percentage?: number;
}

export interface CommunityStat {
  achievement_template_id: string;
  scope_type: AchievementScopeType;
  scope_id: string | null;
  unlocked_count: number;
  total_eligible_players: number;
  community_percentage: number;
}

const statKey = (tplId: string, scope: string, scopeId: string | null) =>
  `${tplId}::${scope}::${scopeId ?? "_"}`;

// ---------------------------------------------------------------
// Templates (catalog)
// ---------------------------------------------------------------
export const useAchievementTemplates = () =>
  useQuery({
    queryKey: ["achievement-templates"],
    queryFn: async (): Promise<AchievementTemplate[]> => {
      const { data, error } = await supabase
        .from("achievement_templates" as any)
        .select("*")
        .order("category")
        .order("progression_group")
        .order("progression_level");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

// ---------------------------------------------------------------
// Player achievements (with template + community %)
// ---------------------------------------------------------------
export const usePlayerAchievements = (profileId?: string) =>
  useQuery({
    queryKey: ["player-achievements", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_achievements" as any)
        .select("*, template:achievement_templates(*)")
        .eq("player_profile_id", profileId!)
        .eq("status", "approved")
        .order("unlocked_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const tplIds = Array.from(new Set(rows.map((r) => r.achievement_template_id)));
      let stats: CommunityStat[] = [];
      if (tplIds.length > 0) {
        const { data: s } = await supabase
          .from("achievement_community_stats" as any)
          .select("*")
          .in("achievement_template_id", tplIds);
        stats = (s ?? []) as any[];
      }
      const sMap = new Map<string, CommunityStat>();
      for (const st of stats) sMap.set(statKey(st.achievement_template_id, st.scope_type, st.scope_id), st);
      const all: PlayerAchievement[] = rows.map((r) => ({
        ...r,
        template: r.template,
        community_percentage:
          sMap.get(statKey(r.achievement_template_id, r.scope_type, r.scope_id))?.community_percentage,
      }));

      // Apply replaces_previous: keep only highest progression_level per (group + scope_id)
      const byGroup = new Map<string, PlayerAchievement>();
      const standalone: PlayerAchievement[] = [];
      for (const a of all) {
        if (!a.template.progression_group || !a.template.replaces_previous) {
          standalone.push(a);
          continue;
        }
        const key = `${a.template.progression_group}::${a.scope_id ?? "_"}`;
        const cur = byGroup.get(key);
        if (!cur || (a.template.progression_level ?? 0) > (cur.template.progression_level ?? 0)) {
          byGroup.set(key, a);
        }
      }
      const visible = [...standalone, ...byGroup.values()].sort((a, b) =>
        (b.unlocked_at ?? "").localeCompare(a.unlocked_at ?? ""),
      );
      return { all, visible };
    },
  });

// ---------------------------------------------------------------
// Game achievements (templates for a game + unlock counts)
// ---------------------------------------------------------------
export interface GameAchievementSummary {
  template: AchievementTemplate;
  unlockedCount: number;
  communityPct: number;
}

export const useGameAchievements = (gameId?: string) =>
  useQuery({
    queryKey: ["game-achievements", gameId],
    enabled: !!gameId,
    queryFn: async () => {
      const { data: templates, error } = await supabase
        .from("achievement_templates" as any)
        .select("*")
        .eq("scope_type", "game")
        .eq("is_active", true);
      if (error) throw error;
      const tpls = (templates ?? []) as any[] as AchievementTemplate[];
      if (tpls.length === 0) return { summaries: [], topUnlockers: [] };

      const tplIds = tpls.map((t) => t.id);
      const { data: stats } = await supabase
        .from("achievement_community_stats" as any)
        .select("*")
        .in("achievement_template_id", tplIds)
        .eq("scope_type", "game")
        .eq("scope_id", gameId!);
      const sMap = new Map<string, CommunityStat>();
      for (const s of (stats ?? []) as any[]) sMap.set(s.achievement_template_id, s);

      const summaries: GameAchievementSummary[] = tpls.map((t) => {
        const st = sMap.get(t.id);
        return {
          template: t,
          unlockedCount: st?.unlocked_count ?? 0,
          communityPct: st?.community_percentage ?? 0,
        };
      });

      // Top unlockers: who has most unlocked achievements for this game (any of these templates)
      const { data: unlocks } = await supabase
        .from("player_achievements" as any)
        .select("player_profile_id")
        .eq("scope_type", "game")
        .eq("scope_id", gameId!)
        .eq("status", "approved")
        .in("achievement_template_id", tplIds);
      const counter = new Map<string, number>();
      for (const u of (unlocks ?? []) as any[]) {
        counter.set(u.player_profile_id, (counter.get(u.player_profile_id) ?? 0) + 1);
      }
      const topIds = [...counter.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, n]) => ({ id, count: n }));
      let topUnlockers: { id: string; count: number; nickname: string; avatar_url: string | null }[] = [];
      if (topIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nickname, avatar_url")
          .in("id", topIds.map((t) => t.id));
        const pMap = new Map<string, any>();
        for (const p of (profs ?? []) as any[]) pMap.set(p.id, p);
        topUnlockers = topIds.map((t) => ({
          ...t,
          nickname: pMap.get(t.id)?.nickname ?? "—",
          avatar_url: pMap.get(t.id)?.avatar_url ?? null,
        }));
      }

      return { summaries, topUnlockers };
    },
  });
