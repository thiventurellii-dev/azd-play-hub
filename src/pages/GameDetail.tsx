import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ExternalLink, Video, ArrowLeft, Users, Clock, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { EntityEditButton } from "@/components/shared/EntityEditButton";
import GameForm from "@/components/forms/GameForm";
import GameStatsCarousel from "@/components/games/GameStatsCarousel";
import GameMatchHistory from "@/components/games/GameMatchHistory";
import { useGameDetail } from "@/hooks/useGameDetail";
import { useQueryClient } from "@tanstack/react-query";

const GameDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGameDetail(slug);
  const [slide, setSlide] = useState(1);
  const [detailPlayerCount, setDetailPlayerCount] = useState("all");

  const game = data?.game;
  const tags = data?.tags || [];
  const allMatches = data?.matches || [];
  const allResults = data?.results || [];
  const pMap = data?.playerMap || {};

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["game-detail", slug] });

  // Computed stats
  const stats = useMemo(() => {
    if (allResults.length === 0) return { totalMatches: 0, avgScore: 0, highScore: 0, highScorePlayer: "—", worstWinScore: 0 };
    const scores = allResults.map((r) => r.score || 0);
    const winnerScores = allResults.filter((r) => r.position === 1).map((r) => r.score || 0);
    const highScore = Math.max(...scores);
    const highScoreResult = allResults.find((r) => (r.score || 0) === highScore);
    const worstWin = winnerScores.length > 0 ? Math.min(...winnerScores) : 0;
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { totalMatches: allMatches.length, avgScore, highScore, highScorePlayer: highScoreResult ? pMap[highScoreResult.player_id] || "?" : "—", worstWinScore: worstWin };
  }, [allResults, allMatches, pMap]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0; }
    for (const m of allMatches) { const key = m.played_at.slice(0, 7); if (key in months) months[key]++; }
    return Object.entries(months).map(([month, count]) => ({ month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short" }), count }));
  }, [allMatches]);

  const leaderboard = useMemo(() => {
    const playerStats: Record<string, { wins: number; games: number; totalScore: number; best: number }> = {};
    for (const r of allResults) {
      if (!playerStats[r.player_id]) playerStats[r.player_id] = { wins: 0, games: 0, totalScore: 0, best: 0 };
      playerStats[r.player_id].games++; playerStats[r.player_id].totalScore += r.score || 0;
      playerStats[r.player_id].best = Math.max(playerStats[r.player_id].best, r.score || 0);
      if (r.position === 1) playerStats[r.player_id].wins++;
    }
    return Object.entries(playerStats).map(([pid, s]) => ({
      player_id: pid, player_name: pMap[pid] || "?", wins: s.wins, games: s.games,
      winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
      avgScore: s.games > 0 ? Math.round(s.totalScore / s.games) : 0, best: s.best,
    })).sort((a, b) => b.wins - a.wins || b.winPct - a.winPct);
  }, [allResults, pMap]);

  const allHistory = useMemo(() => {
    return allMatches.map((m) => ({
      ...m,
      results: allResults.filter((r) => r.match_id === m.id).sort((a, b) => a.position - b.position).map((r) => ({ ...r, player_name: pMap[r.player_id] || "?" })),
    }));
  }, [allMatches, allResults, pMap]);

  const personalStats = useMemo(() => {
    if (!user || allResults.length === 0) return null;
    const myResults = allResults.filter((r) => r.player_id === user.id);
    if (myResults.length === 0) return null;
    const wins = myResults.filter((r) => r.position === 1).length;
    const scores = myResults.map((r) => r.score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const matchDates = allMatches.map((m) => m.id);
    const sortedResults = matchDates.map((mid) => myResults.find((r) => r.match_id === mid)).filter(Boolean);
    let bestStreak = 0, tempStreak = 0;
    for (const r of sortedResults) { if (r!.position === 1) { tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); } else { tempStreak = 0; } }
    return { games: myResults.length, wins, winPct: myResults.length > 0 ? Math.round((wins / myResults.length) * 100) : 0, avgScore, currentStreak: tempStreak, bestStreak };
  }, [user, allResults, allMatches]);

  const detailedStats = useMemo(() => {
    if (allResults.length === 0 || allMatches.length === 0) return null;
    let matchIds = allMatches.map((m) => m.id);
    const matchPlayerCounts: Record<string, number> = {};
    for (const r of allResults) matchPlayerCounts[r.match_id] = (matchPlayerCounts[r.match_id] || 0) + 1;
    if (detailPlayerCount !== "all") { const n = parseInt(detailPlayerCount); matchIds = matchIds.filter((mid) => matchPlayerCounts[mid] === n); }
    const filteredResults = allResults.filter((r) => matchIds.includes(r.match_id));
    if (filteredResults.length === 0) return null;
    const factionStats: Record<string, { games: number; wins: number }> = {};
    const seatStats: Record<number, { games: number; wins: number }> = {};
    for (const r of filteredResults) {
      if (r.faction) { if (!factionStats[r.faction]) factionStats[r.faction] = { games: 0, wins: 0 }; factionStats[r.faction].games++; if (r.position === 1) factionStats[r.faction].wins++; }
      const seat = r.seat_position || 0;
      if (seat > 0) { if (!seatStats[seat]) seatStats[seat] = { games: 0, wins: 0 }; seatStats[seat].games++; if (r.position === 1) seatStats[seat].wins++; }
    }
    return {
      totalMatches: matchIds.length,
      factions: Object.entries(factionStats).map(([name, s]) => ({ name, games: s.games, winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 })).sort((a, b) => b.games - a.games),
      seats: Object.entries(seatStats).map(([seat, s]) => ({ seat: parseInt(seat), games: s.games, winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 })).sort((a, b) => a.seat - b.seat),
    };
  }, [allResults, allMatches, detailPlayerCount]);

  const playerCounts = useMemo(() => {
    const counts = new Set<number>();
    const mpc: Record<string, number> = {};
    for (const r of allResults) mpc[r.match_id] = (mpc[r.match_id] || 0) + 1;
    Object.values(mpc).forEach((c) => counts.add(c));
    return [...counts].sort((a, b) => a - b);
  }, [allResults]);

  const uniquePlayers = useMemo(() => Object.entries(pMap).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)), [pMap]);

  if (isLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
  if (!game) return <div className="container py-10 text-center"><h1 className="text-2xl font-bold mb-4">Jogo não encontrado</h1><Link to="/games"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button></Link></div>;

  const chartConfig = { count: { label: "Partidas", color: "hsl(var(--gold))" } };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden">
        {game.image_url ? <img src={game.image_url} alt={game.name} className="w-full h-full object-cover" /> : (
          <div className="w-full h-full bg-gradient-to-r from-secondary to-card flex items-center justify-center"><span className="text-8xl font-bold text-gold/20">{game.name.charAt(0)}</span></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="container">
            <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Jogos</Link>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{game.name}</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  {(game.min_players || game.max_players) && <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {game.min_players || "?"}–{game.max_players || "?"} jogadores</span>}
                  {(() => { const wd = allMatches.filter((m) => m.duration_minutes); if (wd.length > 0) { const avg = Math.round(wd.reduce((s, m) => s + m.duration_minutes, 0) / wd.length); return <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> ~{avg} min</span>; } return null; })()}
                  {tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
                <div className="flex gap-2 mt-2">
                  {game.rules_url && <a href={game.rules_url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="h-4 w-4 mr-1" /> Regras</Button></a>}
                  {game.video_url && <a href={game.video_url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><Video className="h-4 w-4 mr-1" /> Vídeo</Button></a>}
                </div>
              </div>
              <EntityEditButton entityType="boardgame" title="Editar Jogo" widthClass="sm:max-w-2xl" size="sm" label="Editar">
                {(onClose) => (
                  <div className="space-y-4">
                    <GameForm game={game} onSuccess={() => { onClose(); invalidate(); }} />
                    <Button variant="destructive" size="sm" className="w-full" onClick={async () => {
                      if (!confirm("Tem certeza que deseja excluir este jogo?")) return;
                      const { error } = await supabase.from("games").delete().eq("id", game.id);
                      if (error) return notify("error", error.message);
                      notify("success", "Jogo excluído!");
                      navigate("/games");
                    }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Excluir Jogo
                    </Button>
                  </div>
                )}
              </EntityEditButton>
            </div>
          </div>
        </div>
      </div>

      <div className="container space-y-6">
        <GameStatsCarousel stats={stats} personalStats={personalStats} detailedStats={detailedStats} isLoggedIn={!!user} slide={slide} setSlide={setSlide} playerCounts={playerCounts} detailPlayerCount={detailPlayerCount} setDetailPlayerCount={setDetailPlayerCount} />

        <div className="grid gap-6 lg:grid-cols-2">
          {monthlyData.some((d) => d.count > 0) && (
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-4">Atividade (6 meses)</h2>
                <ChartContainer config={chartConfig} className="h-[200px] w-full mx-auto">
                  <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
          {leaderboard.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-4">Leaderboard</h2>
                <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Jogador</TableHead><TableHead className="text-center">V</TableHead><TableHead className="text-center">%</TableHead><TableHead className="text-center">Rec.</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {leaderboard.map((r, i) => (
                        <TableRow key={r.player_id}>
                          <TableCell><Badge variant={i < 3 ? "default" : "secondary"} className={i === 0 ? "bg-gold text-black" : ""}>{i + 1}</Badge></TableCell>
                          <TableCell className="font-medium"><Link to={`/perfil/${r.player_name}`} className="hover:text-gold transition-colors">{r.player_name}</Link></TableCell>
                          <TableCell className="text-center">{r.wins}/{r.games}</TableCell>
                          <TableCell className="text-center">{r.winPct}%</TableCell>
                          <TableCell className="text-center font-bold text-gold">{r.best}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <GameMatchHistory allHistory={allHistory} uniquePlayers={uniquePlayers} gameId={game.id} onSaved={invalidate} />
      </div>
    </div>
  );
};

export default GameDetail;
