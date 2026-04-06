import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Gamepad2, Skull, ChevronLeft, Sword } from "lucide-react";
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

  useEffect(() => {
    supabase
      .from("games")
      .select("id, name, slug, max_players")
      .order("name")
      .then(({ data }) => {
        if (data) setGames(data as Game[]);
      });
  }, []);

  const selectedGame = games.find(g => g.id === gameId);
  const isBotC = selectedGame && (selectedGame.name.toLowerCase().includes('blood') || selectedGame.slug === 'blood-on-the-clocktower');

  // Filter games by category
  const filteredGames = games.filter(g => {
    if (category === 'botc') return g.name.toLowerCase().includes('blood') || g.slug === 'blood-on-the-clocktower';
    if (category === 'boardgame') return !(g.name.toLowerCase().includes('blood') || g.slug === 'blood-on-the-clocktower');
    return true;
  });

  useEffect(() => {
    const game = games.find(g => g.id === gameId);
    if (game?.max_players) {
      setMaxPlayers(String(game.max_players));
    }
    // Fetch BotC scripts if applicable
    if (game) {
      const gName = game.name.toLowerCase();
      if (gName.includes('blood') || game.slug === 'blood-on-the-clocktower') {
        supabase.from('blood_scripts').select('id, name').order('name').then(({ data }) => {
          setBloodScripts(data || []);
        });
      } else {
        setBloodScripts([]);
        setSelectedScriptId('');
      }
    }
  }, [gameId, games]);

  const handleSubmit = async () => {
    if (!user || !gameId || !title || !scheduledDate) {
      toast.error("Preencha os campos obrigatórios (Jogo, Título, Data)");
      return;
    }

    const scheduledAt = scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      : new Date(`${scheduledDate}T00:00:00`).toISOString();

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
        game_id: gameId,
        created_by: user.id,
        title,
        description: finalDescription,
        scheduled_at: scheduledAt,
        max_players: parseInt(maxPlayers) || 10,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar sala");
    } else {
      const game = games.find((g) => g.id === gameId);
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
      setTitle("");
      setDescription("");
      setScheduledDate("");
      setScheduledTime("");
      setGameId("");
      setMaxPlayers("10");
      setSelectedScriptId("");
      setCategory('');
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Sala de Partida</DialogTitle>
        </DialogHeader>
        {!category ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Escolha a categoria:</p>
            <div className="grid gap-3 grid-cols-3">
              <button type="button" onClick={() => setCategory('boardgame')} className="p-4 rounded-lg border-2 border-border hover:border-gold/50 text-center transition-all group">
                <Gamepad2 className="h-8 w-8 mx-auto mb-2 text-gold group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold">Boardgame</p>
              </button>
              <button type="button" onClick={() => setCategory('botc')} className="p-4 rounded-lg border-2 border-border hover:border-red-500/50 text-center transition-all group">
                <Skull className="h-8 w-8 mx-auto mb-2 text-red-400 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold">BotC</p>
              </button>
              <button type="button" onClick={() => setCategory('rpg')} className="p-4 rounded-lg border-2 border-border hover:border-purple-500/50 text-center transition-all group">
                <Wand2 className="h-8 w-8 mx-auto mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold">RPG</p>
              </button>
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setCategory('')} className="mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <Label>Jogo *</Label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o jogo" />
              </SelectTrigger>
              <SelectContent>
                {filteredGames.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isBotC && bloodScripts.length > 0 && (
            <div>
              <Label>Script (BotC)</Label>
              <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar Script" />
                </SelectTrigger>
                <SelectContent>
                  {bloodScripts.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
            {selectedGame?.max_players && (
              <p className="text-xs text-muted-foreground mt-1">Máximo do jogo: {selectedGame.max_players}</p>
            )}
          </div>
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
