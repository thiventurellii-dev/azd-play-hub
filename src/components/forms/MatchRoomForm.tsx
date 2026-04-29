import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { X, ChevronLeft, Gamepad2, Skull, Sword } from "lucide-react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { sendMatchNotification } from "@/lib/matchNotification";

/* ── Types ─────────────────────────────────────────── */

interface Game { id: string; name: string; slug: string | null; max_players: number | null }
interface BloodScript { id: string; name: string }
interface RoomTag { id: string; name: string }
interface Season { id: string; name: string; status: string; type: string }

export interface MatchRoomData {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  max_players: number;
  season_id?: string | null;
  blood_script_id?: string | null;
  community_id?: string | null;
  community_only?: boolean;
  platform?: string | null;
  game: { id: string; name: string; image_url: string | null };
}

const PLATFORM_OPTIONS = [
  "Presencial",
  "Tabletop Simulator",
  "BoardGame Arena",
  "Discord",
  "Outro Online",
];

interface MatchRoomFormProps {
  room?: MatchRoomData | null;
  isAdminMode?: boolean;
  onSuccess?: () => void;
}

const useFormOptions = (enabled: boolean, userId?: string) =>
  useQuery({
    queryKey: ["match-room-form-options", userId],
    queryFn: async () => {
      const sb: any = supabase;
      const [gamesRes, scriptsRes, tagsRes, seasonsRes, communitiesRes, campaignsRes] = await Promise.all([
        supabase.from("games").select("id, name, slug, max_players").order("name"),
        supabase.from("blood_scripts").select("id, name").order("name"),
        supabase.from("room_tags").select("id, name").order("name"),
        supabase.from("seasons").select("id, name, status, type").in("status", ["active", "upcoming"]).order("name"),
        userId
          ? sb
              .from("community_members")
              .select("community_id, communities(id, name, slug)")
              .eq("user_id", userId)
              .eq("status", "active")
          : Promise.resolve({ data: [] }),
        userId
          ? sb
              .from("rpg_campaigns")
              .select("id, name, status, master_id, adventure_id")
              .eq("master_id", userId)
              .in("status", ["planning", "active"])
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      return {
        games: (gamesRes.data ?? []) as Game[],
        scripts: (scriptsRes.data ?? []) as BloodScript[],
        tags: (tagsRes.data ?? []) as RoomTag[],
        seasons: (seasonsRes.data ?? []) as Season[],
        communities: ((communitiesRes.data ?? []) as any[])
          .map((r) => r.communities)
          .filter(Boolean) as { id: string; name: string; slug: string }[],
        campaigns: (campaignsRes.data ?? []) as { id: string; name: string; status: string; adventure_id: string | null }[],
      };
    },
    enabled,
    staleTime: 30_000,
  });

const categoryCards = [
  {
    id: "boardgame" as const,
    label: "Boardgame",
    description: "Jogos de tabuleiro",
    icon: Gamepad2,
    iconColor: "text-gold",
    borderHover: "hover:border-gold/60",
    borderActive: "border-gold",
  },
  {
    id: "botc" as const,
    label: "Blood on the Clocktower",
    description: "BotC",
    icon: Skull,
    iconColor: "text-red-400",
    borderHover: "hover:border-red-500/60",
    borderActive: "border-red-500",
  },
  {
    id: "rpg" as const,
    label: "RPG",
    description: "Sessão de campanha",
    icon: Sword,
    iconColor: "text-purple-400",
    borderHover: "hover:border-purple-500/60",
    borderActive: "border-purple-500",
  },
];

const MatchRoomForm = ({ room, isAdminMode = false, onSuccess }: MatchRoomFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!room;

  const { data: options, isLoading: optionsLoading } = useFormOptions(true, user?.id);
  const games = useMemo(() => options?.games ?? [], [options?.games]);
  const bloodScripts = useMemo(() => options?.scripts ?? [], [options?.scripts]);
  const availableTags = useMemo(() => options?.tags ?? [], [options?.tags]);
  const seasons = useMemo(() => options?.seasons ?? [], [options?.seasons]);
  const userCommunities = useMemo(() => options?.communities ?? [], [options?.communities]);
  const userCampaigns = useMemo(() => options?.campaigns ?? [], [options?.campaigns]);

  const [category, setCategory] = useState<"boardgame" | "botc" | "rpg" | "">("");
  const [gameId, setGameId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const now = new Date();
  const [scheduledDate, setScheduledDate] = useState(isEdit ? "" : now.toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState(isEdit ? "" : now.toTimeString().slice(0, 5));
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [communityOnly, setCommunityOnly] = useState(false);
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  useEffect(() => {
    if (!room) return;
    setGameId(room.game?.id ?? "");
    setTitle(room.title ?? "");
    setDescription(room.description ?? "");
    const d = new Date(room.scheduled_at);
    setScheduledDate(d.toISOString().slice(0, 10));
    setScheduledTime(d.toTimeString().slice(0, 5));
    setMaxPlayers(String(room.max_players ?? 10));
    setSelectedSeasonId(room.season_id ?? "");
    setSelectedScriptId(room.blood_script_id ?? "");
    setSelectedCommunityId(room.community_id ?? "");
    setCommunityOnly(!!room.community_only);
    setPlatform(room.platform ?? "");
    setStatus("");
    const game = games.find(g => g.id === room.game?.id);
    if (game?.slug === "blood-on-the-clocktower") {
      setCategory("botc");
    } else {
      setCategory("boardgame");
    }
  }, [room, games]);

  useEffect(() => {
    if (!room?.id) return;
    supabase
      .from("match_room_tag_links")
      .select("tag_id")
      .eq("room_id", room.id)
      .then(({ data }) => {
        if (data) setSelectedTagIds(data.map(t => t.tag_id));
      });
  }, [room?.id]);

  useEffect(() => {
    if (isEdit) return;
    const game = games.find(g => g.id === gameId);
    if (game?.max_players) setMaxPlayers(String(game.max_players));
  }, [gameId, games, isEdit]);

  const isBotC = category === "botc";
  const isRpg = category === "rpg";
  const botcGame = games.find(g => g.slug === "blood-on-the-clocktower");
  const rpgGame = games.find(g => g.slug === "rpg-generico" || g.slug === "rpg-generic" || g.name?.toLowerCase() === "rpg");
  const selectedCampaign = userCampaigns.find(c => c.id === selectedCampaignId);

  const filteredGames = games.filter(g => {
    if (category === "boardgame") return g.slug !== "blood-on-the-clocktower" && g.slug !== "rpg-generico" && g.slug !== "rpg-generic";
    return true;
  });

  const filteredSeasons = category === "boardgame"
    ? seasons.filter(s => s.type === "boardgame" && s.status === "active")
    : category === "botc"
      ? seasons.filter(s => s.type === "blood" && s.status === "active")
      : [];

  const toggleTag = (tagId: string) =>
    setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      const scheduledAt = scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : new Date(`${scheduledDate}T00:00:00`).toISOString();

      let finalGameId = isBotC ? (botcGame?.id ?? "") : gameId;

      if (isBotC && !finalGameId) {
        const { data: newGame } = await supabase.from("games").insert({
          name: "Blood on the Clocktower",
          slug: "blood-on-the-clocktower",
          min_players: 5,
          max_players: 20,
        }).select("id").single();
        if (newGame) finalGameId = newGame.id;
      }
      if (!finalGameId) throw new Error("Jogo não encontrado");

      let finalDescription = description || null;
      if (isBotC && selectedScriptId && !isEdit) {
        const scriptName = bloodScripts.find(s => s.id === selectedScriptId)?.name;
        finalDescription = `[Script: ${scriptName}]${description ? `\n${description}` : ""}`;
      }

      if (isEdit && room) {
        const updatePayload: any = {
          game_id: finalGameId,
          title,
          description: finalDescription,
          scheduled_at: scheduledAt,
          max_players: parseInt(maxPlayers) || 10,
          season_id: selectedSeasonId || null,
          community_id: selectedCommunityId || null,
          community_only: !!selectedCommunityId && communityOnly,
          room_type: category || 'boardgame',
          platform: platform || null,
          ...(isAdminMode && status ? { status: status as "open" | "full" | "in_progress" | "finished" | "cancelled" } : {}),
        };

        const { error } = await supabase.from("match_rooms").update(updatePayload).eq("id", room.id);
        if (error) throw error;

        await supabase.from("match_room_tag_links").delete().eq("room_id", room.id);
        if (selectedTagIds.length > 0) {
          await supabase.from("match_room_tag_links").insert(
            selectedTagIds.map(tagId => ({ room_id: room.id, tag_id: tagId }))
          );
        }
      } else {
        const { data, error } = await supabase
          .from("match_rooms")
          .insert({
            game_id: finalGameId,
            created_by: user.id,
            title,
            description: finalDescription,
            scheduled_at: scheduledAt,
            max_players: parseInt(maxPlayers) || 10,
            status: "open",
            blood_script_id: isBotC ? selectedScriptId : null,
            season_id: selectedSeasonId || null,
            community_id: selectedCommunityId || null,
            community_only: !!selectedCommunityId && communityOnly,
            room_type: category || 'boardgame',
            platform: platform || null,
          } as any)
          .select()
          .single();
        if (error) throw error;

        if (selectedTagIds.length > 0) {
          await supabase.from("match_room_tag_links").insert(
            selectedTagIds.map(tagId => ({ room_id: data.id, tag_id: tagId }))
          );
        }

        const game = games.find(g => g.id === finalGameId);
        sendMatchNotification({
          event: "match_created",
          room_id: data.id,
          game: game?.name || "",
          title,
          scheduled_at: scheduledAt,
          max_players: parseInt(maxPlayers) || 10,
          players: [],
          created_by: user.id,
        });
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Sala atualizada!" : "Sala criada!");
      queryClient.invalidateQueries({ queryKey: ["match-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["match-room-form-options"] });
      onSuccess?.();
    },
    onError: () => {
      toast.error(isEdit ? "Erro ao atualizar sala" : "Erro ao criar sala");
    },
  });

  const handleSubmit = () => {
    if (isBotC) {
      if (!selectedScriptId || !title || !scheduledDate) {
        toast.error("Preencha os campos obrigatórios (Script, Título, Data)");
        return;
      }
    } else {
      if (!gameId || !title || !scheduledDate) {
        toast.error("Preencha os campos obrigatórios (Jogo, Título, Data)");
        return;
      }
    }
    mutation.mutate();
  };

  /* Category picker (create only) */
  if (!isEdit && !category) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Escolha a categoria:</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {categoryCards.map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setCategory(card.id);
                  if (card.id === "botc") setMaxPlayers("15");
                }}
                className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 border-border ${card.borderHover} text-center transition-all group aspect-[3/4]`}
              >
                <Icon className={`h-12 w-12 mb-3 ${card.iconColor} group-hover:scale-110 transition-transform`} />
                <p className="font-semibold text-sm">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (optionsLoading) {
    return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      {!isEdit && (
        <Button variant="ghost" size="sm" onClick={() => { setCategory(""); setGameId(""); setSelectedScriptId(""); }} className="mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      )}

      {isBotC ? (
        <div>
          <Label>Script *</Label>
          <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
            <SelectTrigger><SelectValue placeholder="Selecione o script" /></SelectTrigger>
            <SelectContent>
              {bloodScripts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div>
          <Label>Jogo *</Label>
          <Select value={gameId} onValueChange={setGameId}>
            <SelectTrigger><SelectValue placeholder="Selecione o jogo" /></SelectTrigger>
            <SelectContent>
              {filteredGames.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Título *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Partida de sábado" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data *</Label>
          <DatePickerField value={scheduledDate} onChange={setScheduledDate} placeholder="Selecione a data" />
        </div>
        <div>
          <Label>Hora</Label>
          <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Vagas Máximas</Label>
        <Input type="number" min="2" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} />
      </div>

      <div>
        <Label>Local / Plataforma</Label>
        <Select value={platform || "none"} onValueChange={v => setPlatform(v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Onde será jogado?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Não especificado</SelectItem>
            {PLATFORM_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isAdminMode && isEdit && (
        <div>
          <Label>Status (Admin)</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Manter atual" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="full">Lotado</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="finished">Encerrado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Tags (nível da sala)</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {availableTags.map(tag => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  isSelected
                    ? "bg-gold/20 border-gold/50 text-gold"
                    : "bg-muted/50 border-border text-muted-foreground hover:border-gold/30"
                }`}
              >
                {tag.name}
                {isSelected && <X className="h-3 w-3 inline ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {filteredSeasons.length > 0 && (
        <div>
          <Label>Temporada (competitivo - opcional)</Label>
          <Select value={selectedSeasonId || "none"} onValueChange={v => setSelectedSeasonId(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Nenhuma (casual)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma (casual)</SelectItem>
              {filteredSeasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {userCommunities.length > 0 && (
        <div className="space-y-2">
          <div>
            <Label>Comunidade (opcional)</Label>
            <Select value={selectedCommunityId || "none"} onValueChange={v => setSelectedCommunityId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {userCommunities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedCommunityId && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={communityOnly}
                onChange={e => setCommunityOnly(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-gold"
              />
              Exclusiva para membros da comunidade
            </label>
          )}
        </div>
      )}

      <div>
        <Label>Descrição {!isEdit && "(opcional)"}</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Observações sobre a partida..." rows={3} />
      </div>

      <Button variant="gold" className="w-full min-h-[44px]" onClick={handleSubmit} disabled={mutation.isPending}>
        {mutation.isPending ? "Salvando..." : isEdit ? "Salvar Alterações" : "Agendar Partida"}
      </Button>
    </div>
  );
};

export default MatchRoomForm;
