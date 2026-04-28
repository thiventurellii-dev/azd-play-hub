import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ExternalLink, Video, ArrowLeft, Users, Clock, Trash2, Trophy, TrendingUp, Target, Hash, Flame, Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { EntityEditButton } from "@/components/shared/EntityEditButton";
import GameForm from "@/components/forms/GameForm";
import GameMatchHistory from "@/components/games/GameMatchHistory";
import { useGameDetail } from "@/hooks/useGameDetail";
import { useQueryClient } from "@tanstack/react-query";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { SeasonStatsPanel } from "@/components/seasons/SeasonStatsPanel";
import { GamePersonalStatsPanel } from "@/components/games/GamePersonalStatsPanel";
import type { MatchRecord } from "@/types/database";

const HighlightCard = ({ title, items, suffix = "" }: { title: string; items: { id: string; name: string; avatar_url?: string | null; value: number | string }[]; suffix?: string }) => (
  <Card className="bg-card border-border">
    <CardContent className="py-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={it.id || i} className="flex items-center justify-between gap-2 text-sm min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-muted-foreground text-xs w-3 flex-shrink-0">{i + 1}</span>
                <Avatar className="h-5 w-5 flex-shrink-0">
                  {it.avatar_url && <AvatarImage src={it.avatar_url} alt={it.name} />}
                  <AvatarFallback className="text-[9px] bg-secondary">{it.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate min-w-0">{it.name}</span>
              </div>
              <span className="font-bold text-gold flex-shrink-0">{it.value}{suffix}</span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const GameDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGameDetail(slug);

  const game = data?.game;
  const tags = data?.tags || [];
  const allMatches = data?.matches || [];
  const allResults = data?.results || [];
  const pMap = data?.playerMap || {};
  const aMap = (data as any)?.avatarMap || {};

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["game-detail", slug] });

  // KPIs
  const kpis = useMemo(() => {
    if (allResults.length === 0) return { totalMatches: 0, avgScore: 0, highScore: 0, highScorePlayer: "—", worstWinScore: 0 };
    const scores = allResults.map((r: any) => r.score || 0);
    const winnerScores = allResults.filter((r: any) => r.position === 1).map((r: any) => r.score || 0);
    const highScore = Math.max(...scores);
    const highScoreResult = allResults.find((r: any) => (r.score || 0) === highScore);
    const worstWin = winnerScores.length > 0 ? Math.min(...winnerScores) : 0;
    const avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
    return {
      totalMatches: allMatches.length,
      avgScore,
      highScore,
      highScorePlayer: highScoreResult ? pMap[highScoreResult.player_id] || "?" : "—",
      worstWinScore: worstWin,
    };
  }, [allResults, allMatches, pMap]);

  // Activity over time (last 6 months)
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
    }
    for (const m of allMatches) {
      const key = m.played_at.slice(0, 7);
      if (key in months) months[key]++;
    }
    return Object.entries(months).map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short" }),
      count,
    }));
  }, [allMatches]);

  // Highlights (top players)
  const highlights = useMemo(() => {
    const ps: Record<string, { wins: number; games: number; bestStreak: number; currentStreak: number }> = {};
    // Build chronological order to compute streaks
    const matchesAsc = [...allMatches].sort((a, b) => a.played_at.localeCompare(b.played_at));
    const resByMatch: Record<string, any[]> = {};
    for (const r of allResults) {
      (resByMatch[r.match_id] = resByMatch[r.match_id] || []).push(r);
    }
    const streaks: Record<string, { temp: number; best: number }> = {};
    for (const m of matchesAsc) {
      const rs = resByMatch[m.id] || [];
      for (const r of rs) {
        if (!ps[r.player_id]) ps[r.player_id] = { wins: 0, games: 0, bestStreak: 0, currentStreak: 0 };
        ps[r.player_id].games++;
        if (!streaks[r.player_id]) streaks[r.player_id] = { temp: 0, best: 0 };
        if (r.position === 1) {
          ps[r.player_id].wins++;
          streaks[r.player_id].temp++;
          if (streaks[r.player_id].temp > streaks[r.player_id].best) streaks[r.player_id].best = streaks[r.player_id].temp;
        } else {
          streaks[r.player_id].temp = 0;
        }
      }
    }
    const arr = Object.entries(ps).map(([pid, s]) => ({
      id: pid,
      name: pMap[pid] || "?",
      avatar_url: aMap[pid] || null,
      wins: s.wins,
      games: s.games,
      winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
      bestStreak: streaks[pid]?.best || 0,
    }));
    const mostWins = [...arr].sort((a, b) => b.wins - a.wins).slice(0, 5).map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url, value: p.wins }));
    const topWinRate = [...arr].filter((p) => p.games >= 3).sort((a, b) => b.winPct - a.winPct).slice(0, 5).map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url, value: p.winPct }));
    const mostGames = [...arr].sort((a, b) => b.games - a.games).slice(0, 5).map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url, value: p.games }));
    const longestStreak = [...arr].sort((a, b) => b.bestStreak - a.bestStreak).slice(0, 5).map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url, value: p.bestStreak }));
    return { mostWins, topWinRate, mostGames, longestStreak };
  }, [allMatches, allResults, pMap, aMap]);

  // History formatted for GameMatchHistory
  const allHistory = useMemo(() => {
    return allMatches.map((m: any) => ({
      ...m,
      results: allResults
        .filter((r: any) => r.match_id === m.id)
        .sort((a: any, b: any) => a.position - b.position)
        .map((r: any) => ({ ...r, player_name: pMap[r.player_id] || "?" })),
    }));
  }, [allMatches, allResults, pMap]);

  const uniquePlayers = useMemo(
    () => Object.entries(pMap).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    [pMap],
  );

  // Build MatchRecord[] for SeasonStatsPanel
  const statsMatches: MatchRecord[] = useMemo(() => {
    return allMatches.map((m: any) => ({
      id: m.id,
      played_at: m.played_at,
      duration_minutes: m.duration_minutes ?? null,
      image_url: m.image_url ?? null,
      first_player_id: m.first_player_id ?? null,
      game_name: game?.name || "",
      game_id: game?.id || "",
      platform: m.platform ?? null,
      results: allResults
        .filter((r: any) => r.match_id === m.id)
        .sort((a: any, b: any) => a.position - b.position)
        .map((r: any) => ({
          player_name: pMap[r.player_id] || "?",
          player_id: r.player_id,
          position: r.position,
          seat_position: r.seat_position ?? null,
          score: r.score || 0,
          mmr_change: r.mmr_change || 0,
          mmr_before: r.mmr_before || 1000,
          mmr_after: r.mmr_after || 1000,
          faction: r.faction || null,
        })) as any,
    }));
  }, [allMatches, allResults, pMap, game]);

  // Synthetic rankings for SeasonStatsPanel (it uses these for top winners / win rate cards)
  const statsRankings = useMemo(() => {
    const ps: Record<string, { games: number; wins: number }> = {};
    for (const r of allResults as any[]) {
      if (!r.player_id) continue;
      if (!ps[r.player_id]) ps[r.player_id] = { games: 0, wins: 0 };
      ps[r.player_id].games++;
      if (r.position === 1) ps[r.player_id].wins++;
    }
    return Object.entries(ps).map(([pid, s]) => ({
      player_id: pid,
      current_mmr: 1000,
      games_played: s.games,
      wins: s.wins,
      player_name: pMap[pid] || "?",
      avatar_url: aMap[pid] || null,
    }));
  }, [allResults, pMap, aMap]);

  const hasFactions = useMemo(() => {
    if (!game) return false;
    const f = (game as any).factions;
    return Array.isArray(f) && f.length > 0;
  }, [game]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }
  if (!game) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Jogo não encontrado</h1>
        <Link to="/games"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button></Link>
      </div>
    );
  }

  const chartConfig = { count: { label: "Partidas", color: "hsl(var(--gold))" } };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden">
        {game.image_url ? (
          <img src={game.image_url} alt={game.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-secondary to-card flex items-center justify-center">
            <span className="text-8xl font-bold text-gold/20">{game.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="container">
            <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Jogos
            </Link>
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{game.name}</h1>
                  <FavoriteButton entityType="game" entityId={game.id} size="md" />
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  {(game.min_players || game.max_players) && (
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {game.min_players || "?"}–{game.max_players || "?"} jogadores</span>
                  )}
                  {(() => {
                    const wd = allMatches.filter((m: any) => m.duration_minutes);
                    if (wd.length > 0) {
                      const avg = Math.round(wd.reduce((s: number, m: any) => s + m.duration_minutes, 0) / wd.length);
                      return <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> ~{avg} min</span>;
                    }
                    return null;
                  })()}
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
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-xl mx-auto">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="matches">Partidas</TabsTrigger>
            <TabsTrigger value="personal">Estatísticas pessoais</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card border-border"><CardContent className="pt-6 text-center"><Trophy className="h-8 w-8 mx-auto text-gold mb-2" /><p className="text-2xl font-bold text-gold">{kpis.highScore}</p><p className="text-xs text-muted-foreground">Maior Pontuação</p><p className="text-xs font-medium mt-1">{kpis.highScorePlayer}</p></CardContent></Card>
              <Card className="bg-card border-border"><CardContent className="pt-6 text-center"><TrendingUp className="h-8 w-8 mx-auto text-gold mb-2" /><p className="text-2xl font-bold">{kpis.avgScore}</p><p className="text-xs text-muted-foreground">Pontuação Média</p></CardContent></Card>
              <Card className="bg-card border-border"><CardContent className="pt-6 text-center"><Target className="h-8 w-8 mx-auto text-gold mb-2" /><p className="text-2xl font-bold">{kpis.worstWinScore}</p><p className="text-xs text-muted-foreground">Pior Pontuação Vencedora</p></CardContent></Card>
              <Card className="bg-card border-border"><CardContent className="pt-6 text-center"><Hash className="h-8 w-8 mx-auto text-gold mb-2" /><p className="text-2xl font-bold">{kpis.totalMatches}</p><p className="text-xs text-muted-foreground">Total de Partidas</p></CardContent></Card>
            </div>

            {/* Destaques */}
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Destaques</h3>
                <p className="text-xs text-muted-foreground">Jogadores que mais se destacaram neste jogo</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <HighlightCard title="Mais vitórias" items={highlights.mostWins} />
                <HighlightCard title="Maior win rate" items={highlights.topWinRate} suffix="%" />
                <HighlightCard title="Mais partidas" items={highlights.mostGames} />
                <HighlightCard title="Maior sequência de vitórias" items={highlights.longestStreak} />
              </div>
            </div>

            {/* Atividade */}
            {monthlyData.some((d) => d.count > 0) && (
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <h3 className="text-base font-semibold">Atividade ao longo do tempo</h3>
                  <p className="text-xs text-muted-foreground mb-4">Número de partidas por mês</p>
                  <ChartContainer config={chartConfig} className="h-[220px] w-full mx-auto">
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

            {/* Estatísticas detalhadas (reaproveita SeasonStatsPanel) */}
            {statsMatches.length > 0 && (
              <SeasonStatsPanel
                isBlood={false}
                matches={statsMatches}
                bloodMatches={[]}
                rankings={statsRankings as any}
                bloodRankings={[]}
                hasFactions={hasFactions}
              />
            )}
          </TabsContent>

          {/* MATCHES */}
          <TabsContent value="matches" className="mt-6">
            <GameMatchHistory allHistory={allHistory} uniquePlayers={uniquePlayers} gameId={game.id} onSaved={invalidate} />
          </TabsContent>

          {/* PERSONAL */}
          <TabsContent value="personal" className="mt-6">
            <GamePersonalStatsPanel matches={allMatches} results={allResults} playerMap={pMap} avatarMap={aMap} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GameDetail;
