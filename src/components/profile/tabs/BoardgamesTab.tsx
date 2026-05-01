import { Link } from "react-router-dom";
import { Gamepad2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GamePerf, Partner } from "@/hooks/usePlayerProfileData";
import ProfileDomainAchievements from "@/components/profile/ProfileDomainAchievements";

interface Props {
  showcased: GamePerf[];
  partners: Partner[];
  isOwnProfile: boolean;
  onEditShowcase?: () => void;
  profileId: string;
  playerName?: string;
}

export const BoardgamesTab = ({
  showcased,
  partners,
  isOwnProfile,
  onEditShowcase,
  profileId,
  playerName,
}: Props) => {
  const achievementsBlock = (
    <ProfileDomainAchievements
      profileId={profileId}
      domain="boardgame"
      playerName={playerName}
    />
  );

  if (showcased.length === 0 && partners.length === 0) {
    return (
      <div className="space-y-4">
        {achievementsBlock}
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma partida de boardgame registrada ainda.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {achievementsBlock}
      {showcased.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-domain-board" /> Jogos em destaque
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Curadoria do jogador · até 4 jogos
              </p>
            </div>
            {isOwnProfile && onEditShowcase && (
              <Button variant="outline" size="sm" onClick={onEditShowcase} className="h-7 text-xs">
                <Pencil className="h-3 w-3 mr-1" /> Editar destaques
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {showcased.slice(0, 4).map((g) => (
              <Link
                key={g.game_id}
                to={g.game_slug ? `/jogos/${g.game_slug}` : "#"}
                className="group rounded-lg overflow-hidden border border-border bg-background/40 hover:border-domain-board/40 transition-colors"
              >
                <div className="relative aspect-[3/4] bg-secondary overflow-hidden">
                  {g.image_url ? (
                    <img
                      src={g.image_url}
                      alt={g.game_name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-domain-board/40">
                      <Gamepad2 className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-semibold leading-tight line-clamp-1">{g.game_name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {g.games} partidas
                    {g.lastPlayedAt && (
                      <>
                        {" · última "}
                        {new Date(g.lastPlayedAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {partners.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold mb-4">Joga muito com</h3>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            {partners.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to={p.nickname ? `/perfil/${p.nickname}` : "#"}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/40 hover:border-gold/40 transition-colors"
              >
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.name}
                    className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-gold font-semibold flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  {p.nickname && (
                    <p className="text-[10px] text-gold truncate">@{p.nickname}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {p.games} partidas · {p.wins} vitórias
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

export default BoardgamesTab;
