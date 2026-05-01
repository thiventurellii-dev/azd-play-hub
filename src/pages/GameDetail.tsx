import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ExternalLink, Video, ArrowLeft, Users, Clock, Trash2, Hash,
  Trophy, ChevronDown, ChevronUp, Flag, Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { EntityEditButton } from "@/components/shared/EntityEditButton";
import GameForm from "@/components/forms/GameForm";
import { useGameDetail } from "@/hooks/useGameDetail";
import { useQueryClient } from "@tanstack/react-query";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { SeasonStatsPanel } from "@/components/seasons/SeasonStatsPanel";
import { GamePersonalStatsPanel } from "@/components/games/GamePersonalStatsPanel";
import GameAchievements from "@/components/games/GameAchievements";
import { EditActionButton } from "@/components/shared/EditActionButton";
import { DateBlock } from "@/components/shared/DateBlock";
import EditMatchDialog from "@/components/matches/EditMatchDialog";
import type { MatchRecord } from "@/types/database";

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

  // Activity over time — todos os 12 meses do ano corrente (jan→dez)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const months: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(year, i, 1);
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

  const uniquePlayers = useMemo(
    () => Object.entries(pMap).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    [pMap],
  );

  // Build MatchRecord[] for SeasonStatsPanel + match list
  const statsMatches: MatchRecord[] = useMemo(() => {
    return allMatches.map((m: any) => ({
      id: m.id,
      played_at: m.played_at,
      duration_minutes: m.duration_minutes ?? null,
      image_url: m.image_url ?? null,
      first_player_id: m.first_player_id ?? null,
      season_id: m.season_id ?? null,
      game_name: game?.name || "",
      game_id: game?.id || "",
      platform: m.platform ?? null,
      results: allResults
        .filter((r: any) => r.match_id === m.id)
        .sort((a: any, b: any) => a.position - b.position)
        .map((r: any) => ({
          id: r.id,
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
    })) as any;
  }, [allMatches, allResults, pMap, game]);

  // Synthetic rankings for SeasonStatsPanel cards
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

  // ===== Match list filters (Season-style) =====
  const [timeFilter, setTimeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [editMatch, setEditMatch] = useState<any>(null);
  const [editMatchOpen, setEditMatchOpen] = useState(false);

  const filteredMatches = useMemo(() => {
    let h = [...statsMatches];
    const now = new Date();
    if (timeFilter === "3m") h = h.filter((m) => new Date(m.played_at) >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()));
    else if (timeFilter === "6m") h = h.filter((m) => new Date(m.played_at) >= new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()));
    else if (timeFilter === "1y") h = h.filter((m) => new Date(m.played_at) >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    if (typeFilter === "competitive") h = h.filter((m: any) => !!m.season_id);
    else if (typeFilter === "casual") h = h.filter((m: any) => !m.season_id);
    if (playerFilter !== "all") h = h.filter((m) => m.results.some((r: any) => r.player_id === playerFilter));
    return h.sort((a, b) => b.played_at.localeCompare(a.played_at));
  }, [statsMatches, timeFilter, typeFilter, playerFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / pageSize));
  const pagedMatches = filteredMatches.slice(page * pageSize, (page + 1) * pageSize);

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
  const totalMatches = allMatches.length;
  const avgDuration = (() => {
    const wd = allMatches.filter((m: any) => m.duration_minutes);
    if (!wd.length) return null;
    return Math.round(wd.reduce((s: number, m: any) => s + m.duration_minutes, 0) / wd.length);
  })();

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
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{game.name}</h1>
                  <FavoriteButton entityType="game" entityId={game.id} size="md" />
                  <Badge variant="outline" className="ml-1 gap-1 border-gold/40 text-gold">
                    <Hash className="h-3 w-3" /> {totalMatches} {totalMatches === 1 ? "partida" : "partidas"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  {(game.min_players || game.max_players) && (
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {game.min_players || "?"}–{game.max_players || "?"} jogadores</span>
                  )}
                  {avgDuration !== null && (
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> ~{avgDuration} min</span>
                  )}
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
            {/* KPI banner — métricas que NÃO se repetem em "Estatísticas do jogo" */}
            {totalMatches > 0 && (() => {
              const uniquePlayersCount = Object.keys(pMap).length;
              const longestStreakValue = highlights.longestStreak[0]?.value ?? 0;
              const longestStreakName = highlights.longestStreak[0]?.name ?? "—";
              const lastDate = [...allMatches].sort((a, b) => b.played_at.localeCompare(a.played_at))[0]?.played_at;
              const lastLabel = lastDate ? new Date(lastDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—";
              return (
                <Card className="bg-card border-border">
                  <CardContent className="py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-border">
                      <div className="flex items-center gap-3 px-2">
                        <Trophy className="h-7 w-7 text-gold flex-shrink-0" />
                        <div>
                          <p className="text-xl font-bold leading-none tabular-nums">{totalMatches}</p>
                          <p className="text-xs text-muted-foreground mt-1">Total de Partidas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-2 pt-4 md:pt-0">
                        <Users className="h-7 w-7 text-gold flex-shrink-0" />
                        <div>
                          <p className="text-xl font-bold leading-none tabular-nums">{uniquePlayersCount}</p>
                          <p className="text-xs text-muted-foreground mt-1">Jogadores únicos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-2 pt-4 md:pt-0">
                        <span className="text-2xl flex-shrink-0">🔥</span>
                        <div className="min-w-0">
                          <p className="text-xl font-bold leading-none tabular-nums">{longestStreakValue}</p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">Maior sequência {longestStreakValue > 0 ? `· ${longestStreakName}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-2 pt-4 md:pt-0">
                        <Calendar className="h-7 w-7 text-gold flex-shrink-0" />
                        <div>
                          <p className="text-xl font-bold leading-none capitalize">{lastLabel}</p>
                          <p className="text-xs text-muted-foreground mt-1">Última partida</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Estatísticas detalhadas (reaproveita SeasonStatsPanel) */}
            {statsMatches.length > 0 && (
              <SeasonStatsPanel
                isBlood={false}
                matches={statsMatches}
                bloodMatches={[]}
                rankings={statsRankings as any}
                bloodRankings={[]}
                hasFactions={hasFactions}
                title="Estatísticas do jogo"
              />
            )}

            {/* Atividade — agora no final */}
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

            {game && <GameAchievements gameId={game.id} gameName={game.name} />}
          </TabsContent>

          {/* MATCHES — Season-style */}
          <TabsContent value="matches" className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={timeFilter} onValueChange={(v) => { setTimeFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o tempo</SelectItem>
                  <SelectItem value="1y">1 ano</SelectItem>
                  <SelectItem value="6m">6 meses</SelectItem>
                  <SelectItem value="3m">3 meses</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="competitive">Competitivas</SelectItem>
                  <SelectItem value="casual">Casuais</SelectItem>
                </SelectContent>
              </Select>
              <Select value={playerFilter} onValueChange={(v) => { setPlayerFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Jogador..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os jogadores</SelectItem>
                  {uniquePlayers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(0); }}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5/pág</SelectItem>
                  <SelectItem value="10">10/pág</SelectItem>
                  <SelectItem value="20">20/pág</SelectItem>
                </SelectContent>
              </Select>
              {(timeFilter !== "all" || typeFilter !== "all" || playerFilter !== "all") && (
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => { setTimeFilter("all"); setTypeFilter("all"); setPlayerFilter("all"); setPage(0); }}>
                  ✕ Limpar filtros
                </Button>
              )}
            </div>

            {filteredMatches.length === 0 ? (
              <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma partida registrada.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {pagedMatches.map((m: any) => {
                  const isExpanded = expandedMatch === m.id;
                  const winner = m.results.find((r: any) => r.position === 1);
                  const isCompetitive = !!m.season_id;
                  return (
                    <Card key={m.id} className="bg-card border-border hover:border-gold/20 transition-colors cursor-pointer"
                      onClick={() => setExpandedMatch(isExpanded ? null : m.id)}>
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <DateBlock date={m.played_at} />
                          <div className="flex-1 min-w-0 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <Badge variant="outline">{game.name}</Badge>
                              {isCompetitive ? (
                                <Badge variant="outline" className="text-xs border-gold/40 text-gold">Competitiva</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Casual</Badge>
                              )}
                              {winner && <span className="text-sm font-medium text-gold flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /> {winner.player_name}</span>}
                              {m.duration_minutes && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {m.duration_minutes} min
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[11px] text-muted-foreground tabular-nums">{new Date(m.played_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                              <EditActionButton entityType="match" onClick={() => { setEditMatch(m); setEditMatchOpen(true); }} />
                              <button
                                type="button"
                                className="text-muted-foreground"
                                onClick={() => setExpandedMatch(isExpanded ? null : m.id)}
                                aria-label={isExpanded ? "Recolher" : "Expandir"}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="space-y-2 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                            {m.image_url && (
                              <div className="rounded-lg overflow-hidden border border-border">
                                <img src={m.image_url} alt="Partida" className="w-full h-48 object-cover" />
                              </div>
                            )}
                            {m.results.map((r: any, i: number) => (
                              <motion.div
                                key={r.id || i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center gap-3 text-sm p-2 rounded-lg bg-secondary/30"
                              >
                                <Badge variant={r.position === 1 ? "default" : "secondary"} className={`w-8 justify-center ${r.position === 1 ? "bg-gold text-black" : ""}`}>{r.position}º</Badge>
                                <Avatar className="h-5 w-5 flex-shrink-0">
                                  {aMap[r.player_id] && <AvatarImage src={aMap[r.player_id] || undefined} alt={r.player_name} />}
                                  <AvatarFallback className="text-[9px] bg-secondary">{r.player_name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="flex-1 font-medium flex items-center gap-1 min-w-0 truncate">
                                  {r.player_name}
                                  {r.player_id === m.first_player_id && <Flag className="h-3.5 w-3.5 text-gold ml-1" />}
                                </span>
                                <span className="text-muted-foreground">{r.score} pts</span>
                                {isCompetitive && (
                                  <span className={`text-xs font-medium ${r.mmr_change >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {r.mmr_change >= 0 ? "+" : ""}{Number(r.mmr_change).toFixed(2)} MMR
                                  </span>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Anterior</Button>
                <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Próxima</Button>
              </div>
            )}

            <EditMatchDialog
              open={editMatchOpen}
              onOpenChange={setEditMatchOpen}
              match={editMatch ? {
                id: editMatch.id,
                played_at: editMatch.played_at,
                duration_minutes: editMatch.duration_minutes,
                season_id: editMatch.season_id,
                game_id: game.id,
                results: editMatch.results?.map((r: any) => ({
                  id: r.id, player_id: r.player_id, player_name: r.player_name,
                  position: r.position, score: r.score || 0, is_first: false,
                })) || [],
              } : null}
              onSaved={invalidate}
            />
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
