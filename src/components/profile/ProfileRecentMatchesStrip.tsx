import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { RecentMatchItem } from "@/components/profile/RecentMatchCard";

interface Props {
  matches: RecentMatchItem[];
  ownerNickname?: string;
}

export const ProfileRecentMatchesStrip = ({ matches, ownerNickname }: Props) => {
  if (matches.length === 0) return null;
  const visible = matches.slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Partidas recentes</h2>
        {ownerNickname && (
          <Link
            to="/games"
            className="text-xs text-muted-foreground hover:text-gold transition-colors"
          >
            Ver todas →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {visible.map((m) => {
          const delta = Number(m.mmr_change || 0);
          const isWin = m.position === 1;
          const isPodium = m.position != null && m.position <= 3;
          const accent = isWin
            ? "border-domain-positive/40"
            : delta < 0
            ? "border-domain-botc/30"
            : "border-border";
          const date = new Date(m.played_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });
          const positionColor = isWin
            ? "text-domain-positive"
            : isPodium
            ? "text-gold"
            : "text-muted-foreground";
          return (
            <Link
              key={m.match_id}
              to={m.game_slug ? `/jogos/${m.game_slug}` : "#"}
              className={cn(
                "group rounded-lg border bg-background/40 p-2.5 hover:border-foreground/20 transition-colors",
                accent,
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className={cn("text-sm font-bold tabular-nums", positionColor)}>
                  {m.position != null ? `${m.position}º` : "—"}
                </span>
                {m.is_competitive && delta !== 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold tabular-nums",
                      delta > 0 ? "text-domain-positive" : "text-domain-botc",
                    )}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(0)}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium mt-1 line-clamp-1 text-foreground/90">
                {m.game_name}
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{date}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileRecentMatchesStrip;
