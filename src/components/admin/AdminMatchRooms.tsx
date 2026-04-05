import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface RoomData {
  id: string;
  title: string;
  status: string;
  scheduled_at: string;
  max_players: number;
  created_by: string;
  game: { name: string } | null;
  creator?: { name: string; nickname: string | null } | null;
  players: { id: string; player_id: string; type: string; profile?: { name: string; nickname: string | null } }[];
}

const AdminMatchRooms = () => {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    const { data: roomsData } = await supabase
      .from("match_rooms")
      .select("id, title, status, scheduled_at, max_players, created_by, game:games(name)")
      .order("scheduled_at", { ascending: false });

    if (!roomsData) { setLoading(false); return; }

    const creatorIds = [...new Set(roomsData.map((r: any) => r.created_by))];
    const roomIds = roomsData.map((r: any) => r.id);

    const [{ data: profiles }, { data: playersData }] = await Promise.all([
      supabase.from("profiles").select("id, name, nickname").in("id", creatorIds),
      supabase.from("match_room_players").select("id, room_id, player_id, type").in("room_id", roomIds),
    ]);

    const playerIds = [...new Set(playersData?.map((p) => p.player_id) || [])];
    const { data: playerProfiles } = playerIds.length
      ? await supabase.from("profiles").select("id, name, nickname").in("id", playerIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.id, p] as const));
    const playerProfileMap = new Map((playerProfiles || []).map((p) => [p.id, p] as const));

    setRooms(
      roomsData.map((r: any) => ({
        ...r,
        game: Array.isArray(r.game) ? r.game[0] : r.game,
        creator: profileMap.get(r.created_by),
        players: (playersData || [])
          .filter((p) => p.room_id === r.id)
          .map((p) => ({ ...p, profile: playerProfileMap.get(p.player_id) })),
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  const updateStatus = async (roomId: string, status: string) => {
    await supabase.from("match_rooms").update({ status }).eq("id", roomId);
    fetchRooms();
  };

  if (loading) return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Salas de Partida ({rooms.length})</h2>
      {rooms.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma sala criada ainda.</p>
      ) : (
        rooms.map((room) => {
          const confirmed = room.players.filter((p) => p.type === "confirmed");
          const waitlist = room.players.filter((p) => p.type === "waitlist");
          const displayName = (p: any) => p.profile?.nickname || p.profile?.name || "?";

          return (
            <Card key={room.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{room.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      🎮 {room.game?.name} · Criado por {room.creator?.nickname || room.creator?.name || "?"} ·{" "}
                      {new Date(room.scheduled_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="outline">{room.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs font-medium text-muted-foreground mr-2">
                    Confirmados ({confirmed.length}/{room.max_players}):
                  </span>
                  {confirmed.map((p) => (
                    <Badge key={p.id} variant="secondary" className="text-xs">{displayName(p)}</Badge>
                  ))}
                </div>
                {waitlist.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium text-amber-400 mr-2">Reserva ({waitlist.length}):</span>
                    {waitlist.map((p) => (
                      <Badge key={p.id} variant="outline" className="text-xs border-amber-600/30 text-amber-400">{displayName(p)}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Select value={room.status} onValueChange={(val) => updateStatus(room.id, val)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="full">Lotado</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="finished">Encerrado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default AdminMatchRooms;
