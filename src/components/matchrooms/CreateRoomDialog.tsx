import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Gamepad2, Skull, ChevronLeft, Sword, X } from "lucide-react";
import { toast } from "sonner";
import { sendMatchNotification } from "@/lib/matchNotification";

interface Game {
  id: string;
  name: string;
  slug: string | null;
  max_players: number | null;
}

interface BloodScript {
  id: string;
  name: string;
}

interface RoomTag {
  id: string;
  name: string;
}

interface Season {
  id: string;
  name: string;
  status: string;
  type: string;
}

interface Props {
  onCreated: () => void;
}

const CreateRoomDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<'boardgame' | 'botc' | 'rpg' | ''>('');
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [saving, setSaving] = useState(false);

  // BotC
  const [bloodScripts, setBloodScripts] = useState<BloodScript[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [botcGameId, setBotcGameId] = useState("");

  // Tags
  const [availableTags, setAvailableTags] = useState<RoomTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Season (competitivo)
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");

  useEffect(() => {
    if (!open) return;
    // Fetch games, tags, seasons in parallel
    Promise.all([
      supabase.from("games").select("id, name, slug, max_players").order("name"),
      supabase.from("blood_scripts").select("id, name").order("name"),
      supabase.from("room_tags").select("id, name").order("name"),
      supabase.from("seasons").select("id, name, status, type").in("status", ["active", "upcoming"]).order("name"),
    ]).then(([gamesRes, scriptsRes, tagsRes, seasonsRes]) => {
      if (gamesRes.data) setGames(gamesRes.data as Game[]);
      if (scriptsRes.data) setBloodScripts(scriptsRes.data as BloodScript[]);
      if (tagsRes.data) setAvailableTags(tagsRes.data as RoomTag[]);
      if (seasonsRes.data) setSeasons(seasonsRes.data as Season[]);
      // Find BotC game id
      const botc = gamesRes.data?.find((g: any) => g.slug === 'blood-on-the-clocktower');
      if (botc) setBotcGameId(botc.id);
    });
  }, [open]);

  const selectedGame = games.find(g => g.id === gameId);
  const isBotC = category === 'botc';

  // Filter games by category (exclude BotC from boardgame list)
  const filteredGames = games.filter(g => {
    const isBotcGame = g.slug === 'blood-on-the-clocktower';
    if (category === 'boardgame') return !isBotcGame;
    return true;
  });

  // Season only for boardgame
  const filteredSeasons = category === 'boardgame' ? seasons.filter(s => s.type === 'boardgame') : [];

  useEffect(() => {
    const game = games.find(g => g.id === gameId);
    if (game?.max_players) {
      setMaxPlayers(String(game.max_players));
    }
  }, [gameId, games]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setScheduledDate("");
    setScheduledTime("");
    setGameId("");
    setMaxPlayers("10");
    setSelectedScriptId("");
    setCategory('');
    setSelectedTagIds([]);
    setSelectedSeasonId("");
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate
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

    const scheduledAt = scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      : new Date(`${scheduledDate}T00:00:00`).toISOString();

    const finalGameId = isBotC ? botcGameId : gameId;
    if (!finalGameId) {
      toast.error("Erro: jogo não encontrado");
      return;
    }

    // Build description with script info if BotC
    let finalDescription = description || null;
    if (isBotC && selectedScriptId) {
      const scriptName = bloodScripts.find(s => s.id === selectedScriptId)?.name;
      finalDescription = `[Script: ${scriptName}]${description ? `\n${description}` : ''}`;
    }

    setSaving(true);
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

    if (error) {
      toast.error("Erro ao criar sala");
    } else {
      // Save tags
      if (selectedTagIds.length > 0) {
        await supabase.from("match_room_tag_links").insert(
          selectedTagIds.map(tagId => ({ room_id: data.id, tag_id: tagId }))
        );
      }

      const game = games.find((g) => g.id === finalGameId);
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

      toast.success("Sala criada!");
      setOpen(false);
      resetForm();
      onCreated();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold" className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-2" /> Agendar Partida
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Sala de Partida</DialogTitle>
          <DialogDescription>Crie uma sala para agendar uma partida com outros jogadores.</DialogDescription>
        </DialogHeader>
        {!category ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Escolha a categoria:</p>
            <div className="grid gap-3 grid-cols-3">
              <button type="button" onClick={() => setCategory('boardgame')} className="p-4 rounded-lg border-2 border-border hover:border-gold/50 text-center transition-all group">
                <Gamepad2 className="h-8 w-8 mx-auto mb-2 text-gold group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold">Boardgame</p>
              </button>
              <button type="button" onClick={() => { setCategory('botc'); setMaxPlayers("15"); }} className="p-4 rounded-lg border-2 border-border hover:border-red-500/50 text-center transition-all group">
                <Skull className="h-8 w-8 mx-auto mb-2 text-red-400 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold">BotC</p>
              </button>
              <button type="button" onClick={() => setCategory('rpg')} className="p-4 rounded-lg border-2 border-border hover:border-purple-500/50 text-center transition-all group">
                <Sword className="h-8 w-8 mx-auto mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold">RPG</p>
              </button>
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => { setCategory(''); setGameId(''); setSelectedScriptId(''); }} className="mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>

          {/* Game or Script selector */}
          {isBotC ? (
            <div>
              <Label>Script *</Label>
              <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o script" />
                </SelectTrigger>
                <SelectContent>
                  {bloodScripts.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Jogo *</Label>
              <Select value={gameId} onValueChange={setGameId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o jogo" />
                </SelectTrigger>
                <SelectContent>
                  {filteredGames.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Partida de sábado" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div>
              <Label>Hora (opcional)</Label>
              <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Vagas Máximas</Label>
            <Input type="number" min="2" max={selectedGame?.max_players || 50} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
          </div>

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
                        ? 'bg-gold/20 border-gold/50 text-gold'
                        : 'bg-muted/50 border-border text-muted-foreground hover:border-gold/30'
                    }`}
                  >
                    {tag.name}
                    {isSelected && <X className="h-3 w-3 inline ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Season (competitivo) */}
          {filteredSeasons.length > 0 && (
            <div>
              <Label>Temporada (competitivo - opcional)</Label>
              <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (casual)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (casual)</SelectItem>
                  {filteredSeasons.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Observações sobre a partida..."
              rows={3}
            />
          </div>
          <Button variant="gold" className="w-full min-h-[44px]" onClick={handleSubmit} disabled={saving}>
            {saving ? "Criando..." : "Agendar Partida"}
          </Button>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomDialog;
