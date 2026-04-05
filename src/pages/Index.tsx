import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import logo from "@/assets/azd-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DiscordIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
  </svg>
);

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay },
});

const hoverSpring = {
  whileHover: { scale: 1.08, y: -2 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 400, damping: 15 },
};

const SocialLinks = () => {
  const [links, setLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("contact_links").select("name, url").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        for (const r of data) map[r.name] = r.url;
        setLinks(map);
      }
    });
  }, []);

  const hasAny = links.discord || links.whatsapp || links.whatsapp_botc;
  if (!hasAny) return null;

  return (
    <motion.div {...fadeUp(0.5)} className="relative mt-6 flex flex-wrap justify-center gap-3">
      {links.discord && (
        <a href={links.discord} target="_blank" rel="noopener noreferrer">
          <motion.div {...hoverSpring}>
            <Button variant="outline" size="sm" className="gap-2">
              <DiscordIcon size={16} /> Discord
            </Button>
          </motion.div>
        </a>
      )}
      {links.whatsapp && (
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
          <motion.div {...hoverSpring}>
            <Button variant="outline" size="sm" className="gap-2">
              <MessageCircle className="h-4 w-4" /> WhatsApp <span className="text-[10px] opacity-70">BG</span>
            </Button>
          </motion.div>
        </a>
      )}
      {links.whatsapp_botc && (
        <a href={links.whatsapp_botc} target="_blank" rel="noopener noreferrer">
          <motion.div {...hoverSpring}>
            <Button variant="outline" size="sm" className="gap-2">
              <MessageCircle className="h-4 w-4" /> WhatsApp <span className="text-[10px] opacity-70">BotC</span>
            </Button>
          </motion.div>
        </a>
      )}
    </motion.div>
  );
};

const LoggedOutIndex = () => (
  <div className="min-h-screen">
    <section className="relative flex flex-col items-center justify-center px-4 py-32 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative">
        <img src={logo} alt="AzD" className="h-32 w-32 mx-auto mb-8 drop-shadow-[0_0_30px_hsl(43,100%,50%,0.3)]" />
      </motion.div>
      <motion.h1 {...fadeUp(0.2)} className="relative text-5xl md:text-7xl font-black tracking-tight">
        Ami<span className="text-gold">z</span>ade
      </motion.h1>
      <motion.p {...fadeUp(0.3)} className="relative mt-4 max-w-lg text-lg text-muted-foreground">
        Mais do que jogar, construímos amizades. Seasons competitivas com premiações, rankings e muita diversão na mesa.
      </motion.p>
      <motion.div {...fadeUp(0.4)} className="relative mt-8 flex flex-wrap justify-center gap-4">
        <Link to="/register">
          <motion.div {...hoverSpring}>
            <Button variant="gold" size="lg">Faça parte da comunidade</Button>
          </motion.div>
        </Link>
      </motion.div>
      <SocialLinks />
    </section>
  </div>
);

