import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Trophy,
  TrendingUp,
  Target,
  ExternalLink,
  Video,
  ArrowLeft,
  Users,
  Hash,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import EditMatchDialog from "@/components/matches/EditMatchDialog";

interface GameData {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  rules_url: string | null;
  video_url: string | null;
  min_players: number | null;
  max_players: number | null;
  factions: any;
}

const positionColors: Record<number, string> = {
  1: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  2: "bg-gray-400/15 text-gray-300 border-gray-400/30",
  3: "bg-amber-700/15 text-amber-500 border-amber-700/30",
};

const GameDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { notify } = useNotification();

  const [game, setGame] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMatches: 0,
    avgScore: 0,
    highScore: 0,
    highScorePlayer: "",
    worstWinScore: 0,
  });
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [pMap, setPMap] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<string[]>([]);

  // Carousel slide: 0=personal, 1=general, 2=detailed
  const [slide, setSlide] = useState(1);

  // Filters
  const [timeFilter, setTimeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  // Detailed stats filter
  const [detailPlayerCount, setDetailPlayerCount] = useState("all");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editRulesUrl, setEditRulesUrl] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editMinPlayers, setEditMinPlayers] = useState("");
  const [editMaxPlayers, setEditMaxPlayers] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editFactions, setEditFactions] = useState("");
  const [editCategories, setEditCategories] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Edit match state
  const [editMatchOpen, setEditMatchOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<any>(null);
  const [editMatchDate, setEditMatchDate] = useState("");
  const [editMatchDuration, setEditMatchDuration] = useState("");
  const [editMatchResults, setEditMatchResults] = useState<any[]>([]);
  const [savingMatch, setSavingMatch] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      const { data } = await supabase
        .from("games")
        .select("*")
        .eq("slug", slug as string)
        .maybeSingle();
      if (!data) {
        setLoading(false);
        return;
      }
      const gameData = data as any;
      setGame(gameData as GameData);

      // Fetch tags
      const { data: tagLinks } = await supabase.from("game_tag_links").select("tag_id").eq("game_id", gameData.id);
      if (tagLinks && tagLinks.length > 0) {
        const tagIds = tagLinks.map((t: any) => t.tag_id);
        const { data: tagData } = await supabase.from("game_tags").select("name").in("id", tagIds);
        setTags((tagData || []).map((t: any) => t.name));
      }

      const { data: matches } = await supabase
        .from("matches")
        .select("id, played_at, duration_minutes, season_id")
        .eq("game_id", gameData.id)
        .order("played_at", { ascending: false });
      const matchIds = (matches || []).map((m) => m.id);
      setAllMatches(matches || []);

      if (matchIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: results } = await supabase.from("match_results").select("*").in("match_id", matchIds);
      setAllResults(results || []);
      const playerIds = [...new Set((results || []).map((r) => r.player_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name, nickname").in("id", playerIds);
      const playerMap: Record<string, string> = {};
      for (const p of profiles || []) playerMap[p.id] = (p as any).nickname || p.name;
      setPMap(playerMap);

      // Stats
      const scores = (results || []).map((r) => r.score || 0);
      const winnerScores = (results || []).filter((r) => r.position === 1).map((r) => r.score || 0);
      const highScore = scores.length > 0 ? Math.max(...scores) : 0;
      const highScoreResult = (results || []).find((r) => (r.score || 0) === highScore);
      const worstWin = winnerScores.length > 0 ? Math.min(...winnerScores) : 0;
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      setStats({
        totalMatches: matchIds.length,
        avgScore,
        highScore,
        highScorePlayer: highScoreResult ? playerMap[highScoreResult.player_id] || "?" : "—",
        worstWinScore: worstWin,
      });

      // Monthly activity
      const months: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months[key] = 0;
      }
      for (const m of matches || []) {
        const key = m.played_at.slice(0, 7);
        if (key in months) months[key]++;
      }
      setMonthlyData(
        Object.entries(months).map(([month, count]) => ({
          month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short" }),
          count,
        })),
      );

      // Leaderboard
      const playerStats: Record<string, { wins: number; games: number; totalScore: number; best: number }> = {};
      for (const r of results || []) {
        if (!playerStats[r.player_id]) playerStats[r.player_id] = { wins: 0, games: 0, totalScore: 0, best: 0 };
        playerStats[r.player_id].games++;
        playerStats[r.player_id].totalScore += r.score || 0;
        playerStats[r.player_id].best = Math.max(playerStats[r.player_id].best, r.score || 0);
        if (r.position === 1) playerStats[r.player_id].wins++;
      }
      const lb = Object.entries(playerStats)
        .map(([pid, s]) => ({
          player_id: pid,
          player_name: playerMap[pid] || "?",
          wins: s.wins,
          games: s.games,
          winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
          avgScore: s.games > 0 ? Math.round(s.totalScore / s.games) : 0,
          best: s.best,
        }))
        .sort((a, b) => b.wins - a.wins || b.winPct - a.winPct);
      setLeaderboard(lb);

      // History
      const hist = (matches || []).map((m) => ({
        ...m,
        results: (results || [])
          .filter((r) => r.match_id === m.id)
          .sort((a, b) => a.position - b.position)
          .map((r) => ({ ...r, player_name: playerMap[r.player_id] || "?" })),
      }));
      setAllHistory(hist);
      setLoading(false);
    };
    fetchGame();
  }, [slug]);

  // Filtered history
  const filteredHistory = useMemo(() => {
    let h = [...allHistory];
    const now = new Date();
    if (timeFilter === "3m")
      h = h.filter((m) => new Date(m.played_at) >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()));
    else if (timeFilter === "6m")
      h = h.filter((m) => new Date(m.played_at) >= new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()));
    else if (timeFilter === "1y")
      h = h.filter((m) => new Date(m.played_at) >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    if (typeFilter === "competitive") h = h.filter((m) => m.season_id);
    else if (typeFilter === "casual") h = h.filter((m) => !m.season_id);
    if (playerFilter) h = h.filter((m) => m.results.some((r: any) => r.player_id === playerFilter));
    return h;
  }, [allHistory, timeFilter, typeFilter, playerFilter]);

  const totalPages = Math.ceil(filteredHistory.length / pageSize);
  const pagedHistory = filteredHistory.slice(page * pageSize, (page + 1) * pageSize);

  // Personal stats for logged-in user
  const personalStats = useMemo(() => {
    if (!user || allResults.length === 0) return null;
    const myResults = allResults.filter((r) => r.player_id === user.id);
    if (myResults.length === 0) return null;
    const wins = myResults.filter((r) => r.position === 1).length;
    const scores = myResults.map((r) => r.score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Win streaks
    const matchDates = allMatches.map((m) => m.id);
    const sortedResults = matchDates.map((mid) => myResults.find((r) => r.match_id === mid)).filter(Boolean);
    let currentStreak = 0,
      bestStreak = 0,
      tempStreak = 0;
    for (const r of sortedResults) {
      if (r!.position === 1) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    currentStreak = tempStreak;

    return {
      games: myResults.length,
      wins,
      winPct: myResults.length > 0 ? Math.round((wins / myResults.length) * 100) : 0,
      avgScore,
      currentStreak,
      bestStreak,
    };
  }, [user, allResults, allMatches]);

  // Detailed stats
  const detailedStats = useMemo(() => {
    if (allResults.length === 0 || allMatches.length === 0) return null;

    // Filter by player count
    let matchIds = allMatches.map((m) => m.id);
    const matchPlayerCounts: Record<string, number> = {};
    for (const r of allResults) {
      matchPlayerCounts[r.match_id] = (matchPlayerCounts[r.match_id] || 0) + 1;
    }
    if (detailPlayerCount !== "all") {
      const n = parseInt(detailPlayerCount);
      matchIds = matchIds.filter((mid) => matchPlayerCounts[mid] === n);
    }
    const filteredResults = allResults.filter((r) => matchIds.includes(r.match_id));
    if (filteredResults.length === 0) return null;

    // Faction stats
    const factionStats: Record<string, { games: number; wins: number }> = {};
    for (const r of filteredResults) {
      if (!r.faction) continue;
      if (!factionStats[r.faction]) factionStats[r.faction] = { games: 0, wins: 0 };
      factionStats[r.faction].games++;
      if (r.position === 1) factionStats[r.faction].wins++;
    }

    // Seat position stats
    const seatStats: Record<number, { games: number; wins: number }> = {};
    for (const r of filteredResults) {
      const seat = r.seat_position || 0;
      if (seat === 0) continue;
      if (!seatStats[seat]) seatStats[seat] = { games: 0, wins: 0 };
      seatStats[seat].games++;
      if (r.position === 1) seatStats[seat].wins++;
    }

    return {
      totalMatches: matchIds.length,
      factions: Object.entries(factionStats)
        .map(([name, s]) => ({
          name,
          games: s.games,
          winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
        }))
        .sort((a, b) => b.games - a.games),
      seats: Object.entries(seatStats)
        .map(([seat, s]) => ({
          seat: parseInt(seat),
          games: s.games,
          winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
        }))
        .sort((a, b) => a.seat - b.seat),
    };
  }, [allResults, allMatches, detailPlayerCount]);

  // Unique player counts for filter
  const playerCounts = useMemo(() => {
    const counts = new Set<number>();
    const matchPlayerCounts: Record<string, number> = {};
    for (const r of allResults) {
      matchPlayerCounts[r.match_id] = (matchPlayerCounts[r.match_id] || 0) + 1;
    }
    Object.values(matchPlayerCounts).forEach((c) => counts.add(c));
    return [...counts].sort((a, b) => a - b);
  }, [allResults]);

  // Unique players for filter
  const uniquePlayers = useMemo(() => {
    return Object.entries(pMap)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pMap]);

  const generateKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
  const addCategory = () => setEditCategories([...editCategories, { key: '', label: '', type: 'number' }]);
  const removeCategory = (i: number) => setEditCategories(editCategories.filter((_, idx) => idx !== i));
  const updateCategory = (i: number, label: string) => {
    const cats = [...editCategories]; cats[i] = { ...cats[i], label, key: generateKey(label) }; setEditCategories(cats);
  };
  const addSubcategory = (catIdx: number) => {
    const cats = [...editCategories]; const sub = cats[catIdx].subcategories || [];
    cats[catIdx] = { ...cats[catIdx], type: 'group', subcategories: [...sub, { key: '', label: '', type: 'number' }] }; setEditCategories(cats);
  };
  const removeSubcategory = (catIdx: number, subIdx: number) => {
    const cats = [...editCategories]; cats[catIdx].subcategories = cats[catIdx].subcategories?.filter((_: any, i: number) => i !== subIdx); setEditCategories(cats);
  };
  const updateSubcategory = (catIdx: number, subIdx: number, label: string) => {
    const cats = [...editCategories];
    if (cats[catIdx].subcategories) { cats[catIdx].subcategories[subIdx] = { ...cats[catIdx].subcategories[subIdx], label, key: generateKey(label) }; }
    setEditCategories(cats);
  };

  const openEditDialog = async () => {
    if (!game) return;
    setEditName(game.name);
    setEditImageUrl(game.image_url || "");
    setEditRulesUrl(game.rules_url || "");
    setEditVideoUrl(game.video_url || "");
    setEditMinPlayers(game.min_players ? String(game.min_players) : "");
    setEditMaxPlayers(game.max_players ? String(game.max_players) : "");
    setEditSlug(game.slug || "");
    if (Array.isArray(game.factions)) {
      setEditFactions(game.factions.map((f: any) => typeof f === 'string' ? f : f.name || '').filter(Boolean).join(', '));
    } else {
      setEditFactions('');
    }
    const { data: schemaData } = await supabase.from('game_scoring_schemas').select('schema').eq('game_id', game.id).maybeSingle();
    setEditCategories((schemaData?.schema as any)?.categories || []);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!game) return;
    let factions = null;
    if (editFactions.trim()) {
      factions = editFactions.split(',').map(f => f.trim()).filter(Boolean);
    }
    const { error } = await supabase
      .from("games")
      .update({
        name: editName,
        image_url: editImageUrl || null,
        rules_url: editRulesUrl || null,
        video_url: editVideoUrl || null,
        min_players: editMinPlayers ? parseInt(editMinPlayers) : null,
        max_players: editMaxPlayers ? parseInt(editMaxPlayers) : null,
        slug: editSlug || null,
        factions,
      })
      .eq("id", game.id);
    if (error) return notify("error", error.message);

    // Save scoring schema
    const schemaPayload = { categories: editCategories };
    const { data: existing } = await supabase.from('game_scoring_schemas').select('id').eq('game_id', game.id).maybeSingle();
    if (existing) {
      await supabase.from('game_scoring_schemas').update({ schema: schemaPayload as any }).eq('id', existing.id);
    } else if (editCategories.length > 0) {
      await supabase.from('game_scoring_schemas').insert({ game_id: game.id, schema: schemaPayload as any });
    }

    notify("success", "Jogo atualizado!");
    setEditOpen(false);
    setGame({
      ...game,
      name: editName,
      image_url: editImageUrl || null,
      rules_url: editRulesUrl || null,
      video_url: editVideoUrl || null,
      min_players: editMinPlayers ? parseInt(editMinPlayers) : null,
      max_players: editMaxPlayers ? parseInt(editMaxPlayers) : null,
      slug: editSlug || null,
      factions,
    });
  };

  const handleDeleteGame = async () => {
    if (!game) return;
    if (!confirm("Tem certeza que deseja excluir este jogo? Esta ação não pode ser desfeita.")) return;
    setDeleting(true);
    const { error } = await supabase.from("games").delete().eq("id", game.id);
    if (error) {
      notify("error", error.message);
      setDeleting(false);
      return;
    }
    notify("success", "Jogo excluído!");
    navigate("/games");
  };

  if (loading) {
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
        <Link to="/games">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const chartConfig = { count: { label: "Partidas", color: "hsl(var(--gold))" } };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

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
            <Link
              to="/games"
              className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Jogos
            </Link>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{game.name}</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  {(game.min_players || game.max_players) && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" /> {game.min_players || "?"}–{game.max_players || "?"} jogadores
                    </span>
                  )}
                  {(() => {
                    const withDuration = allMatches.filter(m => m.duration_minutes);
                    if (withDuration.length > 0) {
                      const avg = Math.round(withDuration.reduce((s, m) => s + m.duration_minutes, 0) / withDuration.length);
                      return (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" /> ~{avg} min
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {tags.length > 0 &&
                    tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                </div>
                <div className="flex gap-2 mt-2">
                  {game.rules_url && (
                    <a href={game.rules_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" /> Regras
                      </Button>
                    </a>
                  )}
                  {game.video_url && (
                    <a href={game.video_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Video className="h-4 w-4 mr-1" /> Vídeo
                      </Button>
                    </a>
                  )}
                </div>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openEditDialog}
                >
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container space-y-6">
        {/* Stats Carousel */}
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="outline"
              size="icon"
              className="border-gold/30 hover:bg-gold/10 hover:border-gold/60 disabled:opacity-30"
              onClick={() => setSlide((s) => Math.max(0, s - 1))}
              disabled={slide === 0}
            >
              <ChevronLeft className="h-6 w-6 text-gold" />
            </Button>
            <h2 className="text-lg font-semibold text-center">
              {slide === 0 ? "Estatísticas Pessoais" : slide === 1 ? "Estatísticas Gerais" : "Estatísticas Detalhadas"}
            </h2>
            <Button
              variant="outline"
              size="icon"
              className="border-gold/30 hover:bg-gold/10 hover:border-gold/60 disabled:opacity-30"
              onClick={() => setSlide((s) => Math.min(2, s + 1))}
              disabled={slide === 2}
            >
              <ChevronRight className="h-6 w-6 text-gold" />
            </Button>
          </div>
          <div className="flex gap-1 justify-center mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors cursor-pointer ${i === slide ? "bg-gold" : "bg-secondary"}`}
                onClick={() => setSlide(i)}
              />
            ))}
          </div>

          <AnimatePresence mode="wait" custom={slide}>
            {slide === 1 && (
              <motion.div
                key="general"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <Card className="bg-card border-border">
                  <CardContent className="pt-6 text-center">
                    <Trophy className="h-8 w-8 mx-auto text-gold mb-2" />
                    <p className="text-2xl font-bold text-gold">{stats.highScore}</p>
                    <p className="text-xs text-muted-foreground">Maior Pontuação</p>
                    <p className="text-xs font-medium mt-1">{stats.highScorePlayer}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="pt-6 text-center">
                    <TrendingUp className="h-8 w-8 mx-auto text-gold mb-2" />
                    <p className="text-2xl font-bold">{stats.avgScore}</p>
                    <p className="text-xs text-muted-foreground">Pontuação Média</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="pt-6 text-center">
                    <Target className="h-8 w-8 mx-auto text-gold mb-2" />
                    <p className="text-2xl font-bold">{stats.worstWinScore}</p>
                    <p className="text-xs text-muted-foreground">Pior Pontuação Ganhadora</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="pt-6 text-center">
                    <Hash className="h-8 w-8 mx-auto text-gold mb-2" />
                    <p className="text-2xl font-bold">{stats.totalMatches}</p>
                    <p className="text-xs text-muted-foreground">Total de Partidas</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {slide === 0 && (
              <motion.div
                key="personal"
                custom={-1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                {personalStats ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "Partidas", value: personalStats.games },
                      { label: "Vitória", value: `${personalStats.winPct}%` },
                      { label: "Pontuação Média", value: personalStats.avgScore },
                      { label: "Maior Sequência", value: personalStats.bestStreak },
                    ].map((s, i) => (
                      <Card key={i} className="bg-card border-border">
                        <CardContent className="pt-6 text-center">
                          <p className="text-2xl font-bold">{s.value}</p>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-card border-border">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      {user ? "Você ainda não jogou este jogo." : "Faça login para ver suas estatísticas."}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {slide === 2 && (
              <motion.div
                key="detailed"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex gap-2 items-center flex-wrap">
                  <Label className="text-sm">Nº de jogadores:</Label>
                  <Select value={detailPlayerCount} onValueChange={setDetailPlayerCount}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {playerCounts.map((c) => (
                        <SelectItem key={c} value={String(c)}>
                          {c}j
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {detailedStats ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {detailedStats.factions.length > 0 && (
                      <Card className="bg-card border-border">
                        <CardContent className="pt-6">
                          <h3 className="text-sm font-semibold mb-3">% Vitória por Facção</h3>
                          <div className="space-y-2">
                            {detailedStats.factions.map((f) => (
                              <div key={f.name} className="flex items-center justify-between text-sm">
                                <span>{f.name}</span>
                                <span className="text-muted-foreground">
                                  {f.games} partidas • <span className="text-gold font-medium">{f.winPct}%</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {detailedStats.seats.length > 0 && (
                      <Card className="bg-card border-border">
                        <CardContent className="pt-6">
                          <h3 className="text-sm font-semibold mb-3">% Vitória por Posição na Mesa</h3>
                          <div className="space-y-2">
                            {detailedStats.seats.map((s) => (
                              <div key={s.seat} className="flex items-center justify-between text-sm">
                                <span>Posição {s.seat}</span>
                                <span className="text-muted-foreground">
                                  {s.games} partidas • <span className="text-gold font-medium">{s.winPct}%</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {detailedStats.factions.length === 0 && detailedStats.seats.length === 0 && (
                      <Card className="bg-card border-border md:col-span-2">
                        <CardContent className="py-8 text-center text-muted-foreground">
                          Sem dados de facções ou posições para este filtro.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card className="bg-card border-border">
                    <CardContent className="py-8 text-center text-muted-foreground">Sem dados detalhados.</CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Activity chart + Leaderboard side by side */}
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
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Jogador</TableHead>
                        <TableHead className="text-center">V</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-center">Rec.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((r, i) => (
                        <TableRow key={r.player_id}>
                          <TableCell>
                            <Badge
                              variant={i < 3 ? "default" : "secondary"}
                              className={i === 0 ? "bg-gold text-black" : ""}
                            >
                              {i + 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link to={`/perfil/${r.player_name}`} className="hover:text-gold transition-colors">
                              {r.player_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            {r.wins}/{r.games}
                          </TableCell>
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

        {/* History with filters */}
        {allHistory.length > 0 && (
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Histórico de Partidas</h2>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4 items-center">
                <Select
                  value={timeFilter}
                  onValueChange={(v) => {
                    setTimeFilter(v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o tempo</SelectItem>
                    <SelectItem value="1y">1 ano</SelectItem>
                    <SelectItem value="6m">6 meses</SelectItem>
                    <SelectItem value="3m">3 meses</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="competitive">Competitivas</SelectItem>
                    <SelectItem value="casual">Não-Competitivas</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={playerFilter}
                  onValueChange={(v) => {
                    setPlayerFilter(v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Jogador..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniquePlayers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(parseInt(v));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5/pág</SelectItem>
                    <SelectItem value="10">10/pág</SelectItem>
                    <SelectItem value="20">20/pág</SelectItem>
                  </SelectContent>
                </Select>
                {(timeFilter !== "all" || typeFilter !== "all" || (playerFilter !== "" && playerFilter !== "all")) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    onClick={() => {
                      setTimeFilter("all");
                      setTypeFilter("all");
                      setPlayerFilter("all");
                      setPage(0);
                    }}
                  >
                    <span className="text-xs">✕</span> Limpar Filtros
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {pagedHistory.map((m) => (
                  <div key={m.id} className="border border-border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(m.played_at).toLocaleDateString("pt-BR")}
                      </span>
                      <div className="flex items-center gap-2">
                        {m.season_id && (
                          <Badge variant="outline" className="text-xs">
                            Competitiva
                          </Badge>
                        )}
                        {m.duration_minutes && (
                          <span className="text-xs text-muted-foreground">{m.duration_minutes} min</span>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditMatch(m);
                              setEditMatchDate(m.played_at?.slice(0, 10) || "");
                              setEditMatchDuration(m.duration_minutes?.toString() || "");
                              setEditMatchResults(m.results.map((r: any) => ({ ...r })));
                              setEditMatchOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {m.results.map((r: any) => (
                        <Badge key={r.id} variant="outline" className={positionColors[r.position] || ""}>
                          {r.position}º {r.player_name} ({r.score || 0}pts)
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Jogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder="brass-birmingham" />
              </div>
              <div className="space-y-2">
                <Label>URL da Imagem</Label>
                <Input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>URL das Regras</Label>
                <Input value={editRulesUrl} onChange={(e) => setEditRulesUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>URL do Vídeo</Label>
                <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mín. Jogadores</Label>
                <Input type="number" min={1} value={editMinPlayers} onChange={(e) => setEditMinPlayers(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Máx. Jogadores</Label>
                <Input type="number" min={1} value={editMaxPlayers} onChange={(e) => setEditMaxPlayers(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Facções</Label>
              <Input
                value={editFactions}
                onChange={(e) => setEditFactions(e.target.value)}
                placeholder="Facção A, Facção B, Facção C"
              />
              <p className="text-xs text-muted-foreground">Separe as facções por vírgula</p>
            </div>

            {/* Scoring Schema */}
            <div className="space-y-2">
              <Label>Schema de Pontuação</Label>
              {editCategories.map((cat: any, ci: number) => (
                <div key={ci} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={cat.label} onChange={e => updateCategory(ci, e.target.value)} placeholder="Nome da categoria" className="flex-1 h-8" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCategory(ci)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                  {(cat.subcategories || []).map((sub: any, si: number) => (
                    <div key={si} className="flex items-center gap-2 ml-4">
                      <Input value={sub.label} onChange={e => updateSubcategory(ci, si, e.target.value)} placeholder="Subcategoria" className="flex-1 h-7 text-xs" />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSubcategory(ci, si)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="ml-4 text-xs" onClick={() => addSubcategory(ci)}>
                    + Subcategoria
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCategory}>
                + Categoria
              </Button>
            </div>

            <div className="flex gap-2 justify-between">
              <Button variant="destructive" size="sm" onClick={handleDeleteGame} disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-1" /> Excluir Jogo
              </Button>
              <Button variant="gold" onClick={handleEditSave}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={editMatchOpen} onOpenChange={setEditMatchOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Partida</DialogTitle>
          </DialogHeader>
          {editMatch && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={editMatchDate} onChange={e => setEditMatchDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input type="number" min={0} value={editMatchDuration} onChange={e => setEditMatchDuration(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Resultados</Label>
                {editMatchResults.map((r: any, i: number) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 text-center font-bold text-gold">{r.position}º</span>
                    <span className="flex-1 truncate">{r.player_name}</span>
                    <Input
                      type="number"
                      className="w-20 h-8 text-xs"
                      value={r.score ?? 0}
                      onChange={e => {
                        const updated = [...editMatchResults];
                        updated[i] = { ...updated[i], score: parseInt(e.target.value) || 0 };
                        setEditMatchResults(updated);
                      }}
                    />
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="gold"
                  disabled={savingMatch}
                  onClick={async () => {
                    setSavingMatch(true);
                    // Update match
                    await supabase.from("matches").update({
                      played_at: editMatchDate ? new Date(editMatchDate).toISOString() : editMatch.played_at,
                      duration_minutes: editMatchDuration ? parseInt(editMatchDuration) : null,
                    }).eq("id", editMatch.id);
                    // Update results
                    for (const r of editMatchResults) {
                      await supabase.from("match_results").update({
                        score: r.score ?? 0,
                        position: r.position,
                      }).eq("id", r.id);
                    }
                    setSavingMatch(false);
                    setEditMatchOpen(false);
                    notify("success", "Partida atualizada!");
                    // Refresh
                    window.location.reload();
                  }}
                >
                  {savingMatch ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GameDetail;
