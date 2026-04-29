import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Trophy, Skull, Minus } from "lucide-react";
import type { RecentMatchItem } from "./RecentMatchCard";

type Meta = {
  base: string;
  directional: string;
  glow: string;
  edge: string;
  innerShadow: string;
  accent: string;
  mmr: string;
  icon: typeof Trophy;
};

const meta = (m: RecentMatchItem): Meta => {
  if (m.is_competitive) {
    const delta = Number(m.mmr_change || 0);
    if (delta > 0) {
      // Vitória — esmeralda profunda, suave e recompensadora
      return {
        base: "border-emerald-950/60",
        directional:
          "bg-[linear-gradient(135deg,_hsl(158_55%_10%/0.85)_0%,_hsl(220_10%_5%)_55%,_hsl(220_12%_4%)_100%)]",
        glow: "bg-[radial-gradient(circle_at_22%_28%,_hsl(155_75%_45%/0.09),_transparent_55%)]",
        edge: "bg-gradient-to-b from-emerald-400/40 via-emerald-500/10 to-transparent",
        innerShadow:
          "shadow-[inset_0_1px_0_hsl(155_60%_55%/0.06),inset_0_-30px_60px_hsl(220_15%_3%/0.6),0_8px_24px_-12px_hsl(155_70%_20%/0.35)]",
        accent: "text-emerald-300/85",
        mmr: "text-emerald-200 drop-shadow-[0_0_8px_hsl(155_70%_45%/0.35)]",
        icon: Trophy,
      };
    }
    // Derrota — crimson silenciado
    return {
      base: "border-red-950/60",
      directional:
        "bg-[linear-gradient(135deg,_hsl(355_45%_11%/0.85)_0%,_hsl(220_10%_5%)_55%,_hsl(220_12%_4%)_100%)]",
      glow: "bg-[radial-gradient(circle_at_75%_72%,_hsl(355_60%_38%/0.09),_transparent_55%)]",
      edge: "bg-gradient-to-b from-red-400/35 via-red-500/8 to-transparent",
      innerShadow:
        "shadow-[inset_0_1px_0_hsl(355_50%_55%/0.05),inset_0_-30px_60px_hsl(220_15%_3%/0.6),0_8px_24px_-12px_hsl(355_60%_18%/0.35)]",
      accent: "text-red-300/80",
      mmr: "text-red-200 drop-shadow-[0_0_8px_hsl(355_70%_45%/0.3)]",
      icon: Skull,
    };
  }
  if (m.position === 1) {
    // Vitória casual — âmbar suave
    return {
      base: "border-yellow-950/60",
      directional:
        "bg-[linear-gradient(135deg,_hsl(45_50%_11%/0.85)_0%,_hsl(220_10%_5%)_55%,_hsl(220_12%_4%)_100%)]",
      glow: "bg-[radial-gradient(circle_at_22%_28%,_hsl(45_85%_50%/0.09),_transparent_55%)]",
      edge: "bg-gradient-to-b from-yellow-300/35 via-yellow-500/10 to-transparent",
      innerShadow:
        "shadow-[inset_0_1px_0_hsl(45_70%_55%/0.06),inset_0_-30px_60px_hsl(220_15%_3%/0.6),0_8px_24px_-12px_hsl(45_70%_20%/0.35)]",
      accent: "text-yellow-200/85",
      mmr: "text-yellow-100 drop-shadow-[0_0_8px_hsl(45_85%_50%/0.3)]",
      icon: Trophy,
    };
  }
  // Casual derrota — neutro dessaturado
  return {
    base: "border-border/50",
    directional:
      "bg-[linear-gradient(135deg,_hsl(220_8%_11%)_0%,_hsl(220_10%_6%)_60%,_hsl(220_12%_4%)_100%)]",
    glow: "",
    edge: "bg-gradient-to-b from-muted-foreground/10 to-transparent",
    innerShadow:
      "shadow-[inset_0_1px_0_hsl(0_0%_100%/0.03),inset_0_-30px_60px_hsl(220_15%_3%/0.6),0_6px_18px_-10px_hsl(220_15%_2%/0.5)]",
    accent: "text-muted-foreground",
    mmr: "text-foreground/80",
    icon: Minus,
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
        "group relative overflow-hidden rounded-xl border p-4 min-h-[180px] flex flex-col",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/25",
        meta_.base,
        meta_.directional,
        meta_.innerShadow,
      )}
    >
      {/* Edge accent light */}
      <div
        className={cn(
          "pointer-events-none absolute top-0 left-0 h-full w-[2px] opacity-80",
          meta_.edge,
        )}
      />
      {/* Off-center ambient glow */}
      {meta_.glow && (
        <div className={cn("pointer-events-none absolute inset-0", meta_.glow)} />
      )}
      {/* Vignette for micro-contrast (darker edges) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_55%,_hsl(220_15%_3%/0.45)_100%)]" />

      <div className="relative flex items-center justify-between mb-3">
        <Icon className={cn("h-4 w-4", meta_.accent)} />
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
            <span className={meta_.accent}>{m.score}</span>
            {m.position && (
              <span className="text-[10px] text-muted-foreground font-normal ml-auto">
                {m.position}º lugar
              </span>
            )}
          </div>
        )}
      </div>

      {m.opponents.length > 0 && (
        <div className="relative flex -space-x-1.5 mt-3">
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
      )}
    </div>
  );
};

export default RecentMatchCardCompact;
