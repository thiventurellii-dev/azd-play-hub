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
  const { upcomingRooms, recentMatches, activeSeason, topPlayers, loading } = useDashboardData(user?.id);
  const motionProps = useMotionProps();

  return (
    <div>
      <Hero compact subtitle="Mais do que jogar, construímos amizades.">
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
          <Link to="/partidas" className="group block">
            <DashboardCard
              title="Próximas Partidas"
              icon={<Calendar className="h-4 w-4" />}
              delay={0.5}
              loading={loading}
            >
              {upcomingRooms.length > 0 ? (
                <div className="space-y-2">
                  {upcomingRooms.map((r) => (
                    <div key={r.id} className="flex justify-between items-center text-sm">
                      <span className="truncate">
                        {r.game?.name} — {r.title}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(r.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
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

          {activeSeason && (
            <Link to={`/seasons/${activeSeason.id}`} className="group block">
              <DashboardCard title={activeSeason.name} icon={<span>🏆</span>} delay={0.6} loading={loading}>
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

          <Link to="/games" className="group block">
            <DashboardCard title="Últimas Partidas" icon={<span>🎲</span>} delay={0.7} loading={loading}>
              {recentMatches.length > 0 ? (
                <div className="space-y-2">
                  {recentMatches.map((m) => (
                    <div key={m.id} className="flex justify-between items-center text-sm">
                      <span className={`truncate ${m.isUserMatch ? "" : "text-muted-foreground"}`}>{m.game?.name}</span>
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
