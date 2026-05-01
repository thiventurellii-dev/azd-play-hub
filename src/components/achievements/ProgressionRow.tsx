import { AchievementBadge } from "./AchievementBadge";
import type { GameAchievementSummary } from "@/hooks/useAchievements";

interface ProgressionRowProps {
  group: string;
  items: GameAchievementSummary[];
}

export const ProgressionRow = ({ group, items }: ProgressionRowProps) => {
  const sorted = [...items].sort(
    (a, b) => (a.template.progression_level ?? 0) - (b.template.progression_level ?? 0),
  );
  const first = sorted[0]?.template;
  const groupName = first?.name?.replace(/\s+\w+$/, "") || group;
  const labelByCategory: Record<string, string> = {
    competitive: "Vitórias",
    participation: "Participação",
    social: "Exploração",
    season: "Temporada",
    special: "Especial",
    contribution: "Contribuição",
  };
  const label = labelByCategory[first?.category ?? ""] ?? "Progressão";

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label} · {groupName}
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
                {locked
                  ? "ninguém ainda"
                  : `${s.unlockedCount} jogador${s.unlockedCount > 1 ? "es" : ""}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressionRow;
