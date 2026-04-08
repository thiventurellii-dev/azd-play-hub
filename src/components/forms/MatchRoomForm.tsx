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
import { X, ChevronLeft, Gamepad2, Skull, Sword, CalendarIcon } from "lucide-react";
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
  game: { id: string; name: string; image_url: string | null };
}

interface MatchRoomFormProps {
  /** Pass room data for edit mode; omit for create mode */
  room?: MatchRoomData | null;
  /** Shows admin-only fields (status change) */
  isAdminMode?: boolean;
  /** Called after successful save */
  onSuccess?: () => void;
}

/* ── Shared data query ─────────────────────────────── */

const useFormOptions = (enabled: boolean) =>
  useQuery({
    queryKey: ["match-room-form-options"],
    queryFn: async () => {
      const [gamesRes, scriptsRes, tagsRes, seasonsRes] = await Promise.all([
        supabase.from("games").select("id, name, slug, max_players").order("name"),
        supabase.from("blood_scripts").select("id, name").order("name"),
        supabase.from("room_tags").select("id, name").order("name"),
        supabase.from("seasons").select("id, name, status, type").in("status", ["active", "upcoming"]).order("name"),
      ]);
      return {
        games: (gamesRes.data ?? []) as Game[],
        scripts: (scriptsRes.data ?? []) as BloodScript[],
        tags: (tagsRes.data ?? []) as RoomTag[],
        seasons: (seasonsRes.data ?? []) as Season[],
      };
    },
    enabled,
    staleTime: 30_000,
  });

/* ── Component ─────────────────────────────────────── */

const MatchRoomForm = ({ room, isAdminMode = false, onSuccess }: MatchRoomFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!room;

  const { data: options, isLoading: optionsLoading } = useFormOptions(true);
  const games = useMemo(() => options?.games ?? [], [options?.games]);
  const bloodScripts = useMemo(() => options?.scripts ?? [], [options?.scripts]);
  const availableTags = useMemo(() => options?.tags ?? [], [options?.tags]);
  const seasons = useMemo(() => options?.seasons ?? [], [options?.seasons]);

  // Category picker (create only)
  const [category, setCategory] = useState<"boardgame" | "botc" | "rpg" | "">("");

  // Form fields
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
  const [status, setStatus] = useState("");

  // Pre-fill on edit
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
    setStatus("");
    // Determine category from game slug
    const game = games.find(g => g.id === room.game?.id);
    if (game?.slug === "blood-on-the-clocktower") {
      setCategory("botc");
    } else {
      setCategory("boardgame");
    }
  }, [room, games]);

  // Fetch existing tags for edit
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

  // Auto-set maxPlayers when game changes
  useEffect(() => {
    if (isEdit) return;
    const game = games.find(g => g.id === gameId);
    if (game?.max_players) setMaxPlayers(String(game.max_players));
  }, [gameId, games, isEdit]);

  const isBotC = category === "botc";
  const botcGame = games.find(g => g.slug === "blood-on-the-clocktower");

  const filteredGames = games.filter(g => {
    if (category === "boardgame") return g.slug !== "blood-on-the-clocktower";
    return true;
  });

  const filteredSeasons = category === "boardgame"
    ? seasons.filter(s => s.type === "boardgame" && s.status === "active")
    : category === "botc"
      ? seasons.filter(s => s.type === "blood" && s.status === "active")
      : [];

  const toggleTag = (tagId: string) =>
    setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);

  /* ── Mutation ──────────────────────────────────── */

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      const scheduledAt = scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : new Date(`${scheduledDate}T00:00:00`).toISOString();

      let finalGameId = isBotC ? (botcGame?.id ?? "") : gameId;

      // Auto-create BotC game if missing
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

      // Build description with script info for BotC
      let finalDescription = description || null;
      if (isBotC && selectedScriptId && !isEdit) {
        const scriptName = bloodScripts.find(s => s.id === selectedScriptId)?.name;
        finalDescription = `[Script: ${scriptName}]${description ? `\n${description}` : ""}`;
      }

      if (isEdit && room) {
        // ── UPDATE ──
        const updatePayload = {
          game_id: finalGameId,
          title,
          description: finalDescription,
          scheduled_at: scheduledAt,
          max_players: parseInt(maxPlayers) || 10,
          season_id: selectedSeasonId || null,
          ...(isAdminMode && status ? { status: status as "open" | "full" | "in_progress" | "finished" | "cancelled" } : {}),
        };

        const { error } = await supabase.from("match_rooms").update(updatePayload).eq("id", room.id);
        if (error) throw error;

        // Sync tags
        await supabase.from("match_room_tag_links").delete().eq("room_id", room.id);
        if (selectedTagIds.length > 0) {
          await supabase.from("match_room_tag_links").insert(
            selectedTagIds.map(tagId => ({ room_id: room.id, tag_id: tagId }))
          );
        }
      } else {
        // ── CREATE ──
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
          })
          .select()
          .single();
        if (error) throw error;

        // Save tags
        if (selectedTagIds.length > 0) {
          await supabase.from("match_room_tag_links").insert(
            selectedTagIds.map(tagId => ({ room_id: data.id, tag_id: tagId }))
          );
        }

        // Notification
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

  /* ── Category picker (create only) ─────────────── */

  if (!isEdit && !category) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Escolha a categoria:</p>
        <div className="grid gap-3 grid-cols-3">
          <button type="button" onClick={() => setCategory("boardgame")} className="p-4 rounded-lg border-2 border-border hover:border-gold/50 text-center transition-all group">
            <Gamepad2 className="h-8 w-8 mx-auto mb-2 text-gold group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold">Boardgame</p>
          </button>
          <button type="button" onClick={() => { setCategory("botc"); setMaxPlayers("15"); }} className="p-4 rounded-lg border-2 border-border hover:border-red-500/50 text-center transition-all group">
            <Skull className="h-8 w-8 mx-auto mb-2 text-red-400 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold">BotC</p>
          </button>
          <button type="button" onClick={() => setCategory("rpg")} className="p-4 rounded-lg border-2 border-border hover:border-purple-500/50 text-center transition-all group">
            <Sword className="h-8 w-8 mx-auto mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold">RPG</p>
          </button>
        </div>
      </div>
    );
  }

  if (optionsLoading) {
    return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;
  }

  /* ── Form fields ───────────────────────────────── */

  return (
    <div className="space-y-4">
      {!isEdit && (
        <Button variant="ghost" size="sm" onClick={() => { setCategory(""); setGameId(""); setSelectedScriptId(""); }} className="mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      )}

      {/* Game or Script selector */}
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
          <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
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

      {/* Admin-only: status */}
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

      {/* Tags */}
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

      {/* Season */}
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
