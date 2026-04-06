import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Game {
  id: string;
  name: string;
  max_players: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: {
    id: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    max_players: number;
    game: { id: string; name: string; image_url: string | null };
  };
  onSaved: () => void;
}

const EditRoomDialog = ({ open, onOpenChange, room, onSaved }: Props) => {
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("games").select("id, name, max_players").order("name").then(({ data }) => {
      if (data) setGames(data as Game[]);
    });

    setGameId(room.game?.id || "");
    setTitle(room.title || "");
    setDescription(room.description || "");
    const d = new Date(room.scheduled_at);
    setScheduledDate(d.toISOString().slice(0, 10));
    setScheduledTime(d.toTimeString().slice(0, 5));
    setMaxPlayers(String(room.max_players || 10));
  }, [open, room]);

  const handleSave = async () => {
    if (!gameId || !title || !scheduledDate) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const scheduledAt = scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      : new Date(`${scheduledDate}T00:00:00`).toISOString();

    setSaving(true);
    const { error } = await supabase.from("match_rooms").update({
      game_id: gameId,
      title,
      description: description || null,
      scheduled_at: scheduledAt,
      max_players: parseInt(maxPlayers) || 10,
    }).eq("id", room.id);

    if (error) {
      toast.error("Erro ao atualizar sala");
    } else {
      toast.success("Sala atualizada!");
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Sala</DialogTitle>
          <DialogDescription>Atualize os detalhes da sala de partida.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Jogo *</Label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger><SelectValue placeholder="Selecione o jogo" /></SelectTrigger>
              <SelectContent>
                {games.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div>
              <Label>Hora</Label>
              <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Vagas Máximas</Label>
            <Input type="number" min="2" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <Button variant="gold" className="w-full min-h-[44px]" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditRoomDialog;
