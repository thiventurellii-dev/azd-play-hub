import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Trophy, Skull, Minus } from "lucide-react";
import type { RecentMatchItem } from "./RecentMatchCard";

const meta = (m: RecentMatchItem) => {
  if (m.is_competitive) {
    const delta = Number(m.mmr_change || 0);
    if (delta > 0)
      return {
        wrap: "border-green-500/40 bg-gradient-to-b from-green-500/10 to-green-500/[0.02] hover:border-green-500/60",
        badge: "bg-green-500/15 text-green-400 border-green-500/40",
        accent: "text-green-400",
        label: "Vitória",
        icon: Trophy,
      };
    return {
      wrap: "border-red-500/40 bg-gradient-to-b from-red-500/10 to-red-500/[0.02] hover:border-red-500/60",
      badge: "bg-red-500/15 text-red-400 border-red-500/40",
      accent: "text-red-400",
      label: "Derrota",
      icon: Skull,
    };
  }
  if (m.position === 1)
    return {
      wrap: "border-gold/40 bg-gradient-to-b from-gold/10 to-gold/[0.02] hover:border-gold/60",
      badge: "bg-gold/15 text-gold border-gold/40",
      accent: "text-gold",
      label: "Vitória",
      icon: Trophy,
    };
  return {
    wrap: "border-border bg-gradient-to-b from-muted/30 to-transparent hover:border-muted-foreground/40",
    badge: "bg-muted text-muted-foreground border-border",
    accent: "text-muted-foreground",
    label: "Casual",
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
        "rounded-xl border p-4 transition-all min-h-[180px] flex flex-col",
        meta_.wrap,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border",
            meta_.badge,
          )}
        >
          <Icon className="h-3 w-3" />
          {meta_.label}
        </span>
        {m.is_competitive && m.mmr_change !== null && (
          <span className={cn("text-[11px] font-bold tabular-nums", meta_.accent)}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} MMR
          </span>
        )}
      </div>

      <div className="flex-1">
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

        {m.opponents.length > 0 && (
          <div className="text-[11px] text-muted-foreground mt-2 truncate">
            vs. {m.opponents.slice(0, 2).map((o) => o.name).join(", ")}
            {m.opponents.length > 2 && ` +${m.opponents.length - 2}`}
          </div>
        )}

        {m.score !== null && (
          <div className="flex items-center gap-1.5 mt-2 text-sm font-bold tabular-nums">
            <Icon className={cn("h-3.5 w-3.5", meta_.accent)} />
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
        <div className="flex -space-x-1.5 mt-3">
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