const LoggedInIndex = () => {
  const { user } = useAuth();
  const [upcomingRooms, setUpcomingRooms] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);

  useEffect(() => {
    // Upcoming rooms user is in
    const fetchDashboard = async () => {
      if (!user) return;

      // Upcoming rooms
      const { data: playerRooms } = await supabase
        .from("match_room_players")
        .select("room_id")
        .eq("player_id", user.id);
      if (playerRooms && playerRooms.length > 0) {
        const roomIds = playerRooms.map(r => r.room_id);
        const { data: rooms } = await supabase
          .from("match_rooms")
          .select("id, title, scheduled_at, status, game:games(name)")
          .in("id", roomIds)
          .in("status", ["open", "full"] as any)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
          .limit(3);
        if (rooms) setUpcomingRooms(rooms.map((r: any) => ({ ...r, game: Array.isArray(r.game) ? r.game[0] : r.game })));
      }

      // Recent matches
      const { data: results } = await supabase
        .from("match_results")
        .select("match_id, position, score")
        .eq("player_id", user.id)
        .order("match_id", { ascending: false })
        .limit(5);
      if (results && results.length > 0) {
        const matchIds = results.map(r => r.match_id);
        const { data: matches } = await supabase
          .from("matches")
          .select("id, played_at, game:games(name)")
          .in("id", matchIds)
          .order("played_at", { ascending: false });
        if (matches) {
          setRecentMatches(matches.map((m: any) => {
            const r = results.find(r => r.match_id === m.id);
            return { ...m, game: Array.isArray(m.game) ? m.game[0] : m.game, position: r?.position, score: r?.score };
          }));
        }
      }

      // Active season
      const now = new Date().toISOString().slice(0, 10);
      const { data: season } = await supabase
        .from("seasons")
        .select("id, name")
        .lte("start_date", now)
        .gte("end_date", now)
        .limit(1)
        .maybeSingle();
      if (season) {
        setActiveSeason(season);
        // Top 5 players in season
        const { data: ratings } = await supabase
          .from("mmr_ratings")
          .select("player_id, current_mmr, wins, games_played")
          .eq("season_id", season.id)
          .order("current_mmr", { ascending: false })
          .limit(5);
        if (ratings && ratings.length > 0) {
          const pIds = ratings.map(r => r.player_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, nickname, name")
            .in("id", pIds);
          const pMap = new Map((profiles || []).map((p: any) => [p.id, p.nickname || p.name]));
          setTopPlayers(ratings.map(r => ({ ...r, name: pMap.get(r.player_id) || '?' })));
        }
      }
    };
    fetchDashboard();
  }, [user]);

  const posColors = ['text-yellow-400', 'text-gray-400', 'text-amber-600'];

  return (
    <div className="min-h-screen">
      <section className="relative flex flex-col items-center justify-center px-4 py-20 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative">
          <img src={logo} alt="AzD" className="h-24 w-24 mx-auto mb-6 drop-shadow-[0_0_30px_hsl(43,100%,50%,0.3)]" />
        </motion.div>
        <motion.h1 {...fadeUp(0.2)} className="relative text-4xl md:text-6xl font-black tracking-tight">
          Ami<span className="text-gold">z</span>ade
        </motion.h1>
        <motion.p {...fadeUp(0.3)} className="relative mt-3 max-w-lg text-muted-foreground">
          Mais do que jogar, construímos amizades.
        </motion.p>
        <motion.div {...fadeUp(0.4)} className="relative mt-6 flex flex-wrap justify-center gap-4">
          <Link to="/partidas">
            <motion.div {...hoverSpring}>
              <Button variant="gold" size="lg">Agendar Partida</Button>
            </motion.div>
          </Link>
          <Link to="/seasons">
            <motion.div {...hoverSpring}>
              <Button variant="outline" size="lg">Cenário Competitivo</Button>
            </motion.div>
          </Link>
        </motion.div>
        <SocialLinks />
      </section>

      {/* Dashboard Cards */}
      <section className="container pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Upcoming Matches */}
          <Link to="/partidas" className="block">
            <motion.div {...fadeUp(0.5)}>
              <div className="rounded-xl border border-border bg-card p-5 hover:border-gold/30 transition-colors h-full">
                <h3 className="text-sm font-semibold text-gold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Próximas Partidas
                </h3>
                {upcomingRooms.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingRooms.map(r => (
                      <div key={r.id} className="flex justify-between items-center text-sm">
                        <span className="truncate">{r.game?.name} — {r.title}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {new Date(r.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma partida agendada</p>
                )}
              </div>
            </motion.div>
          </Link>

          {/* Active Season Ranking */}
          {activeSeason && (
            <Link to={`/seasons/${activeSeason.id}`} className="block">
              <motion.div {...fadeUp(0.6)}>
                <div className="rounded-xl border border-border bg-card p-5 hover:border-gold/30 transition-colors h-full">
                  <h3 className="text-sm font-semibold text-gold mb-3 flex items-center gap-2">
                    🏆 {activeSeason.name}
                  </h3>
                  {topPlayers.length > 0 ? (
                    <div className="space-y-1.5">
                      {topPlayers.map((p, i) => (
                        <div key={p.player_id} className="flex justify-between items-center text-sm">
                          <span className={`font-medium ${posColors[i] || ''}`}>{i + 1}. {p.name}</span>
                          <span className="text-xs text-muted-foreground">{p.current_mmr} MMR</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem dados de ranking</p>
                  )}
                </div>
              </motion.div>
            </Link>
          )}

          {/* Recent Matches */}
          <Link to="/games" className="block">
            <motion.div {...fadeUp(0.7)}>
              <div className="rounded-xl border border-border bg-card p-5 hover:border-gold/30 transition-colors h-full">
                <h3 className="text-sm font-semibold text-gold mb-3 flex items-center gap-2">
                  🎲 Últimas Partidas
                </h3>
                {recentMatches.length > 0 ? (
                  <div className="space-y-2">
                    {recentMatches.map(m => (
                      <div key={m.id} className="flex justify-between items-center text-sm">
                        <span className="truncate">{m.game?.name}</span>
                        <span className={`text-xs font-medium ${m.position === 1 ? 'text-gold' : 'text-muted-foreground'}`}>
                          {m.position === 1 ? '🏆' : `${m.position}º`} {m.score}pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma partida registrada</p>
                )}
              </div>
            </motion.div>
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
