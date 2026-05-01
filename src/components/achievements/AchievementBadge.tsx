import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AchievementCategory =
  | "participation"
  | "competitive"
  | "social"
  | "season"
  | "special"
  | "contribution";

export type AchievementRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mesa";

export type AchievementSize = "mini" | "small" | "medium" | "large";

interface Props {
  category: AchievementCategory;
  rarity: AchievementRarity;
  level?: number;
  size?: AchievementSize;
  showLevel?: boolean;
  locked?: boolean;
  communityPct?: number;
  name?: string;
  /** Texto descritivo já interpolado (ex: "Venceu 5 partidas de Catan."). */
  description?: string;
  className?: string;
}

const SIZE_PX: Record<AchievementSize, number> = {
  mini: 18,
  small: 24,
  medium: 36,
  large: 56,
};

const RARITY_LABEL: Record<AchievementRarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Rara",
  epic: "Épica",
  legendary: "Lendária",
  mesa: "Validada pela Mesa",
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const ShapePath = ({ category }: { category: AchievementCategory }) => {
  switch (category) {
    case "participation":
      return <circle cx="50" cy="50" r="42" />;
    case "competitive":
      return <polygon points="50,8 88,28 88,72 50,92 12,72 12,28" />;
    case "social":
      return <polygon points="50,8 92,50 50,92 8,50" />;
    case "season":
      return <path d="M50 8 L88 18 L88 56 Q88 84 50 92 Q12 84 12 56 L12 18 Z" />;
    case "special":
      return (
        <polygon points="50,8 60,38 92,38 67,58 77,90 50,72 23,90 33,58 8,38 40,38" />
      );
    case "contribution":
      return <polygon points="50,12 90,82 10,82" />;
  }
};

export const AchievementBadge = ({
  category,
  rarity,
  level,
  size = "medium",
  showLevel = true,
  locked = false,
  communityPct,
  name,
  className,
}: Props) => {
  const px = SIZE_PX[size];
  const isLegendary = rarity === "legendary";
  const isMesa = rarity === "mesa";
  const isGoldFill = isLegendary;
  const fillColor = isLegendary
    ? `url(#grad-legendary-${level ?? "x"})`
    : `hsl(var(--rarity-${rarity}))`;
  const strokeColor = `hsl(var(--rarity-${rarity}))`;
  const inscriptionColor = isGoldFill ? "#1a1305" : "#FFFFFF";
  const fontSize = px * 0.36;

  const inscription = level ? ROMAN[level] ?? String(level) : "";

  const svg = (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      className={cn(
        "flex-shrink-0",
        isLegendary && "drop-shadow-[0_0_6px_rgba(201,169,97,0.45)]",
        locked && "opacity-40",
        className
      )}
      aria-label={name ? `${name} (${RARITY_LABEL[rarity]})` : RARITY_LABEL[rarity]}
    >
      {isLegendary && (
        <defs>
          <linearGradient id={`grad-legendary-${level ?? "x"}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--rarity-legendary))" />
            <stop offset="100%" stopColor="hsl(var(--rarity-legendary-end))" />
          </linearGradient>
        </defs>
      )}
      <g
        fill={locked ? "transparent" : fillColor}
        stroke={strokeColor}
        strokeWidth={locked ? 2 : 2}
        strokeDasharray={locked ? "4 3" : undefined}
      >
        <ShapePath category={category} />
      </g>
      {isMesa && !locked && (
        <g fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.7}>
          {/* inner double border */}
          <g transform="translate(50 50) scale(0.78) translate(-50 -50)">
            <ShapePath category={category} />
          </g>
        </g>
      )}
      {showLevel && inscription && size !== "mini" && (
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="ui-serif, Georgia, 'Times New Roman', serif"
          fontWeight={600}
          fontSize={100 * 0.33}
          fill={inscriptionColor}
        >
          {inscription}
        </text>
      )}
    </svg>
  );

  if (size === "mini" || !name) return svg;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{svg}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold">{name}</p>
            <p className="text-[10px] text-muted-foreground">
              {RARITY_LABEL[rarity]}
              {level ? ` · Nível ${ROMAN[level] ?? level}` : ""}
            </p>
            {typeof communityPct === "number" && (
              <p className="text-[10px] text-muted-foreground">
                Conquistada por {communityPct.toFixed(1)}% da comunidade
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AchievementBadge;
