import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Trophy, Skull, Minus } from "lucide-react";
import type { RecentMatchItem } from "./RecentMatchCard";

type Meta = {
  wrap: string;
  glow: string;
  edge: string;
  accent: string;
  icon: typeof Trophy;
};

const meta = (m: RecentMatchItem): Meta => {
  if (m.is_competitive) {
    const delta = Number(m.mmr_change || 0);
    if (delta > 0) {
      // Vitória competitiva — verde atmosférico
      return {
        wrap: "border-green-900/40 bg-[radial-gradient(ellipse_at_top_right,_hsl(150_60%_12%/0.55),_hsl(220_8%_5%)_70%)]",
        glow: "bg-[radial-gradient(circle_at_25%_30%,_hsl(150_70%_45%/0.10),_transparent_60%)]",
        edge: "bg-gradient-to-b from-green-400/30 via-green-500/10 to-transparent",
        accent: "text-green-300/90",
        icon: Trophy,
      };
    }
    // Derrota competitiva — vermelho profundo
    return {
      wrap: "border-red-900/40 bg-[radial-gradient(ellipse_at_top_right,_hsl(355_55%_14%/0.65),_hsl(220_8%_5%)_70%)]",
      glow: "bg-[radial-gradient(circle_at_70%_70%,_hsl(355_70%_40%/0.12),_transparent_65%)]",
      edge: "bg-gradient-to-b from-red-400/35 via-red-500/12 to-transparent",
      accent: "text-red-300/90",
      icon: Skull,
    };
  }
  if (m.position === 1) {
    // Vitória casual — amarelo atmosférico
    return {
      wrap: "border-yellow-900/40 bg-[radial-gradient(ellipse_at_top_right,_hsl(45_55%_12%/0.55),_hsl(220_8%_5%)_70%)]",
      glow: "bg-[radial-gradient(circle_at_25%_30%,_hsl(45_85%_50%/0.10),_transparent_60%)]",
      edge: "bg-gradient-to-b from-yellow-300/30 via-yellow-500/10 to-transparent",
      accent: "text-yellow-200/90",
      icon: Trophy,
    };
  }
  // Casual derrota — cinza dessaturado
  return {
    wrap: "border-border/60 bg-[linear-gradient(180deg,_hsl(220_6%_11%),_hsl(220_8%_6%))]",
    glow: "",
    edge: "bg-gradient-to-b from-muted-foreground/10 to-transparent",
    accent: "text-muted-foreground",
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
        "relative overflow-hidden rounded-xl border p-4 transition-all min-h-[180px] flex flex-col",
        "hover:border-foreground/20",
        meta_.wrap,
      )}
    >
      {/* Edge accent light */}
      <div
        className={cn(
          "pointer-events-none absolute top-0 left-0 h-full w-[2px] opacity-70",
          meta_.edge,
        )}
      />
      {/* Soft ambient glow */}
      {meta_.glow && (
        <div className={cn("pointer-events-none absolute inset-0", meta_.glow)} />
      )}

      <div className="relative flex items-center justify-between mb-3">
        <Icon className={cn("h-4 w-4", meta_.accent)} />
        {m.is_competitive && m.mmr_change !== null && (
          <span className={cn("text-[11px] font-bold tabular-nums", meta_.accent)}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} MMR
          </span>
        )}
      </div>

      <div className="relative flex-1">
        {m.game_slug ? (
          <Link
            to={`/jogos/${m.game_slug}`}
            className="font-bold text-sm leading-snug hover:text-gold transition-colors line-clamp-2 block"
          >
            {m.game_name}
          </Link>
        ) : (
          <span className="font-bold text-sm leading-snug line-clamp-2 block">
            {m.game_name}
          </span>
        )}
        <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">{date}</div>

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
