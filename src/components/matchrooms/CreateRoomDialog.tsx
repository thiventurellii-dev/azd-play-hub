import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { sendMatchNotification } from "@/lib/matchNotification";

interface Game {
  id: string;
  name: string;
  max_players: number | null;
}

interface Props {
  onCreated: () => void;
}

const CreateRoomDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("games")
      .select("id, name, max_players")
      .order("name")
      .then(({ data }) => {
        if (data) setGames(data as Game[]);
      });
  }, []);

  useEffect(() => {
    const game = games.find(g => g.id === gameId);
    if (game?.max_players) {
      setMaxPlayers(String(game.max_players));
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

    setSaving(true);
    const { data, error } = await supabase
      .from("match_rooms")
      .insert({
        game_id: gameId,
        created_by: user.id,
        title,
        description: description || null,
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
        <div className="space-y-4">
          <div>
            <Label>Jogo *</Label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o jogo" />
              </SelectTrigger>
              <SelectContent>
                {games.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Input type="number" min="2" max="50" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
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
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomDialog;
