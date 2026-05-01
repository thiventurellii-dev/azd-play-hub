import { useMemo } from "react";
import { usePlayerAchievements, type PlayerAchievement } from "@/hooks/useAchievements";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";

interface Props {
  profileId: string;
  isOwnProfile?: boolean;
}

const RARITY_ORDER: Record<string, number> = {
  legendary: 5, epic: 4, mesa: 3, rare: 2, uncommon: 1, common: 0,
};

export const ProfileAchievements = ({ profileId }: Props) => {
  const { data, isLoading } = usePlayerAchievements(profileId);

  const visible = data?.visible ?? [];

  const counters = useMemo(() => {
    const c = { total: 0, games: new Set<string>(), rare: 0, mesa: 0, legendary: 0 };
    for (const a of visible) {
      c.total++;
      if (a.template.scope_type === "game" && a.scope_id) c.games.add(a.scope_id);
      if (a.template.rarity === "rare") c.rare++;
      if (a.template.rarity === "mesa") c.mesa++;
      if (a.template.rarity === "legendary") c.legendary++;
    }
    return c;
  }, [visible]);

  const showcase = useMemo<PlayerAchievement[]>(() => {
    return [...visible]
      .sort((a, b) => {
        const r = (RARITY_ORDER[b.template.rarity] ?? 0) - (RARITY_ORDER[a.template.rarity] ?? 0);
        if (r !== 0) return r;
        return (b.unlocked_at ?? "").localeCompare(a.unlocked_at ?? "");
      })
      .slice(0, 4);
  }, [visible]);

  if (isLoading) return null;
  if (visible.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Conquistas</h3>
          <p className="text-xs text-muted-foreground">
            {counters.total} desbloqueada{counters.total > 1 ? "s" : ""}
            {counters.games.size > 0 ? ` · ${counters.games.size} jogo${counters.games.size > 1 ? "s" : ""}` : ""}
            {counters.rare > 0 ? ` · ${counters.rare} rara${counters.rare > 1 ? "s" : ""}` : ""}
            {counters.mesa > 0 ? ` · ${counters.mesa} mesa` : ""}
            {counters.legendary > 0 ? ` · ${counters.legendary} lendária${counters.legendary > 1 ? "s" : ""}` : ""}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {showcase.map((a) => (
          <div
            key={a.id}
            className="flex flex-col items-center text-center gap-2 p-4 rounded-lg border border-border/60 bg-background/40"
          >
            <AchievementBadge
              category={a.template.category}
              rarity={a.template.rarity}
              level={a.template.progression_level ?? undefined}
              size="large"
              name={a.template.name}
              communityPct={a.community_percentage}
            />
            <p className="text-sm font-serif italic leading-tight">{a.template.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {a.template.rarity}
            </p>
            {typeof a.community_percentage === "number" && (
              <p className="text-[10px] text-muted-foreground">
                {a.community_percentage.toFixed(1)}% da comunidade
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProfileAchievements;
