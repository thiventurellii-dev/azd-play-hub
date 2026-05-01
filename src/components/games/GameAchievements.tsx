import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useGameAchievements } from "@/hooks/useAchievements";
import type { GameAchievementSummary } from "@/hooks/useAchievements";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { ProgressionRow } from "@/components/achievements/ProgressionRow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { rarityTintStyle, RARITY_HEX, RARITY_LABEL_SHORT, resolveDescription } from "@/lib/achievementUi";
import { cn } from "@/lib/utils";

interface Props {
  gameId: string;
  gameName: string;
}

export const GameAchievements = ({ gameId, gameName }: Props) => {
  const { data, isLoading } = useGameAchievements(gameId);

  const grouped = useMemo(() => {
    const groups = new Map<string, GameAchievementSummary[]>();
    const standalone: GameAchievementSummary[] = [];
    for (const s of data?.summaries ?? []) {
      const g = s.template.progression_group;
      if (!g) standalone.push(s);
      else {
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(s);
      }
    }
    return { groups, standalone };
  }, [data]);

  if (isLoading || !data) return null;
  if ((data.summaries ?? []).length === 0) return null;

  const total = data.summaries.length;
  const unlockedAny = data.summaries.filter((s) => s.unlockedCount > 0).length;
  const legendaryUntouched = data.summaries.filter(
    (s) => s.template.rarity === "legendary" && s.unlockedCount === 0,
  ).length;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Conquistas deste jogo</h3>
          <p className="text-xs text-muted-foreground">
            {total} possíve{total > 1 ? "is" : "l"} ·{" "}
            {unlockedAny} {unlockedAny === 1 ? "jogador já desbloqueou alguma" : "jogadores já desbloquearam alguma"}
            {legendaryUntouched > 0 && (
              <>
                {" "}·{" "}
                <span style={{ color: RARITY_HEX.legendary }}>
                  {legendaryUntouched} lendária{legendaryUntouched > 1 ? "s" : ""} ainda intocada{legendaryUntouched > 1 ? "s" : ""}
                </span>
              </>
            )}
          </p>
        </div>
      </header>

      {/* Progression rows */}
      <div className="space-y-6">
        {[...grouped.groups.entries()].map(([g, items]) => (
          <ProgressionRow key={g} group={g} items={items} gameName={gameName} />
        ))}
      </div>

      {/* Conquistas únicas */}
      {grouped.standalone.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold" />
            <p className="text-sm font-semibold text-foreground">Conquistas únicas</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {grouped.standalone.map((s) => {
              const locked = s.unlockedCount === 0;
              const description = resolveDescription(s.template.description_template, {
                threshold: s.template.threshold,
                gameName,
              });
              return (
                <div
                  key={s.template.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    locked && "opacity-60",
                  )}
                  style={
                    locked
                      ? { borderColor: "hsl(var(--border))", borderStyle: "dashed" }
                      : rarityTintStyle(s.template.rarity)
                  }
                >
                  <AchievementBadge
                    category={s.template.category}
                    rarity={s.template.rarity}
                    size="medium"
                    name={s.template.name}
                    description={description}
                    communityPct={s.communityPct}
                    locked={locked}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{s.template.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {description || RARITY_LABEL_SHORT[s.template.rarity]}
                    </p>
                    <p
                      className="text-[10px] tabular-nums mt-0.5"
                      style={{ color: locked ? "hsl(var(--muted-foreground))" : RARITY_HEX[s.template.rarity] }}
                    >
                      {locked
                        ? "ninguém ainda"
                        : `${s.unlockedCount} jogador${s.unlockedCount > 1 ? "es" : ""} · ${s.communityPct.toFixed(1)}%`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top desbloqueadores */}
      {data.topUnlockers.length > 0 && (
        <div className="pt-4 border-t border-border/40 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Top desbloqueadores</p>
          <div className="space-y-2">
            {data.topUnlockers.map((u, i) => (
              <Link
                to={`/perfil/${u.nickname}`}
                key={u.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-raised transition-colors"
              >
                <span className="text-xs text-muted-foreground tabular-nums w-4 text-center">{i + 1}</span>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{u.nickname?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm flex-1 truncate">{u.nickname}</span>
                <span className="text-xs text-gold tabular-nums">
                  {u.count} conquista{u.count > 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default GameAchievements;
