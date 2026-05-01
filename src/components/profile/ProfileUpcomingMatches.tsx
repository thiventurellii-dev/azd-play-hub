import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UpcomingRoom } from "@/hooks/usePlayerProfileData";

const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

interface Props {
  rooms: UpcomingRoom[];
  canSee: (room: UpcomingRoom) => boolean;
}

const domainConfig = {
  boardgame: {
    label: "Boardgame",
    accent: "text-domain-board",
    border: "border-l-domain-board",
    btn: "bg-domain-board/15 text-domain-board border-domain-board/40 hover:bg-domain-board/25",
  },
  botc: {
    label: "Blood on the Clocktower",
    accent: "text-domain-botc",
    border: "border-l-domain-botc",
    btn: "bg-domain-botc/15 text-domain-botc border-domain-botc/40 hover:bg-domain-botc/25",
  },
  rpg: {
    label: "RPG",
    accent: "text-domain-rpg",
    border: "border-l-domain-rpg",
    btn: "bg-domain-rpg/15 text-domain-rpg border-domain-rpg/40 hover:bg-domain-rpg/25",
  },
} as const;

export const ProfileUpcomingMatches = ({ rooms, canSee }: Props) => {
  const visible = rooms.filter(canSee).slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Próximas partidas</h2>
        <span className="text-xs text-muted-foreground">
          {rooms.length} agendada{rooms.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((r) => {
          const cfg =
            domainConfig[(r.room_type as keyof typeof domainConfig) ?? "boardgame"] ??
            domainConfig.boardgame;
          const d = new Date(r.scheduled_at);
          const day = String(d.getDate()).padStart(2, "0");
          const month = MONTH_LABELS[d.getMonth()];
          const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
          const full = r.confirmed_count >= r.max_players;
          return (
            <div
              key={r.id}
              className={cn(
                "rounded-lg border-l-2 border border-border bg-background/40 p-3 flex items-center gap-3",
                cfg.border,
              )}
            >
              <div className="flex flex-col items-center justify-center px-2 py-1 rounded-md bg-secondary/40 text-center leading-none flex-shrink-0">
                <span className="text-[9px] uppercase text-muted-foreground tracking-wider">
                  {weekday.toUpperCase()}
                </span>
                <span className="text-lg font-bold tabular-nums">{day}</span>
                <span className={cn("text-[9px] font-semibold tracking-wider", cfg.accent)}>
                  {month}
                </span>
              </div>
              <Link to={`/partidas?room=${r.id}`} className="flex-1 min-w-0 group">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm truncate group-hover:text-gold transition-colors">
                    {r.title}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 border text-white",
                      full ? "border-muted" : "border-domain-positive/40",
                    )}
                  >
                    {full ? "Cheia" : "Aberta"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {r.game_name} · {time}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                  {r.confirmed_count} / {r.max_players}
                </p>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileUpcomingMatches;
