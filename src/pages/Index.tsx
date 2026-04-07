import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import logo from "@/assets/azd-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DiscordIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
  </svg>
);

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const SocialButtons = () => {
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
    <motion.div {...fadeUp(0.5)} className="relative mt-4 flex flex-wrap justify-center gap-3">
      {links.discord && (
        <a href={links.discord} target="_blank" rel="noopener noreferrer">
          <motion.div {...hoverSpring}>
            <Button variant="outline" size="sm" className="gap-2 border-[#5865F2]/40 text-[#5865F2] hover:bg-[#5865F2]/10 hover:text-[#5865F2]">
              <DiscordIcon /> Discord
            </Button>
          </motion.div>
        </a>
      )}
      {links.whatsapp && (
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
          <motion.div {...hoverSpring}>
            <Button variant="outline" size="sm" className="gap-2 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]">
              <WhatsAppIcon /> Boardgame
            </Button>
          </motion.div>
        </a>
      )}
      {links.whatsapp_botc && (
        <a href={links.whatsapp_botc} target="_blank" rel="noopener noreferrer">
          <motion.div {...hoverSpring}>
            <Button variant="outline" size="sm" className="gap-2 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]">
              <WhatsAppIcon /> Blood
            </Button>
          </motion.div>
        </a>
      )}
    </motion.div>
  );
};

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

const LoggedOutIndex = () => (
  <div>
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
    <div>
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
        <SocialButtons />
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
