import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";
import {
  Trophy, Gamepad2, ArrowLeft, Calendar, Clock, Award, Pencil, Lock, CalendarIcon,
  Users, MessagesSquare, MapPin, Sparkles, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import FriendButton from "@/components/friendlist/FriendButton";
import FriendsList from "@/components/friendlist/FriendsList";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { brazilianStates, formatPhone } from "@/lib/brazil-data";
import { Camera } from "lucide-react";
import XpBadge from "@/components/shared/XpBadge";
import DateBlock from "@/components/shared/DateBlock";
import { RecentMatchItem } from "@/components/profile/RecentMatchCard";
import RecentMatchCardCompact from "@/components/profile/RecentMatchCardCompact";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { PlayerTagsBadges } from "@/components/profile/PlayerTagsSelector";
import { useProfileTags } from "@/hooks/useProfileTags";

const CHART_COLORS = [
  "hsl(43, 100%, 50%)", "hsl(200, 80%, 55%)", "hsl(150, 60%, 45%)", "hsl(340, 70%, 55%)",
  "hsl(270, 60%, 55%)", "hsl(25, 85%, 55%)", "hsl(180, 60%, 45%)", "hsl(0, 70%, 55%)",
];

interface AchievementItem { name: string; description: string | null; granted_at: string | null; }
interface CommunityItem { id: string; slug: string; name: string; logo_url: string | null; }
interface SeasonContext {
  id: string; name: string; status: string; end_date: string | null;
  position: number; total: number; current_mmr: number; min_mmr: number; max_mmr: number;
}
interface ActivityItem { kind: "achievement" | "community"; date: string; title: string; subtitle?: string; }

const PlayerProfile = () => {
  const { nickname } = useParams();
  const { user } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string>("player");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ totalGames: 0, uniqueGames: 0 });
  const [gamePerformance, setGamePerformance] = useState<any[]>([]);
  const [opponents, setOpponents] = useState<{ name: string; games: number; wins: number }[]>([]);
  const [upcomingRooms, setUpcomingRooms] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [communitiesActivity, setCommunitiesActivity] = useState<ActivityItem[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [seasonsList, setSeasonsList] = useState<SeasonContext[]>([]);
  const [recentMatches, setRecentMatches] = useState<RecentMatchItem[]>([]);
  const [lastMatchDate, setLastMatchDate] = useState<string | null>(null);

  const [botcStats, setBotcStats] = useState<{ gamesPlayed: number; winsGood: number; winsEvil: number; storytellerGames: number } | null>(null);
  const [botcPartners, setBotcPartners] = useState<{ name: string; goodGames: number; evilGames: number; goodWins: number; evilWins: number }[]>([]);
  const [botcCharPerf, setBotcCharPerf] = useState<{ name: string; games: number; wins: number; winPct: number }[]>([]);

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tags: playerTags, setTags: setPlayerTags } = useProfileTags(profile?.id);

  const isOwnProfile = user && profile && user.id === profile.id;

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: prof } = await supabase
        .from("profiles").select("*").eq("nickname", nickname as string).maybeSingle();
      if (!prof) { setLoading(false); return; }
      setProfile(prof);
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", prof.id).maybeSingle();
      if (roleData) setRole(roleData.role);

      // ========= Match results (boardgames) =========
      const { data: results } = await supabase
        .from("match_results")
        .select("match_id, position, score, mmr_change")
        .eq("player_id", prof.id);

      let matchesById: Record<string, any> = {};
      let gameMap: Record<string, any> = {};
      let allResultsData: any[] = [];

      if (results && results.length > 0) {
        const matchIds = [...new Set(results.map((r) => r.match_id))];
        const { data: matches } = await supabase
          .from("matches")
          .select("id, game_id, played_at, season_id")
          .in("id", matchIds)
          .order("played_at", { ascending: false });
        const gameIds = [...new Set((matches || []).map((m) => m.game_id))];
        const { data: games } = await supabase.from("games").select("id, name, slug, image_url").in("id", gameIds);
        for (const g of games || []) gameMap[g.id] = g;
        for (const m of matches || []) matchesById[m.id] = m;
        if (matches && matches.length > 0) setLastMatchDate(matches[0].played_at);

        setStats({ totalGames: results.length, uniqueGames: gameIds.length });

        // Performance by game
        const perfMap: Record<string, { games: number; wins: number; totalScore: number; best: number }> = {};
        for (const r of results) {
          const m = matchesById[r.match_id];
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
              game_id: gid, game_name: gameMap[gid]?.name || "?", game_slug: gameMap[gid]?.slug || null,
              image_url: gameMap[gid]?.image_url || null,
              ...s, winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
              avgScore: s.games > 0 ? Math.round(s.totalScore / s.games) : 0,
            }))
            .sort((a, b) => b.games - a.games),
        );

        // Opponents
        const { data: allResults } = await supabase
          .from("match_results").select("match_id, player_id, position").in("match_id", matchIds);
        allResultsData = allResults || [];
        const oppMap: Record<string, { games: number; wins: number }> = {};
        for (const r of allResults || []) {
          if (r.player_id === prof.id) continue;
          if (!oppMap[r.player_id]) oppMap[r.player_id] = { games: 0, wins: 0 };
          oppMap[r.player_id].games++;
          const myResult = results.find((mr) => mr.match_id === r.match_id);
          if (myResult?.position === 1) oppMap[r.player_id].wins++;
        }
        const oppIds = Object.keys(oppMap);
        const { data: oppProfiles } = await supabase.rpc("get_public_profiles", { p_ids: oppIds });
        const oppNameMap: Record<string, string> = {};
        const oppAvatarMap: Record<string, string | null> = {};
        for (const p of oppProfiles || []) {
          oppNameMap[p.id] = (p as any).nickname || p.name;
          oppAvatarMap[p.id] = (p as any).avatar_url || null;
        }
        setOpponents(
          Object.entries(oppMap)
            .map(([pid, s]) => ({ name: oppNameMap[pid] || "?", ...s }))
            .sort((a, b) => b.games - a.games)
            .slice(0, 8),
        );

        // ========= Recent matches (last 8) com cor =========
        const sorted = [...results].sort((a, b) => {
          const ma = matchesById[a.match_id]; const mb = matchesById[b.match_id];
          return new Date(mb?.played_at || 0).getTime() - new Date(ma?.played_at || 0).getTime();
        }).slice(0, 8);

        const recent: RecentMatchItem[] = sorted.map((r) => {
          const m = matchesById[r.match_id];
          const opps = (allResults || [])
            .filter((ar) => ar.match_id === r.match_id && ar.player_id !== prof.id)
            .map((ar) => ({ name: oppNameMap[ar.player_id] || "?", avatar_url: oppAvatarMap[ar.player_id] || null }));
          return {
            match_id: r.match_id,
            game_name: gameMap[m?.game_id]?.name || "?",
            game_slug: gameMap[m?.game_id]?.slug || null,
            played_at: m?.played_at || new Date().toISOString(),
            is_competitive: !!m?.season_id,
            position: r.position ?? null,
            score: r.score ?? null,
            mmr_change: r.mmr_change ?? null,
            opponents: opps,
          };
        });
        setRecentMatches(recent);
      }

      // ========= Upcoming rooms =========
      const { data: roomPlayers } = await supabase.from("match_room_players").select("room_id").eq("player_id", prof.id);
      if (roomPlayers && roomPlayers.length > 0) {
        const roomIds = roomPlayers.map((rp) => rp.room_id);
        const { data: rooms } = await supabase.from("match_rooms")
          .select("id, title, scheduled_at, status, game_id")
          .in("id", roomIds).in("status", ["open", "full"])
          .gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5);
        if (rooms) {
          const roomGameIds = [...new Set(rooms.map((r) => r.game_id))];
          const { data: roomGames } = await supabase.from("games").select("id, name, slug").in("id", roomGameIds);
          const rgMap: Record<string, any> = {};
          for (const g of roomGames || []) rgMap[g.id] = g;
          setUpcomingRooms(rooms.map((r) => ({
            ...r,
            game_name: rgMap[r.game_id]?.name || "?",
            game_slug: rgMap[r.game_id]?.slug || null,
          })));
        }
      }

      // ========= Achievements =========
      const { data: playerAchs } = await supabase
        .from("player_achievements")
        .select("achievement_id, granted_at")
        .eq("player_id", prof.id)
        .order("granted_at", { ascending: false });
      let achList: AchievementItem[] = [];
      if (playerAchs && playerAchs.length > 0) {
        const achIds = playerAchs.map((a: any) => a.achievement_id);
        const { data: achDefs } = await supabase
          .from("achievement_definitions")
          .select("id, name, description")
          .in("id", achIds);
        const defMap: Record<string, any> = {};
        for (const d of achDefs || []) defMap[d.id] = d;
        achList = playerAchs.map((pa: any) => ({
          name: defMap[pa.achievement_id]?.name || "Conquista",
          description: defMap[pa.achievement_id]?.description || null,
          granted_at: pa.granted_at || null,
        }));
        setAchievements(achList);
      }

      // ========= Communities =========
      const { data: memberships } = await supabase
        .from("community_members" as any)
        .select("community_id, joined_at")
        .eq("user_id", prof.id)
        .eq("status", "active")
        .order("joined_at", { ascending: false });
      let commList: CommunityItem[] = [];
      let commActivity: ActivityItem[] = [];
      if (memberships && memberships.length > 0) {
        const cIds = (memberships as any[]).map((m) => m.community_id);
        const { data: comms } = await supabase
          .from("communities" as any)
          .select("id, slug, name, logo_url")
          .in("id", cIds);
        const cMap: Record<string, CommunityItem> = {};
        for (const c of (comms || []) as any[]) cMap[c.id] = c;
        commList = (memberships as any[]).map((m) => cMap[m.community_id]).filter(Boolean);
        setCommunities(commList);
        commActivity = (memberships as any[]).slice(0, 8).map((m) => ({
          kind: "community",
          date: m.joined_at,
          title: `Entrou em ${cMap[m.community_id]?.name || "Comunidade"}`,
        }));
        setCommunitiesActivity(commActivity);
      }

      // ========= Friends count =========
      const { count: fCount } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${prof.id},friend_id.eq.${prof.id}`)
        .eq("status", "accepted");
      setFriendsCount(fCount || 0);

      // ========= Seasons (todas em que o jogador participou) =========
      const { data: playerRatings } = await supabase
        .from("mmr_ratings")
        .select("season_id, current_mmr")
        .eq("player_id", prof.id);
      if (playerRatings && playerRatings.length > 0) {
        const seasonIds = [...new Set(playerRatings.map((r: any) => r.season_id))];
        const { data: seasonsData } = await supabase
          .from("seasons")
          .select("id, name, status, end_date, start_date, type")
          .in("id", seasonIds)
          .eq("type", "boardgame" as any)
          .order("start_date", { ascending: false });
        const list: SeasonContext[] = [];
        for (const s of (seasonsData || []) as any[]) {
          const { data: allRatings } = await supabase
            .from("mmr_ratings")
            .select("player_id, current_mmr")
            .eq("season_id", s.id)
            .order("current_mmr", { ascending: false });
          if (!allRatings || allRatings.length === 0) continue;
          const idx = allRatings.findIndex((r: any) => r.player_id === prof.id);
          if (idx < 0) continue;
          const mmrs = allRatings.map((r: any) => Number(r.current_mmr));
          list.push({
            id: s.id,
            name: s.name,
            status: s.status,
            end_date: s.end_date,
            position: idx + 1,
            total: allRatings.length,
            current_mmr: Number((allRatings[idx] as any).current_mmr),
            min_mmr: Math.min(...mmrs),
            max_mmr: Math.max(...mmrs),
          });
        }
        // Active first, then by recency
        list.sort((a, b) => {
          if (a.status === "active" && b.status !== "active") return -1;
          if (b.status === "active" && a.status !== "active") return 1;
          return 0;
        });
        setSeasonsList(list);
      }

      // ========= BotC stats (mantido) =========
      const { data: botcRatings } = await supabase
        .from('blood_mmr_ratings').select('games_played, wins_good, wins_evil, games_as_storyteller').eq('player_id', prof.id);
      if (botcRatings && botcRatings.length > 0) {
        const totals = botcRatings.reduce((acc, r) => ({
          gamesPlayed: acc.gamesPlayed + r.games_played,
          winsGood: acc.winsGood + r.wins_good,
          winsEvil: acc.winsEvil + r.wins_evil,
          storytellerGames: acc.storytellerGames + r.games_as_storyteller,
        }), { gamesPlayed: 0, winsGood: 0, winsEvil: 0, storytellerGames: 0 });
        setBotcStats(totals);
      }

      const { data: botcMatchPlayers } = await supabase
        .from('blood_match_players').select('match_id, player_id, character_id, team').eq('player_id', prof.id);
      if (botcMatchPlayers && botcMatchPlayers.length > 0) {
        const botcMatchIds = [...new Set(botcMatchPlayers.map(bp => bp.match_id))];
        const { data: botcMatches } = await supabase
          .from('blood_matches').select('id, winning_team').in('id', botcMatchIds);
        const winTeamMap: Record<string, string> = {};
        for (const bm of botcMatches || []) winTeamMap[bm.id] = bm.winning_team;

        const { data: allBotcPlayers } = await supabase
          .from('blood_match_players').select('match_id, player_id, team').in('match_id', botcMatchIds);

        const partnerMap: Record<string, { goodGames: number; evilGames: number; goodWins: number; evilWins: number }> = {};
        for (const bp of allBotcPlayers || []) {
          if (bp.player_id === prof.id) continue;
          const myEntry = botcMatchPlayers.find(m => m.match_id === bp.match_id);
          if (!myEntry) continue;
          if (!partnerMap[bp.player_id]) partnerMap[bp.player_id] = { goodGames: 0, evilGames: 0, goodWins: 0, evilWins: 0 };
          const won = winTeamMap[bp.match_id] === myEntry.team;
          if (myEntry.team === 'good') {
            partnerMap[bp.player_id].goodGames++;
            if (won) partnerMap[bp.player_id].goodWins++;
          } else {
            partnerMap[bp.player_id].evilGames++;
            if (won) partnerMap[bp.player_id].evilWins++;
          }
        }
        const partnerIds = Object.keys(partnerMap);
        if (partnerIds.length > 0) {
          const { data: partnerProfiles } = await supabase.from('profiles').select('id, name, nickname').in('id', partnerIds);
          const pNameMap: Record<string, string> = {};
          for (const p of partnerProfiles || []) pNameMap[p.id] = (p as any).nickname || p.name;
          setBotcPartners(
            Object.entries(partnerMap)
              .map(([pid, s]) => ({ name: pNameMap[pid] || '?', ...s }))
              .sort((a, b) => (b.goodGames + b.evilGames) - (a.goodGames + a.evilGames))
              .slice(0, 8)
          );
        }

        const charIds = [...new Set(botcMatchPlayers.map(bp => bp.character_id))];
        const { data: charDefs } = await supabase.from('blood_characters').select('id, name').in('id', charIds);
        const charNameMap: Record<string, string> = {};
        for (const c of charDefs || []) charNameMap[c.id] = c.name;
        const charPerfMap: Record<string, { games: number; wins: number }> = {};
        for (const bp of botcMatchPlayers) {
          if (!charPerfMap[bp.character_id]) charPerfMap[bp.character_id] = { games: 0, wins: 0 };
          charPerfMap[bp.character_id].games++;
          if (winTeamMap[bp.match_id] === bp.team) charPerfMap[bp.character_id].wins++;
        }
        setBotcCharPerf(
          Object.entries(charPerfMap)
            .map(([cid, s]) => ({
              name: charNameMap[cid] || '?',
              games: s.games, wins: s.wins,
              winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
            }))
            .sort((a, b) => b.games - a.games)
        );
      }

      setLoading(false);
    };
    fetchProfile();
  }, [nickname, user]);

  // Activity feed (achievements + communities)
  const activityFeed = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const a of achievements) {
      if (a.granted_at) items.push({ kind: "achievement", date: a.granted_at, title: `Conquistou “${a.name}”`, subtitle: a.description || undefined });
    }
    for (const c of communitiesActivity) items.push(c);
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [achievements, communitiesActivity]);

  const pronounsLabels: Record<string, string> = {
    "ele/dele": "Ele/Dele",
    "ela/dela": "Ela/Dela",
    "elu/delu": "Elu/Delu",
    prefiro_nao_dizer: "Prefiro não dizer",
  };

  const handleProfileSaved = (updated: any, newTags: any[]) => {
    setProfile((current: any) => ({ ...current, ...updated }));
    setPlayerTags(newTags);

    if (updated.nickname && updated.nickname !== nickname) {
      navigate(`/perfil/${updated.nickname}`, { replace: true });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) return notify("error", "Preencha ambos os campos");
    if (newPassword !== confirmPassword) return notify("error", "As senhas não coincidem");
    if (newPassword.length < 8) return notify("error", "Mínimo 8 caracteres");
    if (!/[A-Z]/.test(newPassword)) return notify("error", "Inclua ao menos uma letra maiúscula");
    if (!/[a-z]/.test(newPassword)) return notify("error", "Inclua ao menos uma letra minúscula");
    if (!/[^A-Za-z0-9]/.test(newPassword)) return notify("error", "Inclua ao menos um caractere especial");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return notify("error", error.message);
    notify("success", "Senha alterada com sucesso!");
    setChangingPassword(false); setNewPassword(""); setConfirmPassword("");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return notify("error", "Imagem deve ter no máximo 2MB");
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { data: existing } = await supabase.storage.from("avatars").list(user.id);
    if (existing && existing.length > 0) {
      await supabase.storage.from("avatars").remove(existing.map((f) => `${user.id}/${f.name}`));
    }
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { setUploadingAvatar(false); return notify("error", uploadError.message); }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").update({ avatar_url: avatarUrl } as any).eq("id", user.id);
    setProfile({ ...profile, avatar_url: avatarUrl });
    setUploadingAvatar(false);
    notify("success", "Foto atualizada!");
  };

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
        <Link to="/players"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button></Link>
      </div>
    );
  }

  // ===== Helpers de UI =====
  const stateName = brazilianStates.find((s) => s.uf === profile?.state)?.name || profile?.state;
  const location = [profile?.city, stateName].filter(Boolean).join(", ");
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : null;

  const seasonProgressOf = (s: SeasonContext) => {
    const range = s.max_mmr - s.min_mmr;
    if (range <= 0) return 50;
    return Math.round(((s.current_mmr - s.min_mmr) / range) * 100);
  };
  const daysLeftOf = (s: SeasonContext) => {
    if (!s.end_date) return null;
    return Math.ceil((new Date(s.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const lastMatchLabel = lastMatchDate
    ? new Date(lastMatchDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const chartConfig = opponents.reduce(
    (acc, opp, i) => {
      acc[opp.name] = { label: opp.name, color: CHART_COLORS[i % CHART_COLORS.length] };
      return acc;
    },
    { games: { label: "Partidas Juntos - ", color: CHART_COLORS[0] } } as Record<string, any>,
  );

  const BotcPartnerTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    const good = payload.find((p: any) => p.dataKey === 'goodGames');
    const evil = payload.find((p: any) => p.dataKey === 'evilGames');
    const entry = botcPartners.find(p => p.name === label);
    if (!entry) return null;
    const goodWr = entry.goodGames > 0 ? Math.round((entry.goodWins / entry.goodGames) * 100) : 0;
    const evilWr = entry.evilGames > 0 ? Math.round((entry.evilWins / entry.evilGames) * 100) : 0;
    return (
      <div className="rounded-lg border bg-card p-2 text-xs shadow-md">
        <p className="font-semibold mb-1">{label}</p>
        {good && <p className="text-blue-400">🛡️ Bem: {good.value} jogos — {goodWr}% WR</p>}
        {evil && <p className="text-red-400">💀 Mal: {evil.value} jogos — {evilWr}% WR</p>}
      </div>
    );
  };

  return (
    <div className="container py-10 space-y-6 max-w-6xl">
      {/* ======================= HERO HEADER ======================= */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden bg-gradient-to-br from-card via-card to-secondary/40 border-border">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Avatar */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 flex-1">
                <div className="relative group cursor-pointer flex-shrink-0" onClick={() => isOwnProfile && fileInputRef.current?.click()}>
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-gold/40 to-amber-600/20 blur-sm" />
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="relative h-24 w-24 rounded-full object-cover border-2 border-gold/60" />
                  ) : (
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-secondary text-gold font-bold text-3xl border-2 border-gold/60">
                      {(profile.nickname || profile.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isOwnProfile && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                    </>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold">{profile.name}</h1>
                    {profile.steam_id && (
                      <a href={`https://steamcommunity.com/profiles/${profile.steam_id}`} target="_blank" rel="noopener noreferrer" title="Perfil Steam" className="text-muted-foreground hover:text-foreground transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z"/></svg>
                      </a>
                    )}
                  </div>
                  {(profile.nickname || profile.pronouns) && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap text-sm text-muted-foreground">
                      {profile.nickname && <span className="text-gold">@{profile.nickname}</span>}
                      {profile.nickname && profile.pronouns && <span className="opacity-50">•</span>}
                      {profile.pronouns && <span>{pronounsLabels[profile.pronouns] || profile.pronouns}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-2 justify-center sm:justify-start mt-2 flex-wrap">
                    <Badge variant={role === "admin" ? "default" : "secondary"}>
                      {role === "admin" ? "Admin" : "Player"}
                    </Badge>
                    <PlayerTagsBadges tags={playerTags} />
                    <XpBadge userId={profile.id} variant="compact" />
                  </div>
                  {/* (informações de membro/local foram movidas para a barra inferior do header) */}
                  <div className="mt-3 max-w-[300px] mx-auto sm:mx-0">
                    <XpBadge userId={profile.id} variant="full" />
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-2 lg:gap-3 lg:min-w-[420px] lg:self-center">
                {[
                  { icon: Gamepad2, label: "Partidas", value: stats.totalGames },
                  { icon: Award, label: "Conquistas", value: achievements.length },
                  { icon: MessagesSquare, label: "Comunidades", value: communities.length },
                  { icon: Users, label: "Amigos", value: friendsCount },
                ].map((k, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-3 text-center">
                    <k.icon className="h-4 w-4 mx-auto text-gold mb-1" />
                    <div className="text-2xl font-bold tabular-nums">{k.value}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info row (estilo da imagem: divididas por borda) */}
            {(memberSince || location || lastMatchLabel) && (
              <div className="mt-6 pt-5 border-t border-border/60 grid grid-cols-2 md:grid-cols-3 gap-px bg-border/50 rounded-lg overflow-hidden">
                {memberSince && (
                  <div className="bg-card px-4 py-3 flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Membro desde</div>
                      <div className="text-sm font-semibold mt-0.5">{memberSince}</div>
                    </div>
                  </div>
                )}
                {location && (
                  <div className="bg-card px-4 py-3 flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Localização</div>
                      <div className="text-sm font-semibold mt-0.5 truncate">{location}</div>
                    </div>
                  </div>
                )}
                {lastMatchLabel && (
                  <div className="bg-card px-4 py-3 flex items-start gap-3">
                    <Clock className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Última partida</div>
                      <div className="text-sm font-semibold mt-0.5">{lastMatchLabel}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-5 flex items-center gap-2 justify-center lg:justify-end flex-wrap">
              {isOwnProfile ? (
                <>
                  {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" /> Editar Perfil</Button>}
                  {!changingPassword && !editing && <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}><Lock className="h-4 w-4 mr-1" /> Resetar Senha</Button>}
                </>
              ) : (
                <FriendButton targetUserId={profile.id} />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {isOwnProfile && changingPassword && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Alterar Senha</h2>
            <div className="space-y-2"><Label>Nova Senha</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 especial" /></div>
            <div className="space-y-2"><Label>Confirmar Nova Senha</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Digite a senha novamente" /></div>
            <div className="flex gap-2">
              <Button variant="gold" onClick={handleChangePassword} disabled={savingPassword}>{savingPassword ? "Salvando..." : "Alterar Senha"}</Button>
              <Button variant="outline" onClick={() => { setChangingPassword(false); setNewPassword(""); setConfirmPassword(""); }}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================= CONQUISTAS ======================= */}
      {achievements.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-gold" /> Conquistas
              </h2>
              {achievements.length > 5 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-gold hover:text-gold">
                      Ver todas <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Todas as conquistas ({achievements.length})</DialogTitle></DialogHeader>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {achievements.map((a, i) => (
                        <div key={i} className="rounded-lg border border-border p-3">
                          <div className="font-semibold text-sm">{a.name}</div>
                          {a.description && <div className="text-xs text-muted-foreground mt-1">{a.description}</div>}
                          {a.granted_at && (
                            <div className="text-[10px] text-gold mt-2">
                              Conquistada em {new Date(a.granted_at).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {achievements.slice(0, 5).map((a, i) => (
                <div key={i} className="rounded-lg border border-border bg-background/40 p-3 hover:border-gold/40 transition-colors">
                  <div className="font-semibold text-sm leading-snug">{a.name}</div>
                  {a.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</div>}
                  {a.granted_at && (
                    <div className="text-[10px] text-gold mt-2">
                      Conquistada em {new Date(a.granted_at).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================= JOGOS EM DESTAQUE ======================= */}
      {gamePerformance.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Gamepad2 className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold">Jogos em destaque</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Os jogos com mais partidas e suas estatísticas</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {gamePerformance.slice(0, 4).map((gp) => (
                <Link
                  key={gp.game_id}
                  to={gp.game_slug ? `/jogos/${gp.game_slug}` : "#"}
                  className="group rounded-xl overflow-hidden border border-border bg-background/40 hover:border-gold/50 transition-all"
                >
                  <div className="relative h-32 bg-secondary overflow-hidden">
                    {gp.image_url ? (
                      <img src={gp.image_url} alt={gp.game_name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gold/40">
                        <Gamepad2 className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3">
                      <div className="font-semibold text-sm text-white drop-shadow line-clamp-1">{gp.game_name}</div>
                      <div className="text-[10px] text-white/80">{gp.games} partidas</div>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className="font-bold text-gold tabular-nums">{gp.winPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gold to-amber-400" style={{ width: `${gp.winPct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Recorde</span>
                      <span className="font-bold tabular-nums">{gp.best}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================= SEASON + ATIVIDADE ======================= */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Seasons (carousel se houver mais de uma) */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gold" />
                <h2 className="text-lg font-semibold">
                  {seasonsList.length > 1 ? "Seasons" : "Season"}
                </h2>
              </div>
              {seasonsList.length > 1 && (
                <span className="text-[11px] text-muted-foreground">
                  {seasonsList.length} temporadas
                </span>
              )}
            </div>
            {seasonsList.length > 0 ? (
              <Carousel opts={{ align: "start" }} className="w-full">
                <CarouselContent>
                  {seasonsList.map((s) => {
                    const progress = seasonProgressOf(s);
                    const left = daysLeftOf(s);
                    const isActive = s.status === "active";
                    return (
                      <CarouselItem key={s.id} className="basis-full">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">{s.name}</span>
                            <Badge
                              className={cn(
                                "border",
                                isActive
                                  ? "bg-gold/15 text-gold border-gold/30 hover:bg-gold/15"
                                  : "bg-muted text-muted-foreground border-border hover:bg-muted",
                              )}
                            >
                              {isActive ? "Ativa" : s.status === "finished" ? "Encerrada" : s.status}
                            </Badge>
                          </div>
                          {isActive && left !== null && left > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Termina em {left} {left === 1 ? "dia" : "dias"}
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border bg-background/40 p-3">
                              <div className="text-xs text-muted-foreground">Sua posição</div>
                              <div className="text-2xl font-bold text-gold tabular-nums">
                                #{s.position}
                                <span className="text-sm text-muted-foreground font-normal"> de {s.total}</span>
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-background/40 p-3">
                              <div className="text-xs text-muted-foreground">MMR {isActive ? "atual" : "final"}</div>
                              <div className="text-2xl font-bold tabular-nums">{Math.round(s.current_mmr)}</div>
                            </div>
                          </div>
                          <div>
                            <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-700 via-gold to-amber-300 rounded-full" style={{ width: `${progress}%` }} />
                              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-gold border-2 border-background shadow" style={{ left: `${progress}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                              <span>{Math.round(s.min_mmr)}</span>
                              <span className="text-gold font-semibold">{Math.round(s.current_mmr)}</span>
                              <span>{Math.round(s.max_mmr)}</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link to={`/seasons/${s.id}`}>
                              Ver ranking completo <ChevronRight className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                {seasonsList.length > 1 && (
                  <>
                    <CarouselPrevious className="-left-3" />
                    <CarouselNext className="-right-3" />
                  </>
                )}
              </Carousel>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Sem participação em seasons ainda.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Atividade recente */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold">Atividade recente</h2>
            </div>
            {activityFeed.length > 0 ? (
              <div className="space-y-2">
                {activityFeed.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      a.kind === "achievement" ? "bg-gold/15 text-gold" : "bg-blue-500/15 text-blue-400",
                    )}>
                      {a.kind === "achievement" ? <Award className="h-4 w-4" /> : <MessagesSquare className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{a.title}</p>
                      {a.subtitle && <p className="text-xs text-muted-foreground line-clamp-1">{a.subtitle}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(a.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem atividade recente.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ======================= PRÓXIMAS PARTIDAS ======================= */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-semibold">Próximas partidas</h2>
          </div>
          {upcomingRooms.length > 0 ? (
            <div className="space-y-2">
              {upcomingRooms.map((r) => {
                const d = new Date(r.scheduled_at);
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3 hover:border-gold/40 transition-colors">
                    <DateBlock date={r.scheduled_at} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{r.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Gamepad2 className="h-3 w-3 text-gold" /> {r.game_name}
                        <span>·</span>
                        <Clock className="h-3 w-3" />
                        {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {r.status === "open" ? "Aberta" : "Cheia"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma partida agendada.</p>
          )}
        </CardContent>
      </Card>

      {/* ======================= PARTIDAS RECENTES ======================= */}
      {recentMatches.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold">Partidas recentes</h2>
            </div>
            <Carousel opts={{ align: "start", slidesToScroll: "auto" }} className="w-full">
              <CarouselContent className="-ml-3">
                {recentMatches.map((m) => (
                  <CarouselItem
                    key={m.match_id}
                    className="pl-3 basis-[78%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                  >
                    <RecentMatchCardCompact m={m} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-3" />
              <CarouselNext className="-right-3" />
            </Carousel>
          </CardContent>
        </Card>
      )}

      {/* ======================= COMUNIDADES + AMIGOS ======================= */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <MessagesSquare className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold">Comunidades</h2>
            </div>
            {communities.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {communities.slice(0, 6).map((c) => (
                  <Link key={c.id} to={`/comunidades/${c.slug}`} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background/40 hover:border-gold/40 transition-colors">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-gold font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-sm truncate flex-1">{c.name}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Não participa de nenhuma comunidade ainda.</p>
            )}
          </CardContent>
        </Card>

        <div>
          <FriendsList userId={profile?.id} />
        </div>
      </div>

      {isOwnProfile && profile && user && (
        <EditProfileDialog
          open={editing}
          onOpenChange={setEditing}
          userId={user.id}
          initialProfile={profile}
          initialTags={playerTags}
          onSaved={handleProfileSaved}
        />
      )}

      {/* (Estatísticas Detalhadas removidas — disponíveis nos slugs de Jogo/Season) */}
    </div>
  );
};

export default PlayerProfile;
