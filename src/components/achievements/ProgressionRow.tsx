import { AchievementBadge } from "./AchievementBadge";
import type { GameAchievementSummary } from "@/hooks/useAchievements";
import { rarityTintStyle, RARITY_HEX, resolveDescription } from "@/lib/achievementUi";
import { cn } from "@/lib/utils";

interface ProgressionRowProps {
  group: string;
  items: GameAchievementSummary[];
  gameName: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  competitive: "Progressão de vitórias",
  participation: "Progressão de participação",
  social: "Progressão de exploração",
  season: "Progressão de temporada",
  special: "Progressão especial",
  contribution: "Progressão de contribuição",
};

const CATEGORY_DOT: Record<string, string> = {
  participation: "bg-rarity-uncommon",
  competitive: "bg-rarity-epic",
  social: "bg-rarity-rare",
  season: "bg-rarity-legendary",
  special: "bg-gold",
  contribution: "bg-rarity-mesa",
};

export const ProgressionRow = ({ group, items, gameName }: ProgressionRowProps) => {
  const sorted = [...items].sort(
    (a, b) => (a.template.progression_level ?? 0) - (b.template.progression_level ?? 0),
  );
  const first = sorted[0]?.template;
  const groupLabel = CATEGORY_LABEL[first?.category ?? ""] ?? "Progressão";

  // Conta jogadores únicos no grupo (estimativa = max unlockedCount entre níveis)
  const inProgress = Math.max(...sorted.map((s) => s.unlockedCount), 0);

  // Próximo nível ainda não conquistado por ninguém — para hint "X partidas pra desbloquear Y"
  const nextLocked = sorted.find((s) => s.unlockedCount === 0);
  const hint = nextLocked
    ? `${nextLocked.template.threshold ?? "?"} ${
        first?.category === "competitive" ? "vitórias" : "partidas"
      } pra desbloquear "${nextLocked.template.name}" — seja o primeiro`
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("h-2 w-2 rounded-full", CATEGORY_DOT[first?.category ?? ""] ?? "bg-muted")} />
        <p className="text-sm font-semibold text-foreground">{groupLabel}</p>
        {inProgress > 0 && (
          <p className="text-xs text-muted-foreground">
            {inProgress} jogador{inProgress > 1 ? "es" : ""} no caminho
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {sorted.map((s) => {
          const locked = s.unlockedCount === 0;
          const description = resolveDescription(s.template.description_template, {
            threshold: s.template.threshold,
            gameName,
          });
          return (
            <div
              key={s.template.id}
              className={cn(
                "flex flex-col items-center text-center gap-1.5 p-3 rounded-lg border transition-colors",
                locked && "opacity-60",
              )}
              style={
                locked
                  ? { borderColor: "hsl(var(--border))", borderStyle: "dashed", backgroundColor: "transparent" }
                  : rarityTintStyle(s.template.rarity)
              }
            >
              <AchievementBadge
                category={s.template.category}
                rarity={s.template.rarity}
                level={s.template.progression_level ?? undefined}
                size="medium"
                locked={locked}
                name={s.template.name}
                description={description}
                communityPct={s.communityPct}
              />
              <p className="text-xs font-medium leading-tight line-clamp-2">{s.template.name}</p>
              <p
                className="text-[10px] tabular-nums leading-none"
                style={{ color: locked ? "hsl(var(--muted-foreground))" : RARITY_HEX[s.template.rarity] }}
              >
                {locked
                  ? "ninguém"
                  : `${s.unlockedCount} jogador${s.unlockedCount > 1 ? "es" : ""}`}
              </p>
            </div>
          );
        })}
      </div>

      {hint && (
        <p className="text-[11px] text-muted-foreground italic text-center">{hint}</p>
      )}
    </div>
  );
};

export default ProgressionRow;
