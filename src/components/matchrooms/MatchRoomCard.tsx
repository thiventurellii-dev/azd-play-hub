import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Users, LogIn, Clock, Share2, ClipboardList, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { generateWhatsAppInvite, sendMatchNotification } from "@/lib/matchNotification";
import { toast } from "sonner";
import RoomComments from "./RoomComments";

interface RoomPlayer {
  id: string;
  player_id: string;
  type: string;
  position: number;
  profile?: { name: string; nickname: string | null };
}

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

interface Props {
  room: MatchRoom;
  onUpdate: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-green-600/20 text-green-400 border-green-600/30" },
  full: { label: "Lotado", className: "bg-amber-600/20 text-amber-400 border-amber-600/30" },
  in_progress: { label: "Em Andamento", className: "bg-blue-600/20 text-blue-400 border-blue-600/30" },
  finished: { label: "Encerrado", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", className: "bg-destructive/20 text-destructive" },
};

const MatchRoomCard = ({ room, onUpdate }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(true);

  const fetchPlayers = async () => {
    if (!room?.id) return;
    const { data } = await supabase
      .from("match_room_players")
      .select("id, player_id, type, position")
      .eq("room_id", room.id)
      .order("position");

    if (!data) return;

    const ids = data.map((p) => p.player_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, nickname")
      .in("id", ids);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    setPlayers(
      data.map((p) => ({
        ...p,
        profile: profileMap.get(p.player_id) as RoomPlayer["profile"],
      }))
    );
  };

  useEffect(() => {
    fetchPlayers();

    const channel = supabase
      .channel(`room-players-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_room_players", filter: `room_id=eq.${room.id}` }, () => {
        fetchPlayers();
        onUpdate();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  const confirmed = players.filter((p) => p.type === "confirmed");
  const waitlist = players.filter((p) => p.type === "waitlist");
  const isInRoom = players.some((p) => p.player_id === user?.id);
  const isFull = confirmed.length >= room.max_players;
  const canInteract = room.status === "open" || room.status === "full";

  const handleJoin = async () => {
    if (!user) return;
    setLoading(true);
    const type = isFull ? "waitlist" : "confirmed";
    const position = type === "confirmed" ? confirmed.length + 1 : waitlist.length + 1;

    const { error } = await supabase.from("match_room_players").insert({
      room_id: room.id,
      player_id: user.id,
      type,
      position,
    });

    if (error) {
      toast.error("Erro ao entrar na sala");
    } else {
      sendMatchNotification({
        event: "player_joined",
        room_id: room.id,
        game: room.game.name,
        title: room.title,
        scheduled_at: room.scheduled_at,
        max_players: room.max_players,
        players: [...players.map((p) => p.player_id), user.id],
        created_by: room.created_by,
      });

      if (type === "confirmed" && confirmed.length + 1 >= room.max_players) {
        await supabase.from("match_rooms").update({ status: "full" }).eq("id", room.id);
      }
    }
    setLoading(false);
  };

  const handleLeave = async () => {
    if (!user) return;
    setLoading(true);
    await supabase.from("match_room_players").delete().eq("room_id", room.id).eq("player_id", user.id);

    if (room.status === "full") {
      const nextWaitlist = waitlist[0];
      if (nextWaitlist) {
        await supabase.from("match_room_players").update({ type: "confirmed" }).eq("id", nextWaitlist.id);
      } else {
        await supabase.from("match_rooms").update({ status: "open" }).eq("id", room.id);
      }
    }

    toast.success("Você saiu da sala");
    await fetchPlayers();
    onUpdate();
    setLoading(false);
  };

  const handleShare = () => {
    const roomUrl = `${window.location.origin}/partidas?room=${room.id}`;
    const playerNames = confirmed.map(p => displayName(p));
    const link = generateWhatsAppInvite(room?.title || '', room?.game?.name || '', room?.scheduled_at || '', roomUrl, playerNames);
    window.open(link, "_blank");
  };

  const date = new Date(room.scheduled_at);
  const formattedDate = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const formattedTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const status = statusConfig[room.status] || statusConfig.open;

  const displayName = (p: RoomPlayer) => p.profile?.nickname || p.profile?.name || "Jogador";

  return (
    <Card className="flex flex-col min-h-[340px] overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{room?.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{"\u{1F3AE}"} {room?.game?.name}</p>
          </div>
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-shrink-0">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-gold" /> {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-gold" /> {formattedTime}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {confirmed.length}/{room.max_players}
          </span>
        </div>

        {room.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 flex-shrink-0">{room.description}</p>
        )}

        {/* Confirmed players */}
        {confirmed.length > 0 && (
          <div className="flex-shrink-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">Confirmados:</p>
            <div className="flex flex-wrap gap-1">
              {confirmed.map((p) => (
                <Badge key={p.id} variant="secondary" className="text-xs">
                  {displayName(p)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Waitlist */}
        {waitlist.length > 0 && (
          <div className="flex-shrink-0">
            <p className="text-xs font-medium text-amber-400 mb-1">Reserva ({waitlist.length}):</p>
            <div className="flex flex-wrap gap-1">
              {waitlist.map((p) => (
                <Badge key={p.id} variant="outline" className="text-xs border-amber-600/30 text-amber-400">
                  {displayName(p)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          {canInteract && user && (
            isInRoom ? (
              <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={handleLeave} disabled={loading}>
                Sair
              </Button>
            ) : (
              <Button
                variant={isFull ? "outline" : "gold"}
                size="sm"
                className="flex-1 min-h-[44px]"
                onClick={handleJoin}
                disabled={loading}
              >
                <LogIn className="h-4 w-4 mr-1" />
                {isFull ? "Entrar na Reserva" : "Entrar"}
              </Button>
            )
          )}
          {canInteract && (
            <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          {room.status === "finished" && user && (
            <Button
              variant="gold"
              size="sm"
              className="flex-1 min-h-[44px]"
              onClick={() => {
                navigate("/partidas", {
                  state: {
                    prefill: {
                      gameId: room.game.id,
                      date: room.scheduled_at,
                      playerIds: confirmed.map(p => p.player_id),
                    }
                  }
                });
              }}
            >
              <ClipboardList className="h-4 w-4 mr-1" /> Inserir Resultado
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] gap-1"
            onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
          >
            <MessageCircle className="h-4 w-4" />
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </CardContent>

      {/* Expandable comments */}
      {showComments && (
        <div className="border-t border-border px-6 pb-4">
          <RoomComments roomId={room.id} />
        </div>
      )}
    </Card>
  );
};

export default MatchRoomCard;
