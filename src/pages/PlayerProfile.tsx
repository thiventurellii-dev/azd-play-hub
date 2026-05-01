import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/components/NotificationDialog";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { useProfileTags } from "@/hooks/useProfileTags";
import { usePlayerProfileData } from "@/hooks/usePlayerProfileData";
import { useProfileRpgData } from "@/hooks/useProfileRpgData";
import ProfileHero from "@/components/profile/ProfileHero";
import ProfileSpotlight from "@/components/profile/ProfileSpotlight";
import ProfileUpcomingMatches from "@/components/profile/ProfileUpcomingMatches";
import ProfileRecentMatchesStrip from "@/components/profile/ProfileRecentMatchesStrip";
import ProfileDomainTabs from "@/components/profile/ProfileDomainTabs";
import BoardgamesTab from "@/components/profile/tabs/BoardgamesTab";
import BotcTab from "@/components/profile/tabs/BotcTab";
import RpgTab from "@/components/profile/tabs/RpgTab";
import ProfileTimeline, { type TimelineEvent } from "@/components/profile/ProfileTimeline";
import ProfileAchievements from "@/components/profile/ProfileAchievements";
import ProfileFooterGrid from "@/components/profile/ProfileFooterGrid";
import { AchievementBadge } from "@/components/achievements/AchievementBadge";
import { usePlayerAchievements } from "@/hooks/useAchievements";
import { useQueryClient } from "@tanstack/react-query";

