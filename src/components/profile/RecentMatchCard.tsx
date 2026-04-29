import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Trophy, Skull, Minus } from "lucide-react";
import DateBlock from "@/components/shared/DateBlock";

export interface RecentMatchItem {
  match_id: string;
  game_name: string;
  game_slug: string | null;
  played_at: string;
  is_competitive: boolean;
  position: number | null;
  score: number | null;
  mmr_change: number | null;
  opponents: { name: string; avatar_url: string | null }[];
}

const resultMeta = (m: RecentMatchItem) => {
  // Competitivo: verde se ganhou MMR, vermelho se perdeu
  if (m.is_competitive) {
    const delta = Number(m.mmr_change || 0);
    if (delta > 0) {
      return {
        wrap: "border-green-500/40 bg-green-500/5 hover:bg-green-500/10",
        accent: "text-green-400",
        badge: "bg-green-500/15 text-green-400 border-green-500/30",
        label: "Vitória",
        icon: Trophy,
      };
    }
    return {
      wrap: "border-red-500/40 bg-red-500/5 hover:bg-red-500/10",
      accent: "text-red-400",
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
      label: "Derrota",
      icon: Skull,
    };
  }
  // Casual: amarelo se venceu, cinza se não
  if (m.position === 1) {
    return {
      wrap: "border-gold/40 bg-gold/5 hover:bg-gold/10",
      accent: "text-gold",
      badge: "bg-gold/15 text-gold border-gold/30",
      label: "Vitória casual",
      icon: Trophy,
    };
  }
  return {
    wrap: "border-border bg-muted/20 hover:bg-muted/30",
    accent: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
    label: "Casual",
    icon: Minus,
  };
};

const RecentMatchCard = ({ m }: { m: RecentMatchItem }) => {
  const meta = resultMeta(m);
  const Icon = meta.icon;
  const delta = Number(m.mmr_change || 0);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        meta.wrap,
      )}
    >
      <DateBlock date={m.played_at} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {m.game_slug ? (
            <Link
              to={`/jogos/${m.game_slug}`}
              className="font-semibold text-sm hover:text-gold transition-colors truncate"
            >
              {m.game_name}
            </Link>
          ) : (
            <span className="font-semibold text-sm truncate">{m.game_name}</span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              meta.badge,
            )}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          {!m.is_competitive && (
            <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
              Casual
            </span>
          )}
        </div>
        {m.opponents.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[11px] text-muted-foreground">vs</span>
            <div className="flex -space-x-1.5">
              {m.opponents.slice(0, 5).map((o, i) =>
                o.avatar_url ? (
                  <img
                    key={i}
                    src={o.avatar_url}
                    alt={o.name}
                    title={o.name}
                    className="h-5 w-5 rounded-full border border-background object-cover"
                  />
                ) : (
                  <div
                    key={i}
                    title={o.name}
                    className="h-5 w-5 rounded-full bg-secondary border border-background flex items-center justify-center text-[9px] font-semibold text-gold"
                  >
                    {o.name.charAt(0).toUpperCase()}
                  </div>
                ),
              )}
            </div>
            {m.opponents.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{m.opponents.length - 5}</span>
            )}
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        {m.score !== null && (
          <div className="text-sm font-bold tabular-nums">{m.score}</div>
        )}
        {m.is_competitive && m.mmr_change !== null && (
          <div className={cn("text-[11px] font-semibold tabular-nums", meta.accent)}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(2)} MMR
          </div>
        )}
        {m.position && (
          <div className="text-[10px] text-muted-foreground">{m.position}º lugar</div>
        )}
      </div>
    </div>
  );
};

export default RecentMatchCard;
