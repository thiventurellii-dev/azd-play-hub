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
  Users, MessagesSquare, MapPin, Sparkles, BarChart3, ChevronRight,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import FriendButton from "@/components/friendlist/FriendButton";
import FriendsList from "@/components/friendlist/FriendsList";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import {
  brazilianStates, citiesByState, pronounsOptions, countryCodes,
  formatPhone, unformatPhone,
} from "@/lib/brazil-data";
import { Camera } from "lucide-react";
import XpBadge from "@/components/shared/XpBadge";
import DateBlock from "@/components/shared/DateBlock";
import { RecentMatchItem } from "@/components/profile/RecentMatchCard";
import RecentMatchCardCompact from "@/components/profile/RecentMatchCardCompact";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

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
  const [form, setForm] = useState({
    name: "", nickname: "", phone: "", country_code: "+55",
    state: "", city: "", birth_date: "", gender: "", pronouns: "", email: "",
  });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = user && profile && user.id === profile.id;
  const cities = citiesByState[form.state] || [];

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: prof } = await supabase
        .from("profiles").select("*").eq("nickname", nickname as string).maybeSingle();
      if (!prof) { setLoading(false); return; }
      setProfile(prof);
      setForm({
        name: prof.name || "", nickname: (prof as any).nickname || "",
        phone: formatPhone((prof as any).phone || ""), country_code: (prof as any).country_code || "+55",
        state: (prof as any).state || "", city: (prof as any).city || "",
        birth_date: (prof as any).birth_date || "", gender: (prof as any).gender || "",
        pronouns: (prof as any).pronouns || "", email: (prof as any).email || "",
      });
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

  const handleSaveProfile = async () => {
    if (!user || !isOwnProfile) return;
    if (!form.name || !form.nickname || !form.phone || !form.state || !form.city || !form.birth_date || !form.gender || !form.pronouns) {
      return notify("error", "Preencha todos os campos obrigatórios");
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      name: form.name, nickname: form.nickname, phone: unformatPhone(form.phone),
      country_code: form.country_code, state: form.state, city: form.city,
      birth_date: form.birth_date, gender: form.gender, pronouns: form.pronouns, email: form.email,
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) return notify("error", error.message);
    notify("success", "Perfil atualizado!");
    setEditing(false);
    setProfile({ ...profile, ...form, phone: unformatPhone(form.phone) });
    if (form.nickname !== nickname) navigate(`/perfil/${form.nickname}`, { replace: true });
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
                  {profile.nickname && <p className="text-gold text-sm">@{profile.nickname}</p>}
                  <div className="flex items-center gap-2 justify-center sm:justify-start mt-2 flex-wrap">
                    <Badge variant={role === "admin" ? "default" : "secondary"}>
                      {role === "admin" ? "Admin" : "Player"}
                    </Badge>
                    <XpBadge userId={profile.id} variant="compact" />
                  </div>
                  <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:gap-4 text-xs text-muted-foreground items-center sm:items-start justify-center sm:justify-start">
                    {memberSince && (
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-gold" /> Desde {memberSince}</span>
                    )}
                    {location && (
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gold" /> {location}</span>
                    )}
                  </div>
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

      {/* ======================= EDIT FORMS ======================= */}
      {isOwnProfile && editing && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar Perfil</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Nickname *</Label><Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nome Completo *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>E-mail</Label><Input value={form.email} disabled className="opacity-60" /></div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <div className="flex gap-2">
                <Select value={form.country_code} onValueChange={(v) => setForm({ ...form, country_code: v })}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{countryCodes.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" className="flex-1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado *</Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, city: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{brazilianStates.map((s) => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })} disabled={!form.state}>
                  <SelectTrigger><SelectValue placeholder={form.state ? "Selecione" : "Selecione o estado"} /></SelectTrigger>
                  <SelectContent>{cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Data de Nascimento *</Label><div className="relative"><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="pr-10" /><CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" /></div></div>
              <div className="space-y-2">
                <Label>Gênero *</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="nao_binario">Não-binário</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pronomes *</Label>
              <Select value={form.pronouns} onValueChange={(v) => setForm({ ...form, pronouns: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{pronounsOptions.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button variant="gold" onClick={handleSaveProfile} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

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
        {/* Season atual */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-semibold">Season atual</h2>
            </div>
            {seasonCtx ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{seasonCtx.name}</span>
                  <Badge className="bg-gold/15 text-gold border-gold/30 hover:bg-gold/15">Ativa</Badge>
                </div>
                {daysLeft !== null && daysLeft > 0 && (
                  <p className="text-xs text-muted-foreground">Termina em {daysLeft} {daysLeft === 1 ? "dia" : "dias"}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">Sua posição</div>
                    <div className="text-2xl font-bold text-gold tabular-nums">
                      #{seasonCtx.position}
                      <span className="text-sm text-muted-foreground font-normal"> de {seasonCtx.total}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">MMR atual</div>
                    <div className="text-2xl font-bold tabular-nums">{Math.round(seasonCtx.current_mmr)}</div>
                  </div>
                </div>
                <div>
                  <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-700 via-gold to-amber-300 rounded-full" style={{ width: `${seasonProgress}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-gold border-2 border-background shadow" style={{ left: `${seasonProgress}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                    <span>{Math.round(seasonCtx.min_mmr)}</span>
                    <span className="text-gold font-semibold">{Math.round(seasonCtx.current_mmr)}</span>
                    <span>{Math.round(seasonCtx.max_mmr)}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to={`/seasons/${seasonCtx.id}`}>Ver ranking completo <ChevronRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Sem participação em uma season ativa.
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
            <div className="space-y-2">
              {recentMatches.map((m) => <RecentMatchCard key={m.match_id} m={m} />)}
            </div>
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

      {/* ======================= ESTATÍSTICAS DETALHADAS ======================= */}
      {(gamePerformance.length > 0 || botcStats || opponents.length > 0) && (
        <Card className="bg-card border-border">
          <CardContent className="pt-2 pb-2">
            <Accordion type="single" collapsible>
              <AccordionItem value="stats" className="border-none">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-gold" />
                    <span className="text-lg font-semibold">Estatísticas detalhadas</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pt-2">
                    {opponents.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Principais Jogadores</h3>
                        <ChartContainer config={chartConfig} className="h-[250px]">
                          <BarChart data={opponents} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="games" radius={[0, 4, 4, 0]} fill="hsl(var(--gold))">
                              {opponents.map((_, idx) => (
                                <rect key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      </div>
                    )}

                    {gamePerformance.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Performance por Jogo</h3>
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
                                      <Link to={`/jogos/${gp.game_slug}`} className="hover:text-gold transition-colors">{gp.game_name}</Link>
                                    ) : gp.game_name}
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
                      </div>
                    )}

                    {botcStats && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Blood on the Clocktower</h3>
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                          {[
                            { label: "Partidas", value: botcStats.gamesPlayed, icon: "🩸" },
                            { label: "Vitórias (Bem)", value: botcStats.winsGood, icon: "🛡️" },
                            { label: "Vitórias (Mal)", value: botcStats.winsEvil, icon: "💀" },
                            { label: "Narrador", value: botcStats.storytellerGames, icon: "📖" },
                          ].map((s, i) => (
                            <div key={i} className="rounded-lg border border-border bg-background/40 p-3 text-center">
                              <p className="text-xl mb-1">{s.icon}</p>
                              <p className="text-xl font-bold">{s.value}</p>
                              <p className="text-[10px] text-muted-foreground">{s.label}</p>
                            </div>
                          ))}
                        </div>

                        {botcPartners.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Parceiros de partida</h4>
                            <div className="h-[300px]">
                              <BarChart
                                data={botcPartners}
                                layout="vertical"
                                width={700}
                                height={280}
                                margin={{ left: 80, right: 20, top: 5, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" width={75} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                                <RechartsTooltip content={<BotcPartnerTooltip />} />
                                <Legend formatter={(value: string) => value === 'goodGames' ? '🛡️ Bem' : '💀 Mal'} wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="goodGames" stackId="a" fill="hsl(210, 70%, 55%)" name="goodGames" />
                                <Bar dataKey="evilGames" stackId="a" fill="hsl(0, 60%, 50%)" radius={[0, 4, 4, 0]} name="evilGames" />
                              </BarChart>
                            </div>
                          </div>
                        )}

                        {botcCharPerf.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Performance por personagem</h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Personagem</TableHead>
                                    <TableHead className="text-center">Vezes Jogado</TableHead>
                                    <TableHead className="text-center">% Vitória</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {botcCharPerf.map((cp) => (
                                    <TableRow key={cp.name}>
                                      <TableCell className="font-medium">{cp.name}</TableCell>
                                      <TableCell className="text-center">{cp.games}</TableCell>
                                      <TableCell className="text-center">{cp.winPct}%</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlayerProfile;
