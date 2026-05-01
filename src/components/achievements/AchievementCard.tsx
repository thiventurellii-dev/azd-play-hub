import { AchievementBadge } from "./AchievementBadge";
import type { PlayerAchievement } from "@/hooks/useAchievements";
import {
  rarityTintStyle,
  RARITY_HEX,
  RARITY_LABEL_SHORT,
  resolveDescription,
} from "@/lib/achievementUi";
import { cn } from "@/lib/utils";

interface Props {
  achievement: PlayerAchievement;
  scopeName?: string; // nome do jogo já resolvido
  variant?: "card" | "chip";
  className?: string;
}

export const AchievementCard = ({
  achievement: a,
  scopeName,
  variant = "card",
  className,
}: Props) => {
  const scopeLabel =
    a.template.scope_type === "global"
      ? "Global"
      : a.template.scope_type === "season"
        ? "Season"
        : scopeName ?? "—";

  const description = resolveDescription(a.template.description_template, {
    threshold: a.template.threshold,
    gameName: scopeName,
  });

  if (variant === "chip") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border pl-2 pr-3 py-1.5 max-w-full",
          className,
        )}
        style={rarityTintStyle(a.template.rarity)}
        title={`${a.template.name} · ${scopeLabel}${description ? ` — ${description}` : ""}`}
      >
        <AchievementBadge
          category={a.template.category}
          rarity={a.template.rarity}
          level={a.template.progression_level ?? undefined}
          size="small"
          name={a.template.name}
          description={description}
          communityPct={a.community_percentage}
        />
        <span className="text-xs font-medium leading-none truncate">
          {a.template.name}
          <span className="text-muted-foreground"> · {scopeLabel}</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-2 p-4 rounded-lg border",
        className,
      )}
      style={rarityTintStyle(a.template.rarity)}
    >
      <AchievementBadge
        category={a.template.category}
        rarity={a.template.rarity}
        level={a.template.progression_level ?? undefined}
        size="large"
        name={a.template.name}
        description={description}
        communityPct={a.community_percentage}
      />
      <p className="text-sm font-semibold leading-tight">{a.template.name}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{scopeLabel}</p>
      <span
        className="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
        style={{
          color: RARITY_HEX[a.template.rarity],
          borderColor: RARITY_HEX[a.template.rarity] + "55",
        }}
      >
        {RARITY_LABEL_SHORT[a.template.rarity]}
      </span>
    </div>
  );
};

export default AchievementCard;
