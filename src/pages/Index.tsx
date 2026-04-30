import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fadeUp } from "@/lib/animations";
import { useMotionProps } from "@/lib/animations";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Hero } from "@/components/home/Hero";
import { DashboardCard } from "@/components/home/DashboardCard";
import { SocialButtons } from "@/components/home/SocialButtons";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingStats } from "@/components/landing/LandingStats";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingProfileSection } from "@/components/landing/LandingProfileSection";
import { LandingMatchRoomsSection } from "@/components/landing/LandingMatchRoomsSection";
import { LandingCommunitiesSection } from "@/components/landing/LandingCommunitiesSection";
import { LandingSeasonsSection } from "@/components/landing/LandingSeasonsSection";
import { LandingGamesSection } from "@/components/landing/LandingGamesSection";
import { LandingFinalCTA } from "@/components/landing/LandingFinalCTA";

const POSITION_COLORS = ["text-yellow-400", "text-gray-400", "text-amber-600"];

function formatMmr(value: number) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getSeasonContextLine(activeSeason: { end_date: string; match_count: number } | null): string | null {
  if (!activeSeason) return null;

  const now = new Date();
  const end = new Date(activeSeason.end_date + "T23:59:59");
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let timeStr: string;
  if (diffDays < 0) timeStr = "encerrada";
  else if (diffDays === 0) timeStr = "encerra hoje";
  else if (diffDays === 1) timeStr = "encerra amanhã";
  else timeStr = `encerra em ${diffDays} dias`;

  return `Season ativa · ${timeStr} · ${activeSeason.match_count} partida${activeSeason.match_count !== 1 ? "s" : ""} registrada${activeSeason.match_count !== 1 ? "s" : ""}`;
}

function getPositionDot(position: number | null) {
  if (position == null) return null;

  let colorClass = "bg-muted-foreground";
  if (position === 1) colorClass = "bg-yellow-400";
  else if (position <= 3) colorClass = "bg-amber-500";

  return <div className={`w-2 h-2 rounded-full shrink-0 ${colorClass}`} />;
}

const LoggedOutIndex = () => (
  <div>
    <LandingHero />
    <LandingStats />
    <LandingTestimonials />
    <LandingProfileSection />
    <LandingMatchRoomsSection />
    <LandingCommunitiesSection />
    <LandingSeasonsSection />
    <LandingGamesSection />
    <LandingFinalCTA />
  </div>
);

