import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

interface Game {
  id: string;
  name: string;
  max_players: number | null;
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: {
    id: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    max_players: number;
    season_id?: string | null;
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

  // Tags
  const [availableTags, setAvailableTags] = useState<RoomTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Season
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");

  useEffect(() => {
    if (!open) return;

    Promise.all([
      supabase.from("games").select("id, name, max_players").order("name"),
      supabase.from("room_tags").select("id, name").order("name"),
      supabase.from("seasons").select("id, name, status, type").in("status", ["active", "upcoming"]).order("name"),
      supabase.from("match_room_tag_links").select("tag_id").eq("room_id", room.id),
    ]).then(([gamesRes, tagsRes, seasonsRes, tagLinksRes]) => {
      if (gamesRes.data) setGames(gamesRes.data as Game[]);
      if (tagsRes.data) setAvailableTags(tagsRes.data as RoomTag[]);
      if (seasonsRes.data) setSeasons(seasonsRes.data as Season[]);
      if (tagLinksRes.data) setSelectedTagIds(tagLinksRes.data.map((t: any) => t.tag_id));
    });

    setGameId(room.game?.id || "");
    setTitle(room.title || "");
    setDescription(room.description || "");
    const d = new Date(room.scheduled_at);
    setScheduledDate(d.toISOString().slice(0, 10));
    setScheduledTime(d.toTimeString().slice(0, 5));
    setMaxPlayers(String(room.max_players || 10));
    setSelectedSeasonId(room.season_id || "");
  }, [open, room]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  // Filter seasons by game type and only active
  const filteredSeasons = seasons.filter(s => s.status === 'active');

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
      season_id: selectedSeasonId || null,
    }).eq("id", room.id);

    if (!error) {
      // Update tags: delete old, insert new
      await supabase.from("match_room_tag_links").delete().eq("room_id", room.id);
      if (selectedTagIds.length > 0) {
        await supabase.from("match_room_tag_links").insert(
          selectedTagIds.map(tagId => ({ room_id: room.id, tag_id: tagId }))
        );
      }
      toast.success("Sala atualizada!");
      onSaved();
    } else {
      toast.error("Erro ao atualizar sala");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Season (boardgame only) */}
          {filteredSeasons.length > 0 && (
            <div>
              <Label>Temporada (competitivo - opcional)</Label>
              <Select value={selectedSeasonId || "none"} onValueChange={(v) => setSelectedSeasonId(v === "none" ? "" : v)}>
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
