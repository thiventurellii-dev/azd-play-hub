import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Trophy, Gamepad2, Percent, Flame, ArrowLeft, Calendar, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";
import FriendButton from "@/components/friendlist/FriendButton";

const PlayerProfile = () => {
  const { nickname } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string>("player");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalGames: 0, uniqueGames: 0, winRate: 0, winStreak: 0 });
  const [gamePerformance, setGamePerformance] = useState<any[]>([]);
  const [opponents, setOpponents] = useState<{ name: string; games: number; wins: number }[]>([]);
  const [upcomingRooms, setUpcomingRooms] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("nickname", nickname as string)
        .maybeSingle();
      if (!prof) {
        setLoading(false);
        return;
      }
      setProfile(prof);

      // Role
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", prof.id).maybeSingle();
      if (roleData) setRole(roleData.role);

      // Match results
      const { data: results } = await supabase
        .from("match_results")
        .select("match_id, position, score")
        .eq("player_id", prof.id);
      if (!results || results.length === 0) {
        setLoading(false);
        return;
      }

      const matchIds = [...new Set(results.map((r) => r.match_id))];
      const { data: matches } = await supabase
        .from("matches")
        .select("id, game_id, played_at")
        .in("id", matchIds)
        .order("played_at", { ascending: false });

      const gameIds = [...new Set((matches || []).map((m) => m.game_id))];
      const { data: games } = await supabase.from("games").select("id, name, slug").in("id", gameIds);
      const gameMap: Record<string, any> = {};
      for (const g of games || []) gameMap[g.id] = g;

      // Stats
      const wins = results.filter((r) => r.position === 1).length;
      const winRate = results.length > 0 ? Math.round((wins / results.length) * 100) : 0;

      // Win streak (from most recent)
      const sortedMatches = (matches || []).sort(
        (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
      );
      let streak = 0;
      for (const m of sortedMatches) {
        const r = results.find((r) => r.match_id === m.id);
        if (r?.position === 1) streak++;
        else break;
      }

      setStats({
        totalGames: results.length,
        uniqueGames: gameIds.length,
        winRate,
        winStreak: streak,
      });

      // Performance by game
      const perfMap: Record<string, { games: number; wins: number; totalScore: number; best: number }> = {};
      for (const r of results) {
        const m = (matches || []).find((m) => m.id === r.match_id);
        if (!m) continue;
        const gid = m.game_id;
        if (!perfMap[gid]) perfMap[gid] = { games: 0, wins: 0, totalScore: 0, best: 0 };
        perfMap[gid].games++;
        perfMap[gid].totalScore += r.score || 0;
        perfMap[gid].best = Math.max(perfMap[gid].best, r.score || 0);
        if (r.position === 1) perfMap[gid].wins++;
      }
      setGamePerformance(
        Object.entries(perfMap)
          .map(([gid, s]) => ({
            game_id: gid,
            game_name: gameMap[gid]?.name || "?",
            game_slug: gameMap[gid]?.slug || null,
            ...s,
            winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
            avgScore: s.games > 0 ? Math.round(s.totalScore / s.games) : 0,
          }))
          .sort((a, b) => b.games - a.games),
      );

      // Opponents (from same matches)
      const { data: allResults } = await supabase
        .from("match_results")
        .select("match_id, player_id, position")
        .in("match_id", matchIds);
      const oppMap: Record<string, { games: number; wins: number }> = {};
      for (const r of allResults || []) {
        if (r.player_id === prof.id) continue;
        if (!oppMap[r.player_id]) oppMap[r.player_id] = { games: 0, wins: 0 };
        oppMap[r.player_id].games++;
        // Did our player win this match?
        const myResult = results.find((mr) => mr.match_id === r.match_id);
        if (myResult?.position === 1) oppMap[r.player_id].wins++;
      }
      const oppIds = Object.keys(oppMap);
      const { data: oppProfiles } = await supabase.from("profiles").select("id, name, nickname").in("id", oppIds);
      const oppNameMap: Record<string, string> = {};
      for (const p of oppProfiles || []) oppNameMap[p.id] = (p as any).nickname || p.name;
      setOpponents(
        Object.entries(oppMap)
          .map(([pid, s]) => ({ name: oppNameMap[pid] || "?", ...s }))
          .sort((a, b) => b.games - a.games)
          .slice(0, 8),
      );

      // Upcoming rooms
      const { data: roomPlayers } = await supabase
        .from("match_room_players")
        .select("room_id")
        .eq("player_id", prof.id);
      if (roomPlayers && roomPlayers.length > 0) {
        const roomIds = roomPlayers.map((rp) => rp.room_id);
        const { data: rooms } = await supabase
          .from("match_rooms")
          .select("id, title, scheduled_at, status, game_id")
          .in("id", roomIds)
          .in("status", ["open", "full"])
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
          .limit(5);
        if (rooms) {
          const roomGameIds = [...new Set(rooms.map((r) => r.game_id))];
          const { data: roomGames } = await supabase.from("games").select("id, name").in("id", roomGameIds);
          const rgMap: Record<string, string> = {};
          for (const g of roomGames || []) rgMap[g.id] = g.name;
          setUpcomingRooms(rooms.map((r) => ({ ...r, game_name: rgMap[r.game_id] || "?" })));
        }
      }

      setLoading(false);
    };
    fetchProfile();
  }, [nickname]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Jogador não encontrado</h1>
        <Link to="/players">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const chartConfig = { games: { label: "Partidas juntos", color: "hsl(var(--gold))" } };

  return (
    <div className="container py-10 space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-gold font-bold text-3xl flex-shrink-0">
              {(profile.nickname || profile.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              {profile.nickname && <p className="text-gold">@{profile.nickname}</p>}
              <div className="flex items-center gap-2 justify-center sm:justify-start mt-2">
                <Badge variant={role === "admin" ? "default" : "secondary"}>
                  {role === "admin" ? "Admin" : "Player"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Desde {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
            <FriendButton targetUserId={profile.id} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Elite Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Trophy, label: "Total de Partidas", value: stats.totalGames },
          { icon: Gamepad2, label: "Jogos Diferentes", value: stats.uniqueGames },
          { icon: Percent, label: "Win Rate", value: `${stats.winRate}%` },
          { icon: Flame, label: "Sequência de Vitórias", value: stats.winStreak },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-card border-border">
              <CardContent className="pt-6 text-center">
                <s.icon className="h-6 w-6 mx-auto text-gold mb-2" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Opponents chart */}
      {opponents.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Principais Jogadores</h2>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={opponents} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="games" fill="hsl(var(--gold))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Game performance table */}
      {gamePerformance.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Performance por Jogo</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jogo</TableHead>
                    <TableHead className="text-center">Partidas</TableHead>
                    <TableHead className="text-center">Vitórias</TableHead>
                    <TableHead className="text-center">% Vitória</TableHead>
                    <TableHead className="text-center">Média</TableHead>
                    <TableHead className="text-center">Recorde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gamePerformance.map((gp) => (
                    <TableRow key={gp.game_id}>
                      <TableCell className="font-medium">
                        {gp.game_slug ? (
                          <Link to={`/jogos/${gp.game_slug}`} className="hover:text-gold transition-colors">
                            {gp.game_name}
                          </Link>
                        ) : (
                          gp.game_name
                        )}
                      </TableCell>
                      <TableCell className="text-center">{gp.games}</TableCell>
                      <TableCell className="text-center">{gp.wins}</TableCell>
                      <TableCell className="text-center">{gp.winPct}%</TableCell>
                      <TableCell className="text-center">{gp.avgScore}</TableCell>
                      <TableCell className="text-center font-bold text-gold">{gp.best}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming rooms */}
      {upcomingRooms.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Próximas Partidas</h2>
            <div className="space-y-2">
              {upcomingRooms.map((r) => {
                const d = new Date(r.scheduled_at);
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-sm text-muted-foreground">🎮 {r.game_name}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {d.toLocaleDateString("pt-BR")}
                      </p>
                      <p className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{" "}
                        {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlayerProfile;