const LoggedInIndex = () => {
  const { user } = useAuth();
  const { upcomingRooms, recentMatches, activeSeason, topPlayers, userRank, loading } = useDashboardData(user?.id);
  const motionProps = useMotionProps();

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
  const firstName = displayName.includes(" ") ? displayName.split(" ")[0] : displayName;
  const greeting = firstName
    ? `Olá, ${firstName}! Mais do que jogar, construímos amizades.`
    : "Mais do que jogar, construímos amizades.";

  const seasonContext = getSeasonContextLine(activeSeason);
  const seasonLink = activeSeason ? `/seasons/${activeSeason.id}` : "/seasons";

  return (
    <div>
      <Hero compact subtitle={greeting}>
        <motion.div {...fadeUp(0.4)} className="relative mt-6 flex flex-wrap justify-center gap-4">
          <Link to="/partidas">
            <motion.div {...motionProps}>
              <Button variant="gold" size="lg">
                Agendar Partida
              </Button>
            </motion.div>
          </Link>
          <Link to="/seasons">
            <motion.div {...motionProps}>
              <Button variant="outline" size="lg">
                Ver Ranking
              </Button>
            </motion.div>
          </Link>
        </motion.div>
        <SocialButtons />
      </Hero>

      <section className="container pb-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to={seasonLink} className="group block order-2 h-full sm:order-none">
            <DashboardCard title={activeSeason?.name ?? "Ranking da Season"} icon={<span>🏆</span>} delay={0.6} loading={loading}>
              {activeSeason ? (
                <div className="space-y-4">
                  {seasonContext && <p className="text-xs text-muted-foreground">{seasonContext}</p>}

                  {userRank ? (
                    <div className="space-y-1 text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Minha posição</p>
                      <p className="text-lg font-bold">{userRank.position}° lugar</p>
                      <p className="text-sm text-muted-foreground">{formatMmr(userRank.current_mmr)} MMR</p>
                      {userRank.position_change != null && userRank.position_change !== 0 ? (
                        <p className={`text-xs ${userRank.position_change > 0 ? "text-green-400" : "text-red-400"}`}>
                          {userRank.position_change > 0 ? "↑" : "↓"} {userRank.position_change > 0 ? "+" : ""}
                          {userRank.position_change} {Math.abs(userRank.position_change) === 1 ? "posição" : "posições"} desde a última partida
                        </p>
                      ) : userRank.position_change === 0 ? (
                        <p className="text-xs text-muted-foreground">Manteve a posição na última partida</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2 text-center">
                      <p className="text-sm text-muted-foreground">Você ainda não entrou em nenhuma season.</p>
                      <Button variant="outline" size="sm" asChild>
                        <span>Ver Seasons</span>
                      </Button>
                    </div>
                  )}

                  {topPlayers.length > 0 ? (
                    <div className="space-y-1.5 border-t border-border pt-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Top 5</p>
                      {topPlayers.map((player, index) => (
                        <div key={player.player_id} className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${POSITION_COLORS[index] || ""}`}>
                            {index + 1}. {player.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatMmr(player.current_mmr)} MMR</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2 text-center">
                      <p className="text-sm text-muted-foreground">Nenhuma partida registrada na season.</p>
                      <Button variant="outline" size="sm" asChild>
                        <span>Ver Seasons</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma season ativa no momento.</p>
                  <Button variant="outline" size="sm" asChild>
                    <span>Ver Seasons</span>
                  </Button>
                </div>
              )}
            </DashboardCard>
          </Link>

          <Link to="/partidas" className="group block order-1 h-full sm:order-none">
            <DashboardCard
              title="Próximas Partidas"
              icon={<Calendar className="h-4 w-4" />}
              delay={0.5}
              loading={loading}
            >
              {upcomingRooms.length > 0 ? (
                <div className="space-y-3">
                  {upcomingRooms.map((room) => (
                    <div key={room.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">
                          {room.game?.name} — {room.title}
                        </span>
                        <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(room.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/40">
                          <div
                            className="h-full rounded-full bg-gold transition-all"
                            style={{ width: `${Math.min((room.confirmed_count / room.max_players) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {room.confirmed_count}/{room.max_players} vagas
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma partida agendada ainda.</p>
                  <Button variant="outline" size="sm" asChild>
                    <span>Criar Sala</span>
                  </Button>
                </div>
              )}
            </DashboardCard>
          </Link>

          <Link to="/games" className="group block order-3 h-full sm:order-none">
            <DashboardCard title="Últimas Partidas" icon={<span>🎲</span>} delay={0.7} loading={loading}>
              {recentMatches.length > 0 ? (
                <div className="space-y-2">
                  {recentMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 truncate">
                        {match.isUserMatch && getPositionDot(match.position)}
                        <span className={`truncate ${match.isUserMatch ? "" : "text-muted-foreground"}`}>{match.game?.name}</span>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(match.played_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                        {match.position != null ? (
                          <span className={`text-xs font-medium ${match.position === 1 ? "text-gold" : "text-muted-foreground"}`}>
                            {match.position === 1 ? "🏆" : `${match.position}º`}
                            {match.score != null ? ` ${match.score}pts` : ""}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <p className="text-sm text-muted-foreground">Você ainda não jogou nenhuma partida.</p>
                  <Button variant="outline" size="sm" asChild>
                    <span>Explorar Jogos</span>
                  </Button>
                </div>
              )}
            </DashboardCard>
          </Link>
        </div>
      </section>
    </div>
  );
};

const Index = () => {
  const { user } = useAuth();
  return user ? <LoggedInIndex /> : <LoggedOutIndex />;
};

export default Index;
