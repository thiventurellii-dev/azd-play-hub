import { Link } from "react-router-dom";
import { Sparkles, Star, Plus, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileRpgStats } from "@/hooks/useProfileRpgData";
import ProfileDomainAchievements from "@/components/profile/ProfileDomainAchievements";

interface Props {
  stats: ProfileRpgStats;
  isOwnProfile: boolean;
  onCreateCharacter?: () => void;
  profileId: string;
  playerName?: string;
}

const formatHours = (mins: number) => {
  if (mins <= 0) return "0h";
  return `${Math.round(mins / 60)}h`;
};
const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export const RpgTab = ({ stats, isOwnProfile, onCreateCharacter, profileId, playerName }: Props) => {
  const achievementsBlock = (
    <ProfileDomainAchievements
      profileId={profileId}
      domain="rpg"
      playerName={playerName}
    />
  );

  const noContent =
    stats.campaigns.length === 0 && stats.characters.length === 0;
  if (noContent) {
    return (
      <div className="space-y-4">
        {achievementsBlock}
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma campanha ou personagem de RPG ainda.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {achievementsBlock}
      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-2">
        <RpgStatsCard
          accent="text-domain-rpg"
          title="Como Mestre"
          icon={<Sparkles className="h-4 w-4" />}
          cells={[
            { label: "Campanhas ativas", value: stats.asMaster.activeCampaigns },
            { label: "Sessões", value: stats.asMaster.sessions },
            { label: "De mesa", value: formatHours(stats.asMaster.totalMinutes) },
            { label: "Aventureiros", value: stats.asMaster.uniquePlayers },
          ]}
        />
        <RpgStatsCard
          accent="text-foreground"
          title="Como Aventureiro"
          icon={<Star className="h-4 w-4" />}
          cells={[
            { label: "Campanhas ativas", value: stats.asPlayer.activeCampaigns },
            { label: "Personagens", value: stats.asPlayer.characters },
            { label: "Sessões", value: stats.asPlayer.sessions },
            { label: "De mesa", value: formatHours(stats.asPlayer.totalMinutes) },
          ]}
        />
      </div>

      {/* Personagens */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Personagens</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Heróis e lendas</p>
          </div>
          {isOwnProfile && onCreateCharacter && (
            <button
              onClick={onCreateCharacter}
              className="text-xs px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:border-domain-rpg/40 hover:text-domain-rpg transition-colors inline-flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Novo personagem
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.characters.slice(0, 4).map((c) => {
            const inactive = c.status !== "active";
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-lg border border-border bg-background/40 p-3 transition-all",
                  inactive && "[filter:saturate(0.4)] opacity-80",
                )}
              >
                <div className="aspect-square rounded-md overflow-hidden bg-secondary mb-2 flex items-center justify-center">
                  {c.portrait_url ? (
                    <img src={c.portrait_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-domain-rpg">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold truncate flex items-center gap-1">
                  {c.name}
                  {c.status === "dead" && (
                    <Flame className="h-3 w-3 text-domain-botc" aria-label="Caiu" />
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {[c.race, c.class].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {c.level ? `Nv ${c.level}` : "—"}
                  {" · "}
                  <span className={inactive ? "text-domain-botc" : "text-domain-positive"}>
                    {labelStatus(c.status)}
                  </span>
                </p>
              </div>
            );
          })}
          {isOwnProfile &&
            stats.characters.length < 4 &&
            Array.from({ length: 4 - stats.characters.length }).map((_, i) => (
              <button
                key={`empty-${i}`}
                onClick={onCreateCharacter}
                className="aspect-square rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-domain-rpg hover:border-domain-rpg/40 transition-colors"
              >
                <Plus className="h-6 w-6" />
              </button>
            ))}
        </div>
      </section>

      {/* Campanhas */}
      {stats.campaigns.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Campanhas</h3>
            <span className="text-xs text-muted-foreground">
              {stats.campaigns.filter((c) => c.status === "active").length} ativa
              {stats.campaigns.filter((c) => c.status === "active").length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="space-y-2">
            {stats.campaigns.map((c) => (
              <Link
                key={c.id}
                to={c.slug ? `/rpg/campanhas/${c.slug}` : "#"}
                className={cn(
                  "block rounded-lg border border-l-4 border-border bg-background/40 p-3 hover:border-domain-rpg/40 transition-colors",
                  c.is_master ? "border-l-domain-rpg" : "border-l-border",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border",
                          c.is_master
                            ? "text-domain-rpg border-domain-rpg/30 bg-domain-rpg/10"
                            : "text-muted-foreground border-border",
                        )}
                      >
                        {c.is_master ? "Mestre" : "Aventureiro"}
                      </span>
                    </div>
                    {c.adventure_name && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {c.adventure_name}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {c.party_count} aventureiros · {c.session_count} sessões ·{" "}
                      {formatHours(c.total_minutes)}
                      {c.my_character_name && (
                        <span className="text-domain-rpg"> · jogando {c.my_character_name}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap",
                        c.status === "active"
                          ? "text-domain-positive border-domain-positive/30 bg-domain-positive/10"
                          : "text-muted-foreground border-border",
                      )}
                    >
                      {labelCampaignStatus(c.status)}
                    </span>
                    {c.next_session_at && (
                      <p className="text-[11px] text-domain-rpg mt-1 tabular-nums">
                        Próxima {formatDateTime(c.next_session_at)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Co-aventureiros */}
      {stats.partners.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold mb-4">Co-aventureiros</h3>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            {stats.partners.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to={p.nickname ? `/perfil/${p.nickname}` : "#"}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/40 hover:border-domain-rpg/40 transition-colors"
              >
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.name}
                    className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-domain-rpg font-semibold flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  {p.nickname && (
                    <p className="text-[10px] text-domain-rpg truncate">@{p.nickname}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {p.campaigns} campanha{p.campaigns === 1 ? "" : "s"} · {p.sessions} sessões
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const labelStatus = (s: string | null) => {
  switch (s) {
    case "active":
      return "Ativo";
    case "dead":
      return "Caiu";
    case "retired":
      return "Aposentado";
    case "left":
      return "Saiu";
    default:
      return "—";
  }
};
const labelCampaignStatus = (s: string) => {
  switch (s) {
    case "active":
      return "Em curso";
    case "planning":
      return "Planejando";
    case "completed":
      return "Concluída";
    case "abandoned":
      return "Abandonada";
    default:
      return s;
  }
};

const RpgStatsCard = ({
  accent,
  title,
  icon,
  cells,
}: {
  accent: string;
  title: string;
  icon: React.ReactNode;
  cells: { label: string; value: number | string }[];
}) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wider", accent)}>
      {icon} {title}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3">
      {cells.map((c, i) => (
        <div key={i}>
          <p className="text-2xl font-bold tabular-nums leading-none">{c.value}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            {c.label}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default RpgTab;