const PlayerProfile = () => {
  const { nickname } = useParams();
  const { user } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = usePlayerProfileData(nickname);
  const profile = data?.profile;
  const profileId = profile?.id as string | undefined;
  const { data: rpgData } = useProfileRpgData(profileId);
  const { data: achData } = usePlayerAchievements(profileId);
  const { tags: playerTags, setTags: setPlayerTags } = useProfileTags(profileId);

  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const isOwnProfile = !!(user && profile && user.id === profile.id);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return notify("error", "Imagem deve ter no máximo 2MB");
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { data: existing } = await supabase.storage.from("avatars").list(user.id);
    if (existing && existing.length > 0) {
      await supabase.storage
        .from("avatars")
        .remove(existing.map((f) => `${user.id}/${f.name}`));
    }
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setUploadingAvatar(false);
      return notify("error", uploadError.message);
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").update({ avatar_url: avatarUrl } as any).eq("id", user.id);
    qc.invalidateQueries({ queryKey: ["player-profile-full"] });
    setUploadingAvatar(false);
    notify("success", "Foto atualizada!");
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) return notify("error", "Preencha ambos os campos");
    if (newPassword !== confirmPassword) return notify("error", "As senhas não coincidem");
    if (newPassword.length < 8) return notify("error", "Mínimo 8 caracteres");
    if (!/[A-Z]/.test(newPassword)) return notify("error", "Inclua ao menos uma maiúscula");
    if (!/[a-z]/.test(newPassword)) return notify("error", "Inclua ao menos uma minúscula");
    if (!/[^A-Za-z0-9]/.test(newPassword)) return notify("error", "Inclua ao menos um especial");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return notify("error", error.message);
    notify("success", "Senha alterada com sucesso!");
    setChangingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleProfileSaved = (updated: any, newTags: any[]) => {
    setPlayerTags(newTags);
    qc.invalidateQueries({ queryKey: ["player-profile-full"] });
    if (updated.nickname && updated.nickname !== nickname) {
      navigate(`/perfil/${updated.nickname}`, { replace: true });
    }
  };

  // Spotlight
  const activeSeason = data?.seasons.find((s) => s.status === "active") || null;
  const masteringCampaign =
    rpgData?.campaigns.find((c) => c.is_master && c.status === "active") || null;

  // Timeline (agregada em memória)
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    if (!data) return [];
    const events: TimelineEvent[] = [];
    for (const m of data.recentMatches.slice(0, 8)) {
      const won = m.position === 1;
      const delta = Number(m.mmr_change || 0);
      events.push({
        id: `m-${m.match_id}`,
        type: won ? "match_won" : "match_played",
        date: m.played_at,
        title: won ? (
          <>
            <span className="text-gold">Venceu</span> em{" "}
            <span className="font-medium">{m.game_name}</span>
            {m.is_competitive && delta !== 0 && (
              <span className="text-muted-foreground">
                {" · "}
                {delta > 0 ? "+" : ""}
                {delta.toFixed(0)} MMR
              </span>
            )}
          </>
        ) : (
          <>
            Jogou <span className="font-medium">{m.game_name}</span>
            {m.position != null && (
              <span className="text-muted-foreground"> · {m.position}º lugar</span>
            )}
          </>
        ),
      });
    }
    for (const a of (achData?.visible ?? []).slice(0, 5)) {
      if (!a.unlocked_at) continue;
      events.push({
        id: `a-${a.id}`,
        type: "achievement",
        date: a.unlocked_at,
        badge: (
          <AchievementBadge
            category={a.template.category}
            rarity={a.template.rarity}
            level={a.template.progression_level ?? undefined}
            size="mini"
          />
        ),
        title: (
          <>
            Conquistou <span className="text-gold font-medium">{a.template.name}</span>
          </>
        ),
      });
    }
    for (const c of data.communities.slice(0, 5)) {
      events.push({
        id: `c-${c.id}`,
        type: "community_joined",
        date: c.joined_at,
        title: (
          <>
            Entrou em <span className="text-domain-info font-medium">{c.name}</span>
          </>
        ),
      });
    }
    return events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }
  if (!data || !profile) {
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

  const counts = {
    boardgame: data.boardgame.totalGames,
    botc: data.botc.gamesPlayed + data.botc.storytellerGames,
    rpg: (rpgData?.campaigns.length ?? 0) + (rpgData?.characters.length ?? 0),
  };

  return (
    <div className="container py-6 max-w-6xl space-y-5">
      <ProfileHero
        profile={profile}
        role={data.role}
        isMaster={data.isMaster}
        isStoryteller={data.isStoryteller}
        mainCommunity={data.mainCommunity}
        isOwnProfile={isOwnProfile}
        uploadingAvatar={uploadingAvatar}
        playerTags={playerTags}
        onAvatarChange={handleAvatarUpload}
        onEditProfile={() => setEditing(true)}
        onChangePassword={() => setChangingPassword(true)}
      />

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
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

      <ProfileSpotlight activeSeason={activeSeason} masteringCampaign={masteringCampaign} />

      <ProfileUpcomingMatches
        rooms={data.upcomingRooms}
        canSee={() => true /* fase 1: match_rooms ainda não tem flag de privacidade */}
      />

      <ProfileRecentMatchesStrip
        matches={data.recentMatches}
        ownerNickname={profile.nickname}
      />

      <ProfileAchievements profileId={profile.id} isOwnProfile={isOwnProfile} />

      <ProfileDomainTabs counts={counts}>
        {(active) => {
          if (active === "boardgame") {
            return (
              <BoardgamesTab
                showcased={data.boardgame.performance.slice(0, 4)}
                partners={data.boardgame.partners}
                isOwnProfile={isOwnProfile}
              />
            );
          }
          if (active === "botc") {
            return <BotcTab stats={data.botc} />;
          }
          return (
            <RpgTab
              stats={
                rpgData ?? {
                  asMaster: { activeCampaigns: 0, sessions: 0, totalMinutes: 0, uniquePlayers: 0 },
                  asPlayer: { activeCampaigns: 0, characters: 0, sessions: 0, totalMinutes: 0 },
                  campaigns: [],
                  characters: [],
                  partners: [],
                }
              }
              isOwnProfile={isOwnProfile}
            />
          );
        }}
      </ProfileDomainTabs>

      <ProfileTimeline events={timelineEvents} ownerNickname={profile.nickname} />

      <ProfileFooterGrid profileId={profile.id} communities={data.communities} />

      {isOwnProfile && user && (
        <EditProfileDialog
          open={editing}
          onOpenChange={setEditing}
          userId={user.id}
          initialProfile={profile}
          initialTags={playerTags}
          onSaved={handleProfileSaved}
        />
      )}
    </div>
  );
};

export default PlayerProfile;
