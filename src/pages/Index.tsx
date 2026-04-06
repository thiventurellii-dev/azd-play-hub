import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import logo from "@/assets/azd-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";


const LoggedOutIndex = () => (
  <div className="min-h-screen">
    <section className="relative flex flex-col items-center justify-center px-4 py-32 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
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
            <Button variant="gold" size="lg">
              Faça parte da comunidade
            </Button>
          </motion.div>
        </Link>
      </motion.div>
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
    if (!user) return;

    const fetchDashboard = async () => {
      // Run all fetches in parallel
      const [playerRoomsRes, recentBoardRes, recentBloodRes, seasonRes] = await Promise.all([
        supabase.from("match_room_players").select("room_id").eq("player_id", user.id),
        supabase.from("matches").select("id, played_at, game:games(name)").order("played_at", { ascending: false }).limit(10),
        supabase.from("blood_matches").select("id, played_at, winning_team, script:blood_scripts(name)").order("played_at", { ascending: false }).limit(10),
        supabase.from("seasons").select("id, name").eq("type", "boardgame").lte("start_date", new Date().toISOString().slice(0, 10)).gte("end_date", new Date().toISOString().slice(0, 10)).order("start_date", { ascending: false }).limit(1).maybeSingle(),
      ]);

      // Upcoming rooms
      const playerRooms = playerRoomsRes.data;
      if (playerRooms && playerRooms.length > 0) {
        const roomIds = playerRooms.map((r) => r.room_id);
        const { data: rooms } = await supabase
          .from("match_rooms")
          .select("id, title, scheduled_at, status, game:games(name)")
          .in("id", roomIds)
          .in("status", ["open", "full"] as any)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
          .limit(3);
        if (rooms)
          setUpcomingRooms(rooms.map((r: any) => ({ ...r, game: Array.isArray(r.game) ? r.game[0] : r.game })));
      }

      // Recent matches - fetch results in parallel
      const allRecent: any[] = [];
      const recentBoardMatches = recentBoardRes.data;
      const recentBloodMatches = recentBloodRes.data;

      const [boardResultsRes, bloodPlayersRes] = await Promise.all([
        recentBoardMatches && recentBoardMatches.length > 0
          ? supabase.from("match_results").select("match_id, position, score, player_id").in("match_id", recentBoardMatches.map((m: any) => m.id))
          : Promise.resolve({ data: [] }),
        recentBloodMatches && recentBloodMatches.length > 0
          ? supabase.from("blood_match_players").select("match_id, team, player_id").in("match_id", recentBloodMatches.map((m: any) => m.id))
          : Promise.resolve({ data: [] }),
      ]);

      if (recentBoardMatches) {
        for (const m of recentBoardMatches as any[]) {
          const userResult = boardResultsRes.data?.find((r: any) => r.match_id === m.id && r.player_id === user.id);
          allRecent.push({
            id: m.id, played_at: m.played_at,
            game: Array.isArray(m.game) ? m.game[0] : m.game,
            position: userResult?.position ?? null, score: userResult?.score ?? null,
            type: "boardgame", isUserMatch: !!userResult,
          });
        }
      }

      if (recentBloodMatches) {
        for (const m of recentBloodMatches as any[]) {
          const userPlay = bloodPlayersRes.data?.find((p: any) => p.match_id === m.id && p.player_id === user.id);
          const won = userPlay ? userPlay.team === m.winning_team : null;
          allRecent.push({
            id: `blood-${m.id}`, played_at: m.played_at,
            game: { name: `Blood — ${(Array.isArray(m.script) ? m.script[0] : m.script)?.name || "?"}` },
            position: won === null ? null : won ? 1 : 2, score: null,
            type: "blood", isUserMatch: !!userPlay,
          });
        }
      }

      allRecent.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
      setRecentMatches(allRecent.slice(0, 8));

      // Season ranking
      const season = seasonRes.data;
      if (!season) {
        setActiveSeason(null);
        setTopPlayers([]);
      } else {
        setActiveSeason(season);
        const { data: ratings } = await supabase
          .from("mmr_ratings")
          .select("player_id, current_mmr, wins, games_played")
          .eq("season_id", season.id)
          .order("current_mmr", { ascending: false })
          .limit(5);

        if (ratings && ratings.length > 0) {
          const pIds = ratings.map((r) => r.player_id);
          const { data: profiles } = await supabase.from("profiles").select("id, nickname, name").in("id", pIds);
          const pMap = new Map((profiles || []).map((p: any) => [p.id, p.nickname || p.name]));
          setTopPlayers(ratings.map((r) => ({ ...r, name: pMap.get(r.player_id) || "?" })));
        } else {
          setTopPlayers([]);
        }
      }
    };
    fetchDashboard();
  }, [user]);

  const posColors = ["text-yellow-400", "text-gray-400", "text-amber-600"];

  return (
    <div className="min-h-screen">
      <section className="relative flex flex-col items-center justify-center px-4 py-20 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
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
              <Button variant="gold" size="lg">
                Agendar Partida
              </Button>
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
                          <span className={`font-medium ${posColors[i] || ""}`}>
                            {i + 1}. {p.name}
                          </span>
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
                <h3 className="text-sm font-semibold text-gold mb-3 flex items-center gap-2">🎲 Últimas Partidas</h3>
                {recentMatches.length > 0 ? (
                  <div className="space-y-2">
                    {recentMatches.map((m) => (
                      <div key={m.id} className="flex justify-between items-center text-sm">
                        <span className={`truncate ${m.isUserMatch ? "" : "text-muted-foreground"}`}>
                          {m.game?.name}
                        </span>
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
