import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Trophy, Gamepad2, ArrowLeft, Calendar, Clock, Users, Award, Pencil, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import FriendButton from "@/components/friendlist/FriendButton";
import FriendsList from "@/components/friendlist/FriendsList";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import {
  brazilianStates,
  citiesByState,
  pronounsOptions,
  countryCodes,
  formatPhone,
  unformatPhone,
} from "@/lib/brazil-data";
import { Camera } from "lucide-react";
import { useRef } from "react";

const CHART_COLORS = [
  "hsl(43, 100%, 50%)", // gold
  "hsl(200, 80%, 55%)", // blue
  "hsl(150, 60%, 45%)", // green
  "hsl(340, 70%, 55%)", // pink
  "hsl(270, 60%, 55%)", // purple
  "hsl(25, 85%, 55%)", // orange
  "hsl(180, 60%, 45%)", // teal
  "hsl(0, 70%, 55%)", // red
];

const PlayerProfile = () => {
  const { nickname } = useParams();
  const { user, isAdmin } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string>("player");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalGames: 0, uniqueGames: 0 });
  const [gamePerformance, setGamePerformance] = useState<any[]>([]);
  const [opponents, setOpponents] = useState<{ name: string; games: number; wins: number }[]>([]);
  const [upcomingRooms, setUpcomingRooms] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<{ icon: string; name: string; description: string | null }[]>([]);

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    phone: "",
    country_code: "+55",
    state: "",
    city: "",
    birth_date: "",
    gender: "",
    pronouns: "",
    email: "",
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
        .from("profiles")
        .select("*")
        .eq("nickname", nickname as string)
        .maybeSingle();
      if (!prof) {
        setLoading(false);
        return;
      }
      setProfile(prof);
      // Populate edit form
      setForm({
        name: prof.name || "",
        nickname: (prof as any).nickname || "",
        phone: formatPhone((prof as any).phone || ""),
        country_code: (prof as any).country_code || "+55",
        state: (prof as any).state || "",
        city: (prof as any).city || "",
        birth_date: (prof as any).birth_date || "",
        gender: (prof as any).gender || "",
        pronouns: (prof as any).pronouns || "",
        email: (prof as any).email || "",
      });
      // Role
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", prof.id).maybeSingle();
      if (roleData) setRole(roleData.role);

      // Match results
      const { data: results } = await supabase
        .from("match_results")
        .select("match_id, position, score")
        .eq("player_id", prof.id);
      if (!results || results.length === 0) {
        setStats({ totalGames: 0, uniqueGames: 0 });
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

      setStats({
        totalGames: results.length,
        uniqueGames: gameIds.length,
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

      // Achievements
      const { data: playerAchs } = await supabase
        .from("player_achievements")
        .select("achievement_id")
        .eq("player_id", prof.id);
      if (playerAchs && playerAchs.length > 0) {
        const achIds = playerAchs.map((a: any) => a.achievement_id);
        const { data: achDefs } = await supabase
          .from("achievement_definitions")
          .select("name, description, icon")
          .in("id", achIds);
        setAchievements((achDefs || []) as any[]);
      }

      setLoading(false);
    };
    fetchProfile();
  }, [nickname, user]);

  const handleSaveProfile = async () => {
    if (!user || !isOwnProfile) return;
    if (
      !form.name ||
      !form.nickname ||
      !form.phone ||
      !form.state ||
      !form.city ||
      !form.birth_date ||
      !form.gender ||
      !form.pronouns
    ) {
      return notify("error", "Preencha todos os campos obrigatórios");
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: form.name,
        nickname: form.nickname,
        phone: unformatPhone(form.phone),
        country_code: form.country_code,
        state: form.state,
        city: form.city,
        birth_date: form.birth_date,
        gender: form.gender,
        pronouns: form.pronouns,
        email: form.email,
      } as any)
      .eq("id", user.id);
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
    setChangingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
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
    if (uploadError) {
      setUploadingAvatar(false);
      return notify("error", uploadError.message);
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
    await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl } as any)
      .eq("id", user.id);
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
        <Link to="/players">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const chartConfig = opponents.reduce(
    (acc, opp, i) => {
      acc[opp.name] = { label: opp.name, color: CHART_COLORS[i % CHART_COLORS.length] };
      return acc;
    },
    { games: { label: "Partidas Juntos - ", color: CHART_COLORS[0] } } as Record<string, any>,
  );

  return (
    <div className="container py-10 space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6">
            <div
              className="relative group cursor-pointer flex-shrink-0"
              onClick={() => isOwnProfile && fileInputRef.current?.click()}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-gold font-bold text-3xl">
                  {(profile.nickname || profile.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              {isOwnProfile && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              )}
              {isOwnProfile && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                {profile.steam_id && (
                  <a
                    href={`https://steamcommunity.com/profiles/${profile.steam_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Perfil Steam"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.63 11.17l3.69-5.27a3.48 3.48 0 01-.32-1.46c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5c-.5 0-.97-.11-1.4-.3L9.84 24c.7.1 1.42.15 2.16.15 6.63 0 12-5.37 12-12S18.63 0 12 0z"/>
                    </svg>
                  </a>
                )}
              </div>
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
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {isOwnProfile ? (
                <>
                  {!editing && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      <Pencil className="h-4 w-4 mr-1" /> Editar Perfil
                    </Button>
                  )}
                  {!changingPassword && !editing && (
                    <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
                      <Lock className="h-4 w-4 mr-1" /> Resetar Senha
                    </Button>
                  )}
                </>
              ) : (
                <FriendButton targetUserId={profile.id} />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Profile Form */}
      {isOwnProfile && editing && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar Perfil</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nickname *</Label>
                <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={form.email} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <div className="flex gap-2">
                <Select value={form.country_code} onValueChange={(v) => setForm({ ...form, country_code: v })}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodes.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  placeholder="(11) 99999-9999"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado *</Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, city: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map((s) => (
                      <SelectItem key={s.uf} value={s.uf}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })} disabled={!form.state}>
                  <SelectTrigger>
                    <SelectValue placeholder={form.state ? "Selecione" : "Selecione o estado"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de Nascimento *</Label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gênero *</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {pronounsOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Integração Steam</Label>
              {profile.steam_id ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.63 11.17l3.69-5.27a3.48 3.48 0 01-.32-1.46c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5c-.5 0-.97-.11-1.4-.3L9.84 24c.7.1 1.42.15 2.16.15 6.63 0 12-5.37 12-12S18.63 0 12 0z"/>
                    </svg>
                    Vinculada: {profile.steam_id}
                  </Badge>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const returnTo = `${window.location.origin}/auth/steam/callback`;
                    const resp = await fetch(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-auth?action=login&return_to=${encodeURIComponent(returnTo)}`
                    );
                    const json = await resp.json();
                    if (json.url) window.location.href = json.url;
                  }}
                  className="gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.63 11.17l3.69-5.27a3.48 3.48 0 01-.32-1.46c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5c-.5 0-.97-.11-1.4-.3L9.84 24c.7.1 1.42.15 2.16.15 6.63 0 12-5.37 12-12S18.63 0 12 0z"/>
                  </svg>
                  Vincular Steam
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="gold" onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password Form */}
      {isOwnProfile && changingPassword && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" /> Alterar Senha
            </h2>
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 especial"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="gold" onClick={handleChangePassword} disabled={savingPassword}>
                {savingPassword ? "Salvando..." : "Alterar Senha"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setChangingPassword(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2">
        {[
          { icon: Trophy, label: "Total de Partidas", value: stats.totalGames },
          { icon: Gamepad2, label: "Jogos Diferentes", value: stats.uniqueGames },
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

      {/* Opponents chart with varied colors */}
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
                <Bar
                  dataKey="games"
                  radius={[0, 4, 4, 0]}
                  fill="hsl(var(--gold))"
                  // Use different colors per bar via Cell
                >
                  {opponents.map((_, idx) => (
                    <rect key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
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

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-gold" /> Conquistas
            </h2>
            <div className="flex flex-wrap gap-2">
              {achievements.map((a, i) => (
                <Badge key={i} variant="outline" className="text-sm py-1.5 px-3 border-gold/30">
                  {a.icon} {a.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friends List - always visible */}
      <FriendsList />

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
