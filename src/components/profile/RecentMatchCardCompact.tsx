import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Trophy, Skull, Minus } from "lucide-react";
import type { RecentMatchItem } from "./RecentMatchCard";

type Meta = {
  base: string;
  tint: string;
  accent: string;
  mmr: string;
  icon: typeof Trophy;
  isWin: boolean;
  winRing: string;
};

const meta = (m: RecentMatchItem): Meta => {
  if (m.is_competitive) {
    const delta = Number(m.mmr_change || 0);
    if (delta > 0) {
      return {
        base: "border-border/60",
        tint: "bg-[hsl(150_40%_10%/0.35)]",
        accent: "text-foreground/85",
        mmr: "text-emerald-200/90",
        icon: Trophy,
        isWin: true,
        winRing: "ring-1 ring-gold/25 border-gold/30",
      };
    }
    return {
      base: "border-border/50",
      tint: "bg-[hsl(355_30%_8%/0.4)]",
      accent: "text-muted-foreground",
      mmr: "text-red-300/75",
      icon: Skull,
      isWin: false,
      winRing: "",
    };
  }
  if (m.position === 1) {
    return {
      base: "border-border/60",
      tint: "bg-[hsl(45_30%_9%/0.3)]",
      accent: "text-foreground/85",
      mmr: "text-yellow-100/85",
      icon: Trophy,
      isWin: true,
      winRing: "ring-1 ring-gold/25 border-gold/30",
    };
  }
  return {
    base: "border-border/50",
    tint: "bg-[hsl(220_8%_8%/0.5)]",
    accent: "text-muted-foreground",
    mmr: "text-foreground/70",
    icon: Minus,
    isWin: false,
    winRing: "",
  };
};

const RecentMatchCardCompact = ({ m }: { m: RecentMatchItem }) => {
  const meta_ = meta(m);
  const Icon = meta_.icon;
  const delta = Number(m.mmr_change || 0);
  const date = new Date(m.played_at).toLocaleDateString("pt-BR");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 min-h-[180px] flex flex-col bg-card",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/25",
        meta_.base,
        meta_.tint,
        meta_.winRing,
      )}
    >
      {meta_.isWin && (
        <div className="pointer-events-none absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-gold/60 via-gold/20 to-transparent" />
      )}

      <div className="relative flex items-center justify-between mb-3">
        <Icon className={cn("h-4 w-4", meta_.isWin ? "text-gold/80" : meta_.accent)} />
        {m.is_competitive && m.mmr_change !== null && (
          <span className={cn("text-[12px] font-bold tabular-nums tracking-tight", meta_.mmr)}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} MMR
          </span>
        )}
      </div>

      <div className="relative flex-1">
        {m.game_slug ? (
          <Link
            to={`/jogos/${m.game_slug}`}
            className="font-bold text-sm leading-snug text-foreground/95 hover:text-gold transition-colors line-clamp-2 block"
          >
            {m.game_name}
          </Link>
        ) : (
          <span className="font-bold text-sm leading-snug text-foreground/95 line-clamp-2 block">
            {m.game_name}
          </span>
        )}
        <div className="text-[11px] text-muted-foreground/80 mt-1 tabular-nums">{date}</div>

        {m.score !== null && (
          <div className="flex items-center gap-1.5 mt-2 text-sm font-bold tabular-nums">
            <span className={meta_.accent}>
              {m.score} <span className="text-[10px] font-normal text-muted-foreground">pts.</span>
            </span>
            {m.position && (
              <span className="text-[10px] text-muted-foreground font-normal ml-auto">
                {m.position}º lugar
              </span>
            )}
          </div>
        )}
      </div>

      {m.opponents.length > 0 && (
        <div className="relative flex items-center gap-2 mt-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
            vs
          </span>
          <div className="flex -space-x-1.5">
            {m.opponents.slice(0, 5).map((o, i) =>
              o.avatar_url ? (
                <img
                  key={i}
                  src={o.avatar_url}
                  alt={o.name}
                  title={o.name}
                  className="h-6 w-6 rounded-full border-2 border-background object-cover"
                />
              ) : (
                <div
                  key={i}
                  title={o.name}
                  className="h-6 w-6 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[9px] font-semibold text-gold"
                >
                  {o.name.charAt(0).toUpperCase()}
                </div>
              ),
            )}
            {m.opponents.length > 5 && (
              <div className="h-6 w-6 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                +{m.opponents.length - 5}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentMatchCardCompact;
