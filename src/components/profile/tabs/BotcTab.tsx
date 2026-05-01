import { Skull, ShieldCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileBotcStats } from "@/hooks/usePlayerProfileData";
import ProfileDomainAchievements from "@/components/profile/ProfileDomainAchievements";

interface Props {
  stats: ProfileBotcStats;
  profileId: string;
  playerName?: string;
}

const teamColor = (team: string | null) => {
  if (team === "demon" || team === "minion") return "text-domain-botc bg-domain-botc/15 border-domain-botc/30";
  return "text-domain-info bg-domain-info/15 border-domain-info/30";
};

export const BotcTab = ({ stats, profileId, playerName }: Props) => {
  const achievementsBlock = (
    <ProfileDomainAchievements
      profileId={profileId}
      domain="botc"
      playerName={playerName}
    />
  );

  if (
    stats.gamesPlayed === 0 &&
    stats.storytellerGames === 0 &&
    stats.characters.length === 0
  ) {
    return (
      <div className="space-y-4">
        {achievementsBlock}
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma partida de Blood on the Clocktower registrada ainda.
        </div>
      </div>
    );
  }

  const goodWr = stats.goodPlayed > 0 ? Math.round((stats.winsGood / stats.goodPlayed) * 100) : 0;
  const evilWr = stats.evilPlayed > 0 ? Math.round((stats.winsEvil / stats.evilPlayed) * 100) : 0;

  return (
    <div className="space-y-4">
      {achievementsBlock}

      {/* Stats lado a lado */}
      <div className="grid gap-3 md:grid-cols-2">
        <StatsCard
          accent="text-domain-botc"
          icon={<Skull className="h-4 w-4" />}
          title="Como Storyteller"
          big={stats.storytellerGames}
          bigLabel="partidas narradas"
        />
        <StatsCard
          accent="text-foreground"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Como Aventureiro"
          big={stats.gamesPlayed}
          bigLabel="partidas jogadas"
          rows={[
            { label: "Vitórias no Bem", value: `${stats.winsGood} / ${stats.goodPlayed}`, sub: `${goodWr}%` },
            { label: "Vitórias no Mal", value: `${stats.winsEvil} / ${stats.evilPlayed}`, sub: `${evilWr}%` },
          ]}
        />
      </div>

      {/* Personagens favoritos */}
      {stats.characters.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold">Personagens favoritos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mais jogados quando aventureiro
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.characters.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border bg-background/40 p-3 text-center"
              >
                <div
                  className={cn(
                    "mx-auto h-14 w-14 rounded-full border flex items-center justify-center mb-2",
                    teamColor(c.team),
                  )}
                >
                  <Star className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold line-clamp-1">{c.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {c.games} jogada{c.games === 1 ? "" : "s"} · {c.wins} vitória
                  {c.wins === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Joga muito com */}
      {stats.partners.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold mb-4">Joga muito com</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {stats.partners.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/40"
              >
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.name}
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-gold font-semibold flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.goodGames + p.evilGames} partidas juntos
                  </p>
                  <p className="text-[10px] mt-0.5">
                    <span className="text-domain-info">
                      ● Bem {p.goodGames} ({p.goodWins} V)
                    </span>{" "}
                    <span className="text-domain-botc">
                      ● Mal {p.evilGames} ({p.evilWins} V)
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const StatsCard = ({
  accent,
  icon,
  title,
  big,
  bigLabel,
  rows,
}: {
  accent: string;
  icon: React.ReactNode;
  title: string;
  big: number;
  bigLabel: string;
  rows?: { label: string; value: string; sub?: string }[];
}) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wider", accent)}>
      {icon} {title}
    </div>
    <p className="mt-3 text-3xl font-bold tabular-nums">
      {big} <span className="text-xs font-normal text-muted-foreground">{bigLabel}</span>
    </p>
    {rows && (
      <div className="mt-3 space-y-1.5 text-sm">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="tabular-nums font-medium">
              {r.value}{" "}
              {r.sub && <span className="text-xs text-muted-foreground">({r.sub})</span>}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default BotcTab;
