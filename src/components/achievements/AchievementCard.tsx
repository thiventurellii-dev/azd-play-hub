import { AchievementBadge } from "./AchievementBadge";
import type { PlayerAchievement } from "@/hooks/useAchievements";
import { cn } from "@/lib/utils";

interface Props {
  achievement: PlayerAchievement;
  scopeName?: string; // nome do jogo / "Global" / etc.
  variant?: "card" | "chip";
  className?: string;
}

const RARITY_LABEL: Record<string, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Rara",
  epic: "Épica",
  legendary: "Lendária",
  mesa: "Validada · Mesa",
};

export const AchievementCard = ({
  achievement: a,
  scopeName,
  variant = "card",
  className,
}: Props) => {
  const scopeLabel =
    a.template.scope_type === "global"
      ? "Global"
      : scopeName ?? "—";

  if (variant === "chip") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 pl-2 pr-3 py-1.5 max-w-full",
          className,
        )}
        title={`${a.template.name} · ${scopeLabel}`}
      >
        <AchievementBadge
          category={a.template.category}
          rarity={a.template.rarity}
          level={a.template.progression_level ?? undefined}
          size="small"
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
        "flex flex-col items-center text-center gap-2 p-4 rounded-lg border border-border/60 bg-background/40",
        className,
      )}
    >
      <AchievementBadge
        category={a.template.category}
        rarity={a.template.rarity}
        level={a.template.progression_level ?? undefined}
        size="large"
        name={a.template.name}
        communityPct={a.community_percentage}
      />
      <p className="text-sm font-semibold leading-tight">{a.template.name}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{scopeLabel}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {RARITY_LABEL[a.template.rarity] ?? a.template.rarity}
      </p>
    </div>
  );
};

export default AchievementCard;
