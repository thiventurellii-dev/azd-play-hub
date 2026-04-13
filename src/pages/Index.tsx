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

const POSITION_COLORS = ["text-yellow-400", "text-gray-400", "text-amber-600"];

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

const LoggedOutIndex = () => {
  const motionProps = useMotionProps();
  return (
    <div>
      <Hero subtitle="Mais do que jogar, construímos amizades. Jogos casuais, seasons competitivas com premiações, estatísticas e muita diversão na mesa.">
        <motion.div {...fadeUp(0.4)} className="relative mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/register">
            <motion.div {...motionProps}>
              <Button variant="gold" size="lg">
                Faça parte da comunidade
              </Button>
            </motion.div>
          </Link>
        </motion.div>
        <SocialButtons />
      </Hero>
    </div>
  );
};

const LoggedInIndex = () => {
  const { user } = useAuth();
  const { upcomingRooms, recentMatches, activeSeason, topPlayers, userRank, loading } = useDashboardData(user?.id);
  const motionProps = useMotionProps();

  // Build personalized greeting
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
  const firstName = displayName.includes(" ") ? displayName.split(" ")[0] : displayName;
  const greeting = firstName
    ? `Olá, ${firstName}! Mais do que jogar, construímos amizades.`
    : "Mais do que jogar, construímos amizades.";

  const seasonContext = getSeasonContextLine(activeSeason);

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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card: Minha Posição — order-1 mobile */}
          <Link to="/seasons" className="group block order-1 sm:order-none">
            <DashboardCard title="Minha Posição" icon={<span>🏅</span>} delay={0.8} loading={loading}>
              {userRank ? (
                <div className="space-y-1">
                  <p className="text-lg font-bold">{userRank.position}° lugar</p>
                  <p className="text-sm text-muted-foreground">
                    {Number(userRank.current_mmr).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMR
                  </p>
                  {userRank.mmr_change != null && userRank.mmr_change !== 0 && (
                    <p className={`text-xs ${userRank.mmr_change > 0 ? "text-green-400" : "text-red-400"}`}>
                      {userRank.mmr_change > 0 ? "↑" : "↓"} {userRank.mmr_change > 0 ? "+" : ""}
                      {Number(userRank.mmr_change).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} desde a última partida
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <p className="text-sm text-muted-foreground">Você ainda não entrou em nenhuma season.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/seasons">Ver Seasons</Link>
                  </Button>
                </div>
              )}
            </DashboardCard>
          </Link>

          {/* Card: Próximas Partidas — order-2 mobile */}
          <Link to="/partidas" className="group block order-2 sm:order-none">
            <DashboardCard
              title="Próximas Partidas"
              icon={<Calendar className="h-4 w-4" />}
              delay={0.5}
              loading={loading}
            >
              {upcomingRooms.length > 0 ? (
                <div className="space-y-3">
                  {upcomingRooms.map((r) => (
                    <div key={r.id}>
                      <div className="flex justify-between items-center text-sm">
                        <span className="truncate">
                          {r.game?.name} — {r.title}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {new Date(r.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gold transition-all"
                            style={{ width: `${Math.min((r.confirmed_count / r.max_players) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.confirmed_count}/{r.max_players} vagas
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <p className="text-sm text-muted-foreground">Nenhuma partida agendada ainda.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/partidas">Criar Sala</Link>
                  </Button>
                </div>
              )}
            </DashboardCard>
          </Link>

          {/* Card: Últimas Partidas — order-3 mobile */}
          <Link to="/games" className="group block order-3 sm:order-none">
            <DashboardCard title="Últimas Partidas" icon={<span>🎲</span>} delay={0.7} loading={loading}>
              {recentMatches.length > 0 ? (
                <div className="space-y-2">
                  {recentMatches.map((m) => (
                    <div key={m.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-1.5 truncate">
                        {m.isUserMatch && getPositionDot(m.position)}
                        <span className={`truncate ${m.isUserMatch ? "" : "text-muted-foreground"}`}>{m.game?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(m.played_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                        {m.position != null ? (
                          <span
                            className={`text-xs font-medium ${m.position === 1 ? "text-gold" : "text-muted-foreground"}`}
                          >
                            {m.position === 1 ? "🏆" : `${m.position}º`}
                            {m.score != null ? ` ${m.score}pts` : ""}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <p className="text-sm text-muted-foreground">Você ainda não jogou nenhuma partida.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/games">Explorar Jogos</Link>
                  </Button>
                </div>
              )}
            </DashboardCard>
          </Link>

          {/* Card: Season/Ranking — order-4 mobile */}
          {activeSeason && (
            <Link to={`/seasons/${activeSeason.id}`} className="group block order-4 sm:order-none">
              <DashboardCard title={activeSeason.name} icon={<span>🏆</span>} delay={0.6} loading={loading}>
                {seasonContext && (
                  <p className="text-xs text-muted-foreground mb-2">{seasonContext}</p>
                )}
                {topPlayers.length > 0 ? (
                  <div className="space-y-1.5">
                    {topPlayers.map((p, i) => (
                      <div key={p.player_id} className="flex justify-between items-center text-sm">
                        <span className={`font-medium ${POSITION_COLORS[i] || ""}`}>
                          {i + 1}. {p.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{Number(p.current_mmr).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMR</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <p className="text-sm text-muted-foreground">Nenhuma partida registrada na season.</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/seasons">Ver Seasons</Link>
                    </Button>
                  </div>
                )}
              </DashboardCard>
            </Link>
          )}
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
