import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MatchRoomCard from "@/components/matchrooms/MatchRoomCard";
import CreateRoomDialog from "@/components/matchrooms/CreateRoomDialog";
import { Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MatchRoom {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  max_players: number;
  status: string;
  created_by: string;
  game: { id: string; name: string; image_url: string | null };
}

const MatchRooms = () => {
  const [rooms, setRooms] = useState<MatchRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("match_rooms")
      .select("id, title, description, scheduled_at, max_players, status, created_by, game:games(id, name, image_url)")
      .order("scheduled_at", { ascending: true });

    if (data) {
      setRooms(
        data.map((r: any) => ({
          ...r,
          game: Array.isArray(r.game) ? r.game[0] : r.game,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel("match-rooms-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "match_rooms" }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const activeRooms = rooms.filter((r) => r.status === "open" || r.status === "full" || r.status === "in_progress");
  const pastRooms = rooms.filter((r) => r.status === "finished" || r.status === "cancelled");

  return (
    <div className="container py-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-gold" />
          <div>
            <h1 className="text-3xl font-bold">Partidas</h1>
            <p className="text-muted-foreground">Agende e entre em salas de partida</p>
          </div>
        </div>
        <CreateRoomDialog onCreated={fetchRooms} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="bg-secondary mb-6">
            <TabsTrigger value="active">Abertas ({activeRooms.length})</TabsTrigger>
            <TabsTrigger value="past">Encerradas ({pastRooms.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeRooms.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhuma sala aberta no momento</p>
                <p className="text-sm mt-1">Crie uma sala para começar!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeRooms.map((room) => (
                  <MatchRoomCard key={room.id} room={room} onUpdate={fetchRooms} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastRooms.length === 0 ? (
              <p className="text-center py-16 text-muted-foreground">Nenhuma sala encerrada</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pastRooms.map((room) => (
                  <MatchRoomCard key={room.id} room={room} onUpdate={fetchRooms} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MatchRooms;
