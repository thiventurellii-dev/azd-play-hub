import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Calendar, Clock, Users, ExternalLink, Video, Award, ChevronDown, ChevronUp,
  Flag, Share2, UserPlus, Gamepad2, TrendingUp, Trophy, Shield, FileText, Info, Upload, Download,
  ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { getRankIcon, getBloodPrizeClass, getBloodWinStats } from "@/utils/game-logic";
import type {
  SeasonFull, RankingEntry, BloodRankingEntry, MatchRecord, BloodMatchRecord, GameInfo,
} from "@/types/database";
import { useNotification } from "@/components/NotificationDialog";
import { useAuth } from "@/contexts/AuthContext";
import { SeasonStatsPanel } from "@/components/seasons/SeasonStatsPanel";

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  upcoming: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  finished: "bg-muted text-muted-foreground border-border",
};
const statusLabels: Record<string, string> = { active: "Ativa", upcoming: "Em breve", finished: "Finalizada" };

const computeStatus = (start: string, end: string): string => {
  const now = new Date();
  if (now < new Date(start + "T00:00:00")) return "upcoming";
  if (now > new Date(end + "T23:59:59")) return "finished";
  return "active";
};

const MatchImage = ({ src }: { src: string }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <img
        src={src}
        alt="Partida"
        className={`w-full object-cover cursor-pointer transition-all duration-300 ${expanded ? "max-h-[600px]" : "h-48"}`}
        onClick={() => setExpanded(!expanded)}
      />
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 transition-colors"
        >
          Expandir imagem
        </button>
      )}
    </div>
  );
};

const SeasonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { notify } = useNotification();
  const { isAdmin } = useAuth();
  const [season, setSeason] = useState<(SeasonFull & { cover_url: string | null; start_date: string; end_date: string; regulation_url: string | null }) | null>(null);
  const [coverFallback, setCoverFallback] = useState<string | null>(null);
  const [linkedItems, setLinkedItems] = useState<{ name: string; image_url: string | null }[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [bloodRankings, setBloodRankings] = useState<BloodRankingEntry[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [bloodMatches, setBloodMatches] = useState<BloodMatchRecord[]>([]);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [gameFactionsMap, setGameFactionsMap] = useState<Record<string, any>>({});
  const [avatarMap, setAvatarMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string>("all");
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ranking");
  const [uploadingReg, setUploadingReg] = useState(false);
  const regFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const { data: sData } = await supabase.from("seasons").select("*").eq("id", id).single();
      const seasonData: any = sData
        ? {
            ...sData,
            prize: (sData as any).prize || "",
            type: (sData as any).type || "boardgame",
            prize_1st: sData.prize_1st || 0,
            prize_2nd: sData.prize_2nd || 0,
            prize_3rd: sData.prize_3rd || 0,
            prize_4th_6th: (sData as any).prize_4th_6th || 0,
            prize_7th_10th: (sData as any).prize_7th_10th || 0,
            cover_url: (sData as any).cover_url || null,
            regulation_url: (sData as any).regulation_url || null,
          }
        : null;
      setSeason(seasonData);

      if (seasonData?.type === "blood") {
        const { data: sbsData } = await supabase.from("season_blood_scripts").select("script_id").eq("season_id", id);
        const scriptIds = (sbsData || []).map((x: any) => x.script_id);
        if (scriptIds.length > 0) {
          const { data: scriptsData } = await supabase.from("blood_scripts").select("id, name, image_url").in("id", scriptIds);
          const items = ((scriptsData || []) as any[]).map((s) => ({ name: s.name, image_url: s.image_url }));
          setLinkedItems(items);
          setCoverFallback(items.find((i) => i.image_url)?.image_url || null);
        }

        // Blood matches
        const { data: bmData } = await supabase
          .from("blood_matches").select("*").eq("season_id", id)
          .order("played_at", { ascending: false }).limit(50);

        if (bmData && bmData.length > 0) {
          const scriptIds2 = [...new Set((bmData as any[]).map((m) => m.script_id))];
          const matchIds = (bmData as any[]).map((m) => m.id);
          const storytellerIds = [...new Set((bmData as any[]).map((m) => m.storyteller_player_id))];

          const [scriptsRes, playersRes] = await Promise.all([
            supabase.from("blood_scripts").select("id, name").in("id", scriptIds2),
            supabase.from("blood_match_players").select("*").in("match_id", matchIds),
          ]);

          const scriptMap: Record<string, string> = {};
          for (const s of (scriptsRes.data || []) as any[]) scriptMap[s.id] = s.name;

          const allPlayerIds = [...new Set([...storytellerIds, ...((playersRes.data || []) as any[]).map((p) => p.player_id)])];
          const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: allPlayerIds });
          const pMap: Record<string, string> = {};
          const aMap: Record<string, string | null> = {};
          for (const p of profiles || []) {
            pMap[p.id] = (p as any).nickname || p.name;
            aMap[p.id] = (p as any).avatar_url || null;
          }
          setAvatarMap((prev) => ({ ...prev, ...aMap }));

          const charIds = [...new Set(((playersRes.data || []) as any[]).map((p) => p.character_id))];
          const { data: charsData } = charIds.length > 0
            ? await supabase.from("blood_characters").select("id, name").in("id", charIds)
            : { data: [] };
          const charMap: Record<string, string> = {};
          for (const c of (charsData || []) as any[]) charMap[c.id] = c.name;

          setBloodMatches(
            (bmData as any[]).map((m) => ({
              id: m.id, played_at: m.played_at, duration_minutes: m.duration_minutes,
              script_name: scriptMap[m.script_id] || "?", winning_team: m.winning_team,
              storyteller_name: pMap[m.storyteller_player_id] || "?",
              platform: m.platform || null,
              players: ((playersRes.data || []) as any[])
                .filter((p) => p.match_id === m.id)
                .map((p) => ({ player_name: pMap[p.player_id] || "?", character_name: charMap[p.character_id] || "?", team: p.team })),
            })),
          );
        }

        const { data: brData } = await supabase
          .from("blood_mmr_ratings").select("*").eq("season_id", id).order("total_points", { ascending: false });

        if (brData && brData.length > 0) {
          const playerIds = (brData as any[]).map((r) => r.player_id);
          const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: playerIds });
          const pMap: Record<string, string> = {};
          const aMap: Record<string, string | null> = {};
          for (const p of profiles || []) {
            pMap[p.id] = (p as any).nickname || p.name;
            aMap[p.id] = (p as any).avatar_url || null;
          }
          setAvatarMap((prev) => ({ ...prev, ...aMap }));
          setBloodRankings((brData as any[]).map((r) => ({
            ...r,
            player_name: pMap[r.player_id] || "?",
            avatar_url: aMap[r.player_id] || null,
          })));
        }
      } else {
        const { data: sgData } = await supabase.from("season_games").select("game_id").eq("season_id", id);
        const gameIds = (sgData || []).map((sg) => sg.game_id);
        let gamesData: GameInfo[] = [];
        if (gameIds.length > 0) {
          const { data: gData } = await supabase.from("games").select("*").in("id", gameIds).order("name");
          gamesData = gData || [];
        }
        setGames(gamesData);
        const fmap: Record<string, any> = {};
        for (const g of gamesData) fmap[g.id] = (g as any).factions;
        setGameFactionsMap(fmap);
        const items = gamesData.map((g) => ({ name: g.name, image_url: g.image_url }));
        setLinkedItems(items);
        setCoverFallback(items.find((i) => i.image_url)?.image_url || null);

        const { data: mData } = await supabase
          .from("matches")
          .select("id, played_at, duration_minutes, image_url, first_player_id, game_id, platform")
          .eq("season_id", id)
          .order("played_at", { ascending: false })
          .limit(50);

        if (mData && mData.length > 0) {
          const matchIds = mData.map((m) => m.id);
          const gameIdsMatch = [...new Set(mData.map((m) => m.game_id))];
          const [resRes, gamesRes] = await Promise.all([
            supabase
              .from("match_results")
              .select("match_id, player_id, position, seat_position, score, mmr_change, mmr_before, mmr_after, faction")
              .in("match_id", matchIds),
            supabase.from("games").select("id, name").in("id", gameIdsMatch),
          ]);
          const gameMap: Record<string, string> = {};
          for (const g of gamesRes.data || []) gameMap[g.id] = g.name;
          const playerIds = [...new Set((resRes.data || []).map((r) => r.player_id))];
          const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: playerIds });
          const pMap: Record<string, string> = {};
          const aMap: Record<string, string | null> = {};
          for (const p of profiles || []) {
            pMap[p.id] = (p as any).nickname || p.name;
            aMap[p.id] = (p as any).avatar_url || null;
          }
          setAvatarMap((prev) => ({ ...prev, ...aMap }));

          setMatches(
            mData.map((m) => ({
              id: m.id, played_at: m.played_at, duration_minutes: m.duration_minutes,
              image_url: m.image_url, first_player_id: (m as any).first_player_id || null,
              game_name: gameMap[m.game_id] || "?", game_id: m.game_id,
              platform: (m as any).platform || null,
              results: (resRes.data || [])
                .filter((r) => r.match_id === m.id)
                .sort((a, b) => a.position - b.position)
                .map((r: any) => ({
                  player_name: pMap[r.player_id] || "?", player_id: r.player_id,
                  position: r.position, seat_position: r.seat_position ?? null, score: r.score || 0,
                  mmr_change: r.mmr_change || 0, mmr_before: r.mmr_before || 1000, mmr_after: r.mmr_after || 1000,
                  faction: r.faction || null,
                })) as any,
            })),
          );
        }
      }
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  useEffect(() => {
    if (!id || !season || season.type === "blood") return;
    const fetchRankings = async () => {
      let query = supabase
        .from("mmr_ratings")
        .select("player_id, current_mmr, games_played, wins, game_id")
        .eq("season_id", id)
        .order("current_mmr", { ascending: false });
      if (selectedGameId !== "all") query = query.eq("game_id", selectedGameId);
      const { data: rData } = await query;

      if (rData && rData.length > 0) {
        let aggregated: RankingEntry[];
        if (selectedGameId === "all") {
          const agg: Record<string, { mmr: number; gp: number; wins: number }> = {};
          const gameCount: Record<string, number> = {};
          for (const r of rData) {
            if (!agg[r.player_id]) agg[r.player_id] = { mmr: 0, gp: 0, wins: 0 };
            agg[r.player_id].mmr += r.current_mmr;
            agg[r.player_id].gp += r.games_played;
            agg[r.player_id].wins += r.wins;
            gameCount[r.player_id] = (gameCount[r.player_id] || 0) + 1;
          }
          const playerIds = Object.keys(agg);
          const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: playerIds });
          const pMap: Record<string, string> = {};
          const aMap: Record<string, string | null> = {};
          for (const p of profiles || []) {
            pMap[p.id] = (p as any).nickname || p.name;
            aMap[p.id] = (p as any).avatar_url || null;
          }
          setAvatarMap((prev) => ({ ...prev, ...aMap }));
          aggregated = playerIds
            .map((pid) => ({
              player_id: pid,
              current_mmr: parseFloat((agg[pid].mmr / gameCount[pid]).toFixed(2)),
              games_played: agg[pid].gp, wins: agg[pid].wins,
              player_name: pMap[pid] || "Unknown",
              avatar_url: aMap[pid] || null,
            }))
            .sort((a, b) => b.current_mmr - a.current_mmr);
        } else {
          const playerIds = rData.map((r) => r.player_id);
          const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: playerIds });
          const pMap: Record<string, string> = {};
          const aMap: Record<string, string | null> = {};
          for (const p of profiles || []) {
            pMap[p.id] = (p as any).nickname || p.name;
            aMap[p.id] = (p as any).avatar_url || null;
          }
          setAvatarMap((prev) => ({ ...prev, ...aMap }));
          aggregated = rData.map((r) => ({ ...r, player_name: pMap[r.player_id] || "Unknown", avatar_url: aMap[r.player_id] || null }));
        }
        setRankings(aggregated);
      } else {
        setRankings([]);
      }
    };
    fetchRankings();
  }, [id, selectedGameId, season]);

  const filteredMatches = selectedGameId === "all" ? matches : matches.filter((m) => m.game_id === selectedGameId);

  // Position delta: compares current ranking vs ranking right before the last match (of selected game)
  const positionDeltas = useMemo<Record<string, number>>(() => {
    if (season?.type === "blood" || rankings.length === 0 || filteredMatches.length === 0) return {};
    // Most recent match (filteredMatches sorted desc by played_at from query)
    const lastMatch = [...filteredMatches].sort((a, b) => b.played_at.localeCompare(a.played_at))[0];
    if (!lastMatch) return {};
    // Current ranking order (already sorted by current_mmr desc on rankings state)
    const currentSorted = [...rankings].sort((a, b) => Number(b.current_mmr) - Number(a.current_mmr));
    const currentPos: Record<string, number> = {};
    currentSorted.forEach((r, i) => { currentPos[r.player_id] = i + 1; });

    // Reconstruct previous MMR: for each player in last match, use mmr_before; others keep current_mmr
    const prevMmrMap: Record<string, number> = {};
    const lastParticipants = new Set<string>();
    for (const r of lastMatch.results) {
      if (r.player_id) {
        prevMmrMap[r.player_id] = Number(r.mmr_before);
        lastParticipants.add(r.player_id);
      }
    }
    const prevSorted = [...rankings]
      .map((r) => ({ id: r.player_id, mmr: prevMmrMap[r.player_id] ?? Number(r.current_mmr) }))
      .sort((a, b) => b.mmr - a.mmr);
    const prevPos: Record<string, number> = {};
    prevSorted.forEach((r, i) => { prevPos[r.id] = i + 1; });

    const deltas: Record<string, number> = {};
    for (const pid of lastParticipants) {
      if (prevPos[pid] && currentPos[pid]) {
        deltas[pid] = prevPos[pid] - currentPos[pid]; // positive = subiu
      }
    }
    return deltas;
  }, [season, rankings, filteredMatches]);


  // Computed stats
  const isBlood = season?.type === "blood";
  const liveStatus = season ? computeStatus(season.start_date, season.end_date) : "upcoming";

  const hasFactions = useMemo(() => {
    if (isBlood) return true;
    const hasArr = (f: any) => Array.isArray(f) && f.length > 0;
    if (selectedGameId !== "all") return hasArr(gameFactionsMap[selectedGameId]);
    return Object.values(gameFactionsMap).some(hasArr);
  }, [isBlood, selectedGameId, gameFactionsMap]);

  const kpis = useMemo(() => {
    if (!season) return { participants: 0, matchesCount: 0, winRate: 0, avgMmr: 0 };
    if (isBlood) {
      const participants = bloodRankings.length;
      const matchesCount = bloodMatches.length;
      const totalGames = bloodRankings.reduce((s, r) => s + (r.games_played - r.games_as_storyteller), 0);
      const totalWins = bloodRankings.reduce((s, r) => s + r.wins_evil + r.wins_good, 0);
      const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
      const avgMmr = participants > 0
        ? Math.round(bloodRankings.reduce((s, r) => s + r.total_points, 0) / participants)
        : 0;
      return { participants, matchesCount, winRate, avgMmr };
    }
    const participants = rankings.length;
    const matchesCount = matches.length;
    const ratings = rankings.filter((r) => r.games_played > 0);
    const winRate = ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r.wins / r.games_played, 0) / ratings.length) * 100)
      : 0;
    const avgMmr = participants > 0
      ? Math.round(rankings.reduce((s, r) => s + Number(r.current_mmr), 0) / participants)
      : 0;
    return { participants, matchesCount, winRate, avgMmr };
  }, [season, isBlood, rankings, bloodRankings, matches, bloodMatches]);

  const daysRemaining = useMemo(() => {
    if (!season || liveStatus !== "active") return null;
    const ms = new Date(season.end_date + "T23:59:59").getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [season, liveStatus]);

  if (loading) {
    return (
      <div className="container py-10 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }
  if (!season) {
    return <div className="container py-10 text-center text-muted-foreground">Season não encontrada.</div>;
  }

  const cover = season.cover_url || coverFallback;
  const totalPrize = isBlood
    ? (season.prize_1st || 0) * 3 + (season.prize_4th_6th || 0) * 3 + (season.prize_7th_10th || 0) * 3
    : (season.prize_1st || 0) + (season.prize_2nd || 0) + (season.prize_3rd || 0);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify("success", "Link copiado!");
    } catch {
      notify("error", "Não foi possível copiar o link.");
    }
  };
  const handleInvite = () => notify("info", "Convite de jogadores em breve!");

  const handleRegulationUpload = async (file: File) => {
    if (!season || !id) return;
    setUploadingReg(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${id}/regulamento-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("season-regulations").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("season-regulations").getPublicUrl(path);
      const { error: updErr } = await supabase.from("seasons").update({ regulation_url: urlData.publicUrl } as any).eq("id", id);
      if (updErr) throw updErr;
      setSeason({ ...season, regulation_url: urlData.publicUrl });
      notify("success", "Regulamento enviado!");
    } catch (e: any) {
      notify("error", e.message || "Falha no upload");
    } finally {
      setUploadingReg(false);
      if (regFileRef.current) regFileRef.current.value = "";
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <Link to="/seasons" className="text-sm text-muted-foreground hover:text-foreground inline-block">
        ← Voltar para Seasons
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold">{season.name}</h1>
            <Badge variant="outline" className="gap-1">
              <Gamepad2 className="h-3 w-3" /> {isBlood ? "Blood" : "Boardgame"}
            </Badge>
            <Badge className={statusColors[liveStatus]}>{statusLabels[liveStatus]}</Badge>
          </div>
          {linkedItems.length > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span>{isBlood ? "🩸" : "🎲"}</span>{linkedItems.map((i) => i.name).join(", ")}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(season.start_date + "T00:00:00").toLocaleDateString("pt-BR")} —{" "}
              {new Date(season.end_date + "T00:00:00").toLocaleDateString("pt-BR")}
              {daysRemaining !== null && <span className="ml-1">({daysRemaining} dias restantes)</span>}
            </span>
            <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /> Temporada oficial</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Ranking público</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShare}>
            <Share2 className="h-4 w-4" /> Compartilhar
          </Button>
          <Button variant="gold" size="sm" className="gap-1.5" onClick={handleInvite}>
            <UserPlus className="h-4 w-4" /> Convidar jogadores
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Cover */}
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary/40 border border-border">
            {cover ? (
              <img src={cover} alt={season.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">{isBlood ? "🩸" : "🎲"}</div>
            )}
          </div>

          {/* Prize card */}
          {totalPrize > 0 && (
            <Card className="bg-card border-gold/30">
              <CardContent className="py-4 text-center space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Premiação Total</p>
                  <p className="text-2xl font-bold text-gold flex items-center justify-center gap-1.5 mt-1">
                    <Trophy className="h-5 w-5" /> R$ {totalPrize}
                  </p>
                </div>
                {!isBlood ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "🥇 1º", val: season.prize_1st },
                      { label: "🥈 2º", val: season.prize_2nd },
                      { label: "🥉 3º", val: season.prize_3rd },
                    ].map((p) => (
                      <div key={p.label} className="rounded-md border border-border bg-secondary/30 py-2">
                        <p className="text-[10px] text-muted-foreground">{p.label}</p>
                        <p className="text-xs font-bold text-gold">R$ {p.val || 0}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "🥇 1º-3º", val: season.prize_1st },
                      { label: "🥈 4º-6º", val: season.prize_4th_6th },
                      { label: "🥉 7º-10º", val: season.prize_7th_10th },
                    ].map((p) => (
                      <div key={p.label} className="rounded-md border border-border bg-secondary/30 py-2">
                        <p className="text-[10px] text-muted-foreground">{p.label}</p>
                        <p className="text-xs font-bold text-gold">R$ {p.val || 0} cada</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Format info — sem critério de desempate */}
          <Card className="bg-card border-border">
            <CardContent className="py-4 space-y-3 text-sm">
              {[
                { icon: Award, label: "Sistema de pontuação", val: isBlood ? "Pontos Blood" : "MMR Global" },
                { icon: Shield, label: "Formato", val: "Competitivo" },
                { icon: Gamepad2, label: "Partidas válidas", val: "Jogos ranqueados" },
              ].map((it) => (
                <div key={it.label} className="flex items-start gap-2">
                  <it.icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">{it.label}</p>
                    <p className="text-sm font-medium truncate">{it.val}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Regulamento — admins fazem upload, todos baixam */}
          <input
            ref={regFileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleRegulationUpload(f);
            }}
          />
          {season.regulation_url ? (
            <div className="space-y-2">
              <Button variant="outline" className="w-full gap-1.5" asChild>
                <a href={season.regulation_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" /> Baixar Regulamento
                </a>
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => regFileRef.current?.click()}
                  disabled={uploadingReg}
                >
                  <Upload className="h-3.5 w-3.5" /> {uploadingReg ? "Enviando..." : "Substituir regulamento"}
                </Button>
              )}
            </div>
          ) : isAdmin ? (
            <Button
              variant="outline"
              className="w-full gap-1.5"
              onClick={() => regFileRef.current?.click()}
              disabled={uploadingReg}
            >
              <Upload className="h-4 w-4" /> {uploadingReg ? "Enviando..." : "Subir Regulamento"}
            </Button>
          ) : (
            <Button variant="outline" className="w-full gap-1.5" disabled>
              <FileText className="h-4 w-4" /> Regulamento indisponível
            </Button>
          )}
        </aside>

        {/* Main content */}
        <main className="space-y-6 min-w-0">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Participantes</span>
                  </div>
                  <p className="text-2xl font-bold text-gold leading-none">{kpis.participants}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <Gamepad2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Partidas realizadas</span>
                  </div>
                  <p className="text-2xl font-bold text-gold leading-none">{kpis.matchesCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <TrendingUp className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Win Rate médio</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="O que é Win Rate médio?" className="flex-shrink-0"><Info className="h-3.5 w-3.5 opacity-70 hover:opacity-100" /></button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[240px] text-xs">
                          Média da taxa de vitórias (vitórias ÷ partidas) de todos os participantes da temporada.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-2xl font-bold text-gold leading-none">{kpis.winRate}%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <TrendingUp className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{isBlood ? "Pontos médios" : "MMR médio"}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="O que é MMR médio?" className="flex-shrink-0"><Info className="h-3.5 w-3.5 opacity-70 hover:opacity-100" /></button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[240px] text-xs">
                          {isBlood
                            ? "Média de pontos acumulados pelos participantes da temporada."
                            : "Média do MMR atual (matchmaking rating) de todos os participantes — indica a força média do grupo."}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-2xl font-bold text-gold leading-none">{kpis.avgMmr}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="matches">Partidas</TabsTrigger>
              <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            </TabsList>

            <TabsContent value="ranking" className="space-y-4">
              {!isBlood && (
                <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Filtrar por jogo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os jogos (média)</SelectItem>
                    {games.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="min-w-0">
                {isBlood ? (
                  bloodRankings.length === 0 ? (
                    <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhum ranking disponível ainda.</CardContent></Card>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="grid grid-cols-[40px_1fr_70px_70px_70px_70px_70px_80px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <span>#</span><span>Jogador</span>
                        <span className="text-center">Partidas</span>
                        <span className="text-center">V. Mal</span>
                        <span className="text-center">V. Bem</span>
                        <span className="text-center">% Vit.</span>
                        <span className="text-center">Narr.</span>
                        <span className="text-right">Pontos</span>
                      </div>
                      {bloodRankings.map((r, i) => {
                        const { winPct } = getBloodWinStats(r);
                        return (
                          <motion.div key={r.player_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                            <div className={`grid grid-cols-[40px_1fr_70px_70px_70px_70px_70px_80px] gap-2 items-center px-4 py-3 rounded-lg border border-border hover:border-gold/20 transition-colors ${getBloodPrizeClass(i)}`}>
                              <div className="flex items-center justify-center">{getRankIcon(i)}</div>
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                  {r.avatar_url && <AvatarImage src={r.avatar_url} alt={r.player_name} />}
                                  <AvatarFallback className="text-[10px] bg-secondary">{r.player_name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="font-semibold truncate">{r.player_name}</p>
                              </div>
                              <p className="text-center text-sm">{r.games_played}</p>
                              <p className="text-center text-sm text-red-400">{r.wins_evil}</p>
                              <p className="text-center text-sm text-blue-400">{r.wins_good}</p>
                              <p className="text-center text-sm">{winPct}%</p>
                              <p className="text-center text-sm text-muted-foreground">{r.games_as_storyteller}</p>
                              <p className="text-right text-lg font-bold text-gold">{r.total_points}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )
                ) : rankings.length === 0 ? (
                  <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhum ranking disponível ainda.</CardContent></Card>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-[40px_1fr_80px_80px_80px_140px_90px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <span>#</span><span>Jogador</span>
                      <span className="text-center">Partidas</span>
                      <span className="text-center">Vitórias</span>
                      <span className="text-center">Win Rate</span>
                      <span className="text-center flex items-center justify-center gap-1">
                        Variação
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" aria-label="O que é Variação?" className="flex-shrink-0">
                                <Info className="h-3 w-3 opacity-70 hover:opacity-100" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[260px] text-xs normal-case font-normal">
                              Mudança de posição no ranking após a última partida da temporada. Verde = subiu, vermelho = desceu.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      <span className="text-right">MMR</span>
                    </div>
                    {rankings.map((r, i) => {
                      const delta = positionDeltas[r.player_id];
                      return (
                        <motion.div key={r.player_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                          <div className={`grid grid-cols-[40px_1fr_80px_80px_80px_140px_90px] gap-2 items-center px-4 py-3 rounded-lg border border-border hover:border-gold/20 transition-colors ${i < 3 ? "border-gold/30" : ""}`}>
                            <div className="flex items-center justify-center">{getRankIcon(i)}</div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                {r.avatar_url && <AvatarImage src={r.avatar_url} alt={r.player_name} />}
                                <AvatarFallback className="text-[10px] bg-secondary">{r.player_name.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <p className="font-semibold truncate">{r.player_name}</p>
                            </div>
                            <p className="text-center text-sm">{r.games_played}</p>
                            <p className="text-center text-sm">{r.wins}</p>
                            <p className="text-center text-sm">
                              {r.games_played > 0 ? Math.round((r.wins / r.games_played) * 100) : 0}%
                            </p>
                            <div className="flex items-center justify-center text-xs font-medium">
                              {delta === undefined ? (
                                <span className="text-muted-foreground/40">—</span>
                              ) : delta > 0 ? (
                                <span className="flex items-center gap-1 text-green-500">
                                  <ArrowUp className="h-3.5 w-3.5" /> +{delta} {delta === 1 ? "posição" : "posições"}
                                </span>
                              ) : delta < 0 ? (
                                <span className="flex items-center gap-1 text-red-500">
                                  <ArrowDown className="h-3.5 w-3.5" /> {delta} {Math.abs(delta) === 1 ? "posição" : "posições"}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Minus className="h-3.5 w-3.5" /> 0
                                </span>
                              )}
                            </div>
                            <p className="text-right text-lg font-bold text-gold">{Number(r.current_mmr).toFixed(2)}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats">
              <SeasonStatsPanel
                isBlood={!!isBlood}
                matches={matches}
                bloodMatches={bloodMatches}
                rankings={rankings}
                bloodRankings={bloodRankings}
                hasFactions={hasFactions}
              />
            </TabsContent>

            <TabsContent value="matches">
              {isBlood ? (
                bloodMatches.length === 0 ? (
                  <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma partida registrada.</CardContent></Card>
                ) : (
                  <div className="space-y-3">
                    {bloodMatches.map((m) => {
                      const isExpanded = expandedMatch === m.id;
                      return (
                        <Card key={m.id} className="bg-card border-border hover:border-gold/20 transition-colors cursor-pointer"
                          onClick={() => setExpandedMatch(isExpanded ? null : m.id)}>
                          <CardContent className="py-4 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline">{m.script_name}</Badge>
                                <Badge className={m.winning_team === "evil" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}>
                                  {m.winning_team === "evil" ? "💀 Mal" : "🛡️ Bem"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Narrador: {m.storyteller_name}</span>
                                {m.duration_minutes && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {m.duration_minutes} min
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{new Date(m.played_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="space-y-2 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2 text-sm p-2 rounded bg-gold/10">
                                  <span className="text-gold">📖</span>
                                  <span className="font-medium text-gold">Narrador: {m.storyteller_name}</span>
                                </div>
                                {m.players.filter((p: any) => p.team === "evil").map((p: any, i: number) => (
                                  <div key={`evil-${i}`} className="flex items-center gap-2 text-sm p-2 rounded bg-red-500/10">
                                    <span className="text-red-400">💀</span>
                                    <span className="font-medium">{p.player_name}</span>
                                    <span className="text-muted-foreground">— {p.character_name}</span>
                                  </div>
                                ))}
                                {m.players.filter((p: any) => p.team === "good").map((p: any, i: number) => (
                                  <div key={`good-${i}`} className="flex items-center gap-2 text-sm p-2 rounded bg-blue-500/10">
                                    <span className="text-blue-400">🛡️</span>
                                    <span className="font-medium">{p.player_name}</span>
                                    <span className="text-muted-foreground">— {p.character_name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )
              ) : filteredMatches.length === 0 ? (
                <Card className="bg-card border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma partida registrada.</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {filteredMatches.map((m) => {
                    const isExpanded = expandedMatch === m.id;
                    const winner = m.results.find((r) => r.position === 1);
                    return (
                      <Card key={m.id} className="bg-card border-border hover:border-gold/20 transition-colors cursor-pointer"
                        onClick={() => setExpandedMatch(isExpanded ? null : m.id)}>
                        <CardContent className="py-4 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{m.game_name}</Badge>
                              {winner && <span className="text-sm font-medium text-gold">🏆 {winner.player_name}</span>}
                              {m.duration_minutes && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {m.duration_minutes} min
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{new Date(m.played_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="space-y-4 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                              {m.image_url && <MatchImage src={m.image_url} />}
                              <div className="space-y-2">
                                {m.results.map((r, i) => (
                                  <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-secondary/30">
                                    <Badge variant={r.position === 1 ? "default" : "secondary"} className={`w-8 justify-center ${r.position === 1 ? "bg-gold text-black" : ""}`}>{r.position}º</Badge>
                                    <Avatar className="h-5 w-5 flex-shrink-0">
                                      {avatarMap[r.player_id] && <AvatarImage src={avatarMap[r.player_id] || undefined} alt={r.player_name} />}
                                      <AvatarFallback className="text-[9px] bg-secondary">{r.player_name.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 font-medium flex items-center gap-1 min-w-0 truncate">
                                      {r.player_name}
                                      {r.player_id === m.first_player_id && <Flag className="h-3.5 w-3.5 text-gold ml-1" />}
                                    </span>
                                    <span className="text-muted-foreground">{r.score} pts</span>
                                    <span className={`text-xs font-medium ${r.mmr_change >= 0 ? "text-green-500" : "text-red-500"}`}>
                                      {r.mmr_change >= 0 ? "+" : ""}{r.mmr_change} MMR
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default SeasonDetail;
