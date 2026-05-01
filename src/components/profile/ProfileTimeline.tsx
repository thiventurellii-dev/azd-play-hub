import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type TimelineEventType =
  | "match_won"
  | "match_played"
  | "rpg_session_master"
  | "rpg_session_player"
  | "botc_storyteller"
  | "botc_played"
  | "community_joined"
  | "level_up"
  | "achievement"
  | "season_promotion"
  | "character_died";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: React.ReactNode;
  to?: string;
  /** Custom leading visual (e.g. mini AchievementBadge). Replaces the colored dot. */
  badge?: React.ReactNode;
}

interface Props {
  events: TimelineEvent[];
  ownerNickname?: string;
}

const dotByType: Record<TimelineEventType, string> = {
  match_won: "bg-gold",
  match_played: "bg-muted-foreground",
  rpg_session_master: "bg-domain-rpg",
  rpg_session_player: "bg-domain-rpg",
  botc_storyteller: "bg-domain-botc",
  botc_played: "bg-domain-botc",
  community_joined: "bg-domain-info",
  level_up: "bg-domain-positive",
  achievement: "bg-gold",
  season_promotion: "bg-gold",
  character_died: "bg-domain-botc",
};

export const ProfileTimeline = ({ events, ownerNickname }: Props) => {
  if (events.length === 0) return null;
  const visible = events.slice(0, 6);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Linha do tempo</h3>
        {ownerNickname && (
          <Link
            to={`/perfil/${ownerNickname}/atividade`}
            className="text-xs text-muted-foreground hover:text-gold transition-colors"
          >
            Ver tudo →
          </Link>
        )}
      </div>
      <ul className="space-y-2.5">
        {visible.map((e) => (
          <li key={e.id} className="flex items-center gap-3">
            {e.badge ? (
              <span className="flex-shrink-0">{e.badge}</span>
            ) : (
              <span className={cn("h-2 w-2 rounded-full flex-shrink-0", dotByType[e.type])} />
            )}
            <div className="flex-1 min-w-0 text-sm leading-snug">{e.title}</div>
            <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
              {new Date(e.date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ProfileTimeline;
