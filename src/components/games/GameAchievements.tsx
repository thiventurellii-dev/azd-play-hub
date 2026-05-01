import { Link } from "react-router-dom";
import { useGameDetail } from "@/hooks/useGameDetail";
// no need for game lookup, we receive game id+name via props

import { useGameAchievements } from "@/hooks/useAchievements";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import type { AchievementTemplate, GameAchievementSummary } from "@/hooks/useAchievements";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  gameId: string;
  gameName: string;
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

const ProgressionRow = ({
  group,
  items,
}: {
  group: string;
  items: GameAchievementSummary[];
}) => {
  const sorted = [...items].sort(
    (a, b) => (a.template.progression_level ?? 0) - (b.template.progression_level ?? 0),
  );
  const groupName = sorted[0]?.template.name?.replace(/\s+\w+$/, "") || group;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {sorted[0]?.template.category === "competitive" ? "Vitórias" : "Participação"} · {groupName}
      </p>
      <div className="flex flex-wrap gap-4 items-end">
        {sorted.map((s) => {
          const locked = s.unlockedCount === 0;
          return (
            <div key={s.template.id} className="flex flex-col items-center gap-1 w-20">
              <AchievementBadge
                category={s.template.category}
                rarity={s.template.rarity}
                level={s.template.progression_level ?? undefined}
                size="medium"
                locked={locked}
                name={s.template.name}
                communityPct={s.communityPct}
              />
              <p className="text-[10px] text-center text-foreground/80 leading-tight">
                {s.template.name}
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {locked ? "ninguém ainda" : `${s.unlockedCount} jogador${s.unlockedCount > 1 ? "es" : ""}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
    <section className="rounded-xl border border-border bg-card p-5 space-y-5">
      <header className="space-y-1">
        <h3 className="text-base font-semibold">Conquistas deste jogo</h3>
        <p className="text-xs text-muted-foreground">
          {total} possíveis · {unlockedAny} desbloqueadas pela comunidade
          {legendaryUntouched > 0 ? ` · ${legendaryUntouched} lendária${legendaryUntouched > 1 ? "s" : ""} ainda intocada${legendaryUntouched > 1 ? "s" : ""}` : ""}
        </p>
      </header>

      <div className="space-y-6">
        {[...grouped.groups.entries()].map(([g, items]) => (
          <ProgressionRow key={g} group={g} items={items} />
        ))}
        {grouped.standalone.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Únicas</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {grouped.standalone.map((s) => (
                <div key={s.template.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
                  <AchievementBadge
                    category={s.template.category}
                    rarity={s.template.rarity}
                    size="medium"
                    name={s.template.name}
                    communityPct={s.communityPct}
                    locked={s.unlockedCount === 0}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.template.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.unlockedCount === 0
                        ? "ninguém ainda"
                        : `${s.unlockedCount} desbloqueio${s.unlockedCount > 1 ? "s" : ""} · ${s.communityPct.toFixed(1)}%`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {data.topUnlockers.length > 0 && (
        <div className="pt-3 border-t border-border/40">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top desbloqueadores</p>
          <div className="flex flex-wrap gap-3">
            {data.topUnlockers.map((u, i) => (
              <Link
                to={`/perfil/${u.nickname}`}
                key={u.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 hover:border-gold/60 transition-colors"
              >
                <span className="text-xs text-muted-foreground tabular-nums">#{i + 1}</span>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback>{u.nickname?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-xs">{u.nickname}</span>
                <span className="text-[10px] text-muted-foreground">· {u.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default GameAchievements;
