import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Users, LogIn, Clock, Share2, ClipboardList, MessageCircle, ChevronDown, ChevronUp, XCircle, Trash2, TrendingUp } from "lucide-react";
import { EditActionButton } from "@/components/shared/EditActionButton";
import { generateWhatsAppInvite } from "@/lib/matchNotification";
import { sendRoomNotifications } from "@/lib/roomNotifications";
import { toast } from "sonner";
import RoomComments from "./RoomComments";
import EditRoomDialog from "./EditRoomDialog";

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
  season_id?: string | null;
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
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [avgMmr, setAvgMmr] = useState<number | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchPlayers = async () => {
    if (!room?.id) return;
    const { data, error } = await supabase
      .from("match_room_players")
      .select("id, player_id, type, position")
      .eq("room_id", room.id)
      .order("position");

    if (error) {
      console.error("Error fetching room players:", error);
      return;
    }
    if (!data) return;

    const ids = data.map((p) => p.player_id);
    if (ids.length === 0) {
      setPlayers([]);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, nickname")
      .in("id", ids);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    const mappedPlayers = data.map((p) => ({
      ...p,
      profile: profileMap.get(p.player_id) as RoomPlayer["profile"],
    }));
    setPlayers(mappedPlayers);

    // Calculate avg MMR for competitive boardgame rooms with a season
    if (room.season_id) {
      const confirmedIds = data.filter(p => p.type === 'confirmed').map(p => p.player_id);
      if (confirmedIds.length > 0) {
        // Check if the season is boardgame type
        const { data: seasonData } = await supabase
          .from("seasons")
          .select("type")
          .eq("id", room.season_id)
          .maybeSingle();
        if (seasonData?.type === 'boardgame') {
          const { data: mmrData } = await supabase
            .from("mmr_ratings")
            .select("current_mmr")
            .eq("season_id", room.season_id)
            .in("player_id", confirmedIds);
          if (mmrData && mmrData.length > 0) {
            const avg = mmrData.reduce((sum, r) => sum + Number(r.current_mmr), 0) / mmrData.length;
            setAvgMmr(Math.round(avg));
          } else {
            setAvgMmr(null);
          }
        } else {
          setAvgMmr(null);
        }
      }
    }
  };

  // Fetch tags + check if result exists for finished rooms
  useEffect(() => {
    if (!room?.id) return;
    supabase
      .from("match_room_tag_links")
      .select("tag_id, room_tags(name)")
      .eq("room_id", room.id)
      .then(({ data }) => {
        if (data) {
          setTags(data.map((d: any) => d.room_tags?.name).filter(Boolean));
        }
      });

    // Check if a match result was already registered for this room's game on the scheduled date
    if (room.status === "finished" && room.game?.id) {
      const scheduledDate = new Date(room.scheduled_at);
      const dayStart = new Date(scheduledDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(scheduledDate);
      dayEnd.setHours(23, 59, 59, 999);
      supabase
        .from("matches")
        .select("id")
        .eq("game_id", room.game.id)
        .gte("played_at", dayStart.toISOString())
        .lte("played_at", dayEnd.toISOString())
        .limit(1)
        .then(({ data }) => {
          setHasResult(!!(data && data.length > 0));
        });
    }
  }, [room?.id, room?.status]);

  useEffect(() => {
    if (!room?.id) return;
    fetchPlayers();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`room-players-${room.id}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_room_players", filter: `room_id=eq.${room.id}` }, () => {
        fetchPlayers();
        onUpdate();
      })
      .subscribe();

    channelRef.current = channel;

    // Polling fallback every 10s
    const poll = setInterval(fetchPlayers, 10000);

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  const confirmed = players.filter((p) => p.type === "confirmed");
  const waitlist = players.filter((p) => p.type === "waitlist");
  const isInRoom = players.some((p) => p.player_id === user?.id);
  const isFull = confirmed.length >= (room?.max_players ?? 0);
  const canInteract = room?.status === "open" || room?.status === "full";
  const isCreator = user?.id === room?.created_by;
  const canManage = isCreator || isAdmin;

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
      const { data: joinerProfile } = await supabase.from("profiles").select("nickname, name").eq("id", user.id).single();
      const joinerName = joinerProfile?.nickname || joinerProfile?.name || "Jogador";
      if (room.created_by !== user.id) {
        sendRoomNotifications({
          userIds: [room.created_by],
          type: "room_join",
          title: "Novo jogador na sala",
          message: `${joinerName} entrou na sala "${room.title}"`,
          roomId: room.id,
        });
      }

      if (type === "confirmed" && confirmed.length + 1 >= room.max_players) {
        await supabase.from("match_rooms").update({ status: "full" }).eq("id", room.id);
        const allPlayerIds = [...confirmed.map(p => p.player_id), user.id].filter(id => id !== user.id);
        if (allPlayerIds.length > 0) {
          sendRoomNotifications({
            userIds: allPlayerIds,
            type: "room_full",
            title: "Sala lotada!",
            message: `A sala "${room.title}" atingiu o número máximo de jogadores.`,
            roomId: room.id,
          });
        }
      }
      toast.success(type === "confirmed" ? "Você entrou na sala!" : "Você entrou na lista de espera!");
    }
    setLoading(false);
  };

  const handleLeave = async () => {
    if (!user) return;
    setLoading(true);
    const wasConfirmed = confirmed.some(p => p.player_id === user.id);
    await supabase.from("match_room_players").delete().eq("room_id", room.id).eq("player_id", user.id);

    if (wasConfirmed && room.status === "full") {
      const nextWaitlist = waitlist[0];
      if (nextWaitlist) {
        await supabase.from("match_room_players").update({ type: "confirmed" }).eq("id", nextWaitlist.id);
        sendRoomNotifications({
          userIds: [nextWaitlist.player_id],
          type: "waitlist_promoted",
          title: "Você foi confirmado!",
          message: `Uma vaga abriu e você saiu da reserva para confirmado na sala "${room.title}".`,
          roomId: room.id,
        });
      } else {
        await supabase.from("match_rooms").update({ status: "open" }).eq("id", room.id);
      }
    }

    toast.success("Você saiu da sala");
    await fetchPlayers();
    onUpdate();
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm("Tem certeza que deseja cancelar esta sala?")) return;
    setLoading(true);
    await supabase.from("match_rooms").update({ status: "cancelled" }).eq("id", room.id);
    const allPlayerIds = players.map(p => p.player_id).filter(id => id !== user?.id);
    if (allPlayerIds.length > 0) {
      sendRoomNotifications({
        userIds: allPlayerIds,
        type: "room_cancelled",
        title: "Sala cancelada",
        message: `A sala "${room.title}" foi cancelada.`,
        roomId: room.id,
      });
    }
    toast.success("Sala cancelada");
    onUpdate();
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta sala?")) return;
    setLoading(true);
    await supabase.from("match_room_tag_links").delete().eq("room_id", room.id);
    await supabase.from("match_room_players").delete().eq("room_id", room.id);
    await supabase.from("match_room_comments").delete().eq("room_id", room.id);
    await supabase.from("match_rooms").delete().eq("id", room.id);
    toast.success("Sala excluída");
    onUpdate();
    setLoading(false);
  };

  const handleShare = () => {
    const roomUrl = `${window.location.origin}/partidas?room=${room.id}`;
    const playerNames = confirmed.map(p => displayName(p));
    const link = generateWhatsAppInvite(room?.title || '', room?.game?.name || '', room?.scheduled_at || '', roomUrl, playerNames, room?.description);
    window.open(link, "_blank");
  };

  if (!room) return null;

  const date = new Date(room.scheduled_at);
  const formattedDate = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const formattedTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const status = statusConfig[room.status] || statusConfig.open;

  const displayName = (p: RoomPlayer) => p.profile?.nickname || p.profile?.name || "Jogador";

  return (
    <>
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{room?.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{"\u{1F3AE}"} {room?.game?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {canManage && canInteract && (
                <>
                  <EditActionButton
                    entityType="match_room"
                    createdBy={room?.created_by}
                    onClick={() => setEditOpen(true)}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleCancel} disabled={loading} title="Cancelar sala">
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              {canManage && (room?.status === "finished" || room?.status === "cancelled") && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete} disabled={loading} title="Excluir sala">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Tags + MMR */}
          {(tags.length > 0 || avgMmr !== null) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0 border-gold/30 text-gold/80">
                  {tag}
                </Badge>
              ))}
              {avgMmr !== null && (
                <Badge variant="outline" className="text-[10px] px-2 py-0 border-blue-500/40 text-blue-400 gap-1">
                  <TrendingUp className="h-2.5 w-2.5" /> MMR médio: {avgMmr}
                </Badge>
              )}
            </div>
          )}
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
              hasResult ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-h-[44px] opacity-60 cursor-default"
                  disabled
                >
                  <ClipboardList className="h-4 w-4 mr-1" /> Resultado Registrado
                </Button>
              ) : (
                <Button
                  variant="gold"
                  size="sm"
                  className="flex-1 min-h-[44px]"
                  onClick={() => {
                    navigate("/partidas", {
                      state: {
                        prefill: {
                          gameId: room.game?.id,
                          date: room.scheduled_at,
                          playerIds: confirmed.map(p => p.player_id),
                        }
                      }
                    });
                  }}
                >
                  <ClipboardList className="h-4 w-4 mr-1" /> Inserir Resultado
                </Button>
              )
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

        {showComments && (
          <div className="border-t border-border px-6 pb-4">
            <RoomComments roomId={room.id} />
          </div>
        )}
      </Card>

      <EditRoomDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        room={room}
        onSaved={() => { setEditOpen(false); onUpdate(); }}
      />
    </>
  );
};

export default MatchRoomCard;
