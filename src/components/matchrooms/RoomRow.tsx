import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar, Clock, Users, LogIn, Share2, ClipboardList, MessageCircle, XCircle, Trash2,
  TrendingUp, Eye, ChevronDown, ChevronUp, Pencil, Gamepad2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateWhatsAppInvite } from "@/lib/matchNotification";
import { sendRoomNotifications } from "@/lib/roomNotifications";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import RoomComments from "./RoomComments";
import EditRoomDialog from "./EditRoomDialog";
import NewMatchFlow from "@/components/matches/NewMatchFlow";
import NewMatchBotcFlow from "@/components/matches/NewMatchBotcFlow";
import MatchResultModal from "@/components/matches/MatchResultModal";
import SessionResultDialog from "@/components/rpg/SessionResultDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ErrorBoundary from "@/components/ErrorBoundary";

interface RoomPlayer {
  id: string;
  player_id: string;
  type: string;
  position: number;
  profile?: { name: string; nickname: string | null };
}

export interface MatchRoom {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  max_players: number;
  status: string;
  created_by: string;
  season_id?: string | null;
  blood_script_id?: string | null;
  result_id?: string | null;
  result_type?: string | null;
  room_type?: string | null;
  campaign_id?: string | null;
  community_id?: string | null;
  community_only?: boolean | null;
  accept_observers?: boolean | null;
  session_number?: number | null;
  session_recap?: string | null;
  session_title?: string | null;
  duration_minutes?: number | null;
  game: { id: string; name: string; image_url: string | null };
  tags?: string[];
}

interface Props {
  room: MatchRoom;
  onUpdate: () => void;
  friendIds?: Set<string>;
}

const STATUS_LEFT_BORDER: Record<string, string> = {
  open: "border-l-green-500",
  full: "border-l-amber-500",
  in_progress: "border-l-blue-500",
  finished: "border-l-muted-foreground/30",
  cancelled: "border-l-destructive",
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open: { label: "Aberta", cls: "border-green-600/30 text-green-400 bg-green-600/10" },
  full: { label: "Lotada", cls: "border-amber-600/30 text-amber-400 bg-amber-600/10" },
  in_progress: { label: "Em andamento", cls: "border-blue-600/30 text-blue-400 bg-blue-600/10" },
  finished: { label: "Encerrada", cls: "border-muted text-muted-foreground bg-muted/30" },
  cancelled: { label: "Cancelada", cls: "border-destructive/30 text-destructive bg-destructive/10" },
};

function GameThumb({ game, imageUrl, size = 72 }: { game: MatchRoom["game"]; imageUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl || game?.image_url;
  if (src && !failed) {
    return (
      <div
        className="rounded-md overflow-hidden flex-shrink-0 border border-border bg-surface"
        style={{ width: size, height: size }}
      >
        <img
          src={src}
          alt={game?.name || ""}
          className="w-full h-full object-cover object-top"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  const letter = (game?.name?.[0] || "?").toUpperCase();
  return (
    <div
      className="rounded-md flex-shrink-0 flex items-center justify-center bg-surface border border-border"
      style={{ width: size, height: size }}
    >
      <span className="text-2xl font-extrabold text-gold/80">{letter}</span>
    </div>
  );
}

const RoomRow = ({ room, onUpdate, friendIds }: Props) => {
  const { user, isAdmin } = useAuth();
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [avgMmr, setAvgMmr] = useState<number | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [scriptImageUrl, setScriptImageUrl] = useState<string | null>(null);
  const [campaignMasterId, setCampaignMasterId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [matchFlowOpen, setMatchFlowOpen] = useState(false);
  const [resultParticipantIds, setResultParticipantIds] = useState<string[]>([]);
  const [resultId, setResultId] = useState<string | null>(room.result_id || null);
  const [resultType, setResultType] = useState<string | null>(room.result_type || null);
  const [hasResult, setHasResult] = useState(!!room.result_id);

  useEffect(() => {
    if (!room.blood_script_id) { setScriptImageUrl(null); return; }
    supabase.from("blood_scripts").select("image_url").eq("id", room.blood_script_id).maybeSingle()
      .then(({ data }) => setScriptImageUrl((data as any)?.image_url ?? null));
  }, [room.blood_script_id]);

  useEffect(() => {
    if (!room.campaign_id) { setCampaignMasterId(null); return; }
    supabase.from("rpg_campaigns").select("master_id").eq("id", room.campaign_id).maybeSingle()
      .then(({ data }) => setCampaignMasterId((data as any)?.master_id ?? null));
  }, [room.campaign_id]);

  useEffect(() => {
    if (room.result_id) {
      setResultId(room.result_id);
      setResultType(room.result_type || null);
      setHasResult(true);
      return;
    }
    if (room.status !== "finished" || !room.game?.id) return;
    const scheduledDate = new Date(room.scheduled_at);
    const ds = new Date(scheduledDate); ds.setHours(0, 0, 0, 0);
    const de = new Date(scheduledDate); de.setHours(23, 59, 59, 999);

    if (room.blood_script_id) {
      supabase.from("blood_matches").select("id")
        .gte("played_at", ds.toISOString()).lte("played_at", de.toISOString()).limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setResultId(data[0].id); setResultType("blood"); setHasResult(true);
          }
        });
    } else {
      supabase.from("matches").select("id").eq("game_id", room.game.id)
        .gte("played_at", ds.toISOString()).lte("played_at", de.toISOString()).limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setResultId(data[0].id); setResultType("boardgame"); setHasResult(true);
          }
        });
    }
  }, [room.result_id, room.result_type, room.status, room.game?.id, room.scheduled_at, room.blood_script_id]);

  const fetchPlayers = async () => {
    if (!room?.id) return;
    const { data, error } = await supabase
      .from("match_room_players")
      .select("id, player_id, type, position")
      .eq("room_id", room.id)
      .order("position");
    if (error || !data) return;

    const ids = data.map(p => p.player_id);
    if (ids.length === 0) { setPlayers([]); setAvgMmr(null); return; }
    const { data: profiles } = await supabase.rpc("get_public_profiles", { p_ids: ids });
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    setPlayers(data.map(p => ({
      ...p,
      profile: (profileMap.get(p.player_id) as any) ?? { name: "Jogador desconhecido", nickname: null },
    })));

    if (room.season_id) {
      const confirmedIds = data.filter(p => p.type === "confirmed").map(p => p.player_id);
      if (confirmedIds.length > 0) {
        const { data: seasonData } = await supabase.from("seasons").select("type").eq("id", room.season_id).maybeSingle();
        if (seasonData?.type === "boardgame") {
          const { data: mmrData } = await supabase.from("mmr_ratings").select("current_mmr")
            .eq("season_id", room.season_id).in("player_id", confirmedIds);
          if (mmrData && mmrData.length > 0) {
            setAvgMmr(Math.round(mmrData.reduce((s, r) => s + Number(r.current_mmr), 0) / mmrData.length));
          } else setAvgMmr(null);
        } else setAvgMmr(null);
      } else setAvgMmr(null);
    }
  };

  const fetchCommentCount = async () => {
    if (!room?.id) return;
    const { count } = await supabase
      .from("match_room_comments")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);
    setCommentCount(count ?? 0);
  };

  useEffect(() => {
    if (!room?.id) return;
    fetchPlayers();
    fetchCommentCount();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase.channel(`row-${room.id}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_room_players", filter: `room_id=eq.${room.id}` },
        () => { fetchPlayers(); onUpdate(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_room_comments", filter: `room_id=eq.${room.id}` },
        () => fetchCommentCount())
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [room?.id]);

  useEffect(() => {
    if (!resultId || !resultType) return;
    const fetchParticipants = async () => {
      if (resultType === "boardgame") {
        const { data } = await supabase.from("match_results").select("player_id").eq("match_id", resultId);
        setResultParticipantIds((data || []).map((r: any) => r.player_id).filter(Boolean));
      } else if (resultType === "blood") {
        const { data: match } = await supabase.from("blood_matches").select("storyteller_player_id").eq("id", resultId).maybeSingle();
        const { data: bPlayers } = await supabase.from("blood_match_players").select("player_id").eq("match_id", resultId);
        const ids = (bPlayers || []).map((p: any) => p.player_id);
        if ((match as any)?.storyteller_player_id) ids.push((match as any).storyteller_player_id);
        setResultParticipantIds(ids);
      }
    };
    fetchParticipants();
  }, [resultId, resultType]);

  const confirmed = players.filter(p => p.type === "confirmed");
  const waitlist = players.filter(p => p.type === "waitlist");
  const observers = players.filter(p => p.type === "observer");
  const moderators = players.filter(p => p.type === "moderator");
  const invitedUsers = players.filter(p => p.type === "invited");
  const isInRoom = confirmed.some(p => p.player_id === user?.id);
  const isInWait = waitlist.some(p => p.player_id === user?.id);
  const isObserving = observers.some(p => p.player_id === user?.id);
  const myInvite = invitedUsers.find(p => p.player_id === user?.id);
  const isFull = confirmed.length >= room.max_players;
  const canInteract = room.status === "open" || room.status === "full";
  const isCreator = user?.id === room.created_by;
  const canManage = isCreator || isAdmin;
  const isBotC = !!room.blood_script_id;
  const isRpg = room.room_type === "rpg" && !!room.campaign_id;
  const isRpgMaster = isRpg && !!user && (campaignMasterId === user.id);
  const canInsertResult = isRpg ? (isRpgMaster || isAdmin) : true;

  const date = new Date(room.scheduled_at);
  const formattedDate = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const formattedTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const slotPct = Math.min(confirmed.length / room.max_players, 1);
  const slotColor = room.status === "finished" ? "bg-muted-foreground/40"
    : slotPct >= 1 ? "bg-amber-500" : "bg-green-500";

  const status = STATUS_LABEL[room.status] ?? STATUS_LABEL.open;
  const leftBorder = STATUS_LEFT_BORDER[room.status] ?? STATUS_LEFT_BORDER.open;
  const displayName = (p: RoomPlayer) => p.profile?.nickname || p.profile?.name || "Jogador";

  const handleJoin = async () => {
    if (!user) return;
    setLoading(true);
    const type = isFull ? "waitlist" : "confirmed";
    const position = type === "confirmed" ? confirmed.length + 1 : waitlist.length + 1;
    const { error } = await supabase.from("match_room_players").insert({ room_id: room.id, player_id: user.id, type, position });
    if (error) toast.error("Erro ao entrar na sala");
    else {
      const { data: joinerProfile } = await supabase.from("profiles").select("nickname, name").eq("id", user.id).single();
      const joinerName = joinerProfile?.nickname || joinerProfile?.name || "Jogador";
      if (room.created_by !== user.id) {
        sendRoomNotifications({ userIds: [room.created_by], type: "room_join", title: "Novo jogador na sala", message: `${joinerName} entrou na sala "${room.title}"`, roomId: room.id });
      }
      if (type === "confirmed" && confirmed.length + 1 >= room.max_players) {
        await supabase.from("match_rooms").update({ status: "full" }).eq("id", room.id);
        const allIds = [...confirmed.map(p => p.player_id), user.id].filter(id => id !== user.id);
        if (allIds.length > 0) sendRoomNotifications({ userIds: allIds, type: "room_full", title: "Sala lotada!", message: `A sala "${room.title}" atingiu o número máximo de jogadores.`, roomId: room.id });
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
      const next = waitlist[0];
      if (next) {
        await supabase.from("match_room_players").update({ type: "confirmed" }).eq("id", next.id);
        sendRoomNotifications({ userIds: [next.player_id], type: "waitlist_promoted", title: "Você foi confirmado!", message: `Uma vaga abriu e você saiu da reserva para confirmado na sala "${room.title}".`, roomId: room.id });
      } else {
        await supabase.from("match_rooms").update({ status: "open" }).eq("id", room.id);
      }
    }
    toast.success("Você saiu da sala");
    await fetchPlayers(); onUpdate();
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm("Tem certeza que deseja cancelar esta sala?")) return;
    setLoading(true);
    await supabase.from("match_rooms").update({ status: "cancelled" }).eq("id", room.id);
    const allIds = players.map(p => p.player_id).filter(id => id !== user?.id);
    if (allIds.length > 0) sendRoomNotifications({ userIds: allIds, type: "room_cancelled", title: "Sala cancelada", message: `A sala "${room.title}" foi cancelada.`, roomId: room.id });
    toast.success("Sala cancelada"); onUpdate();
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta sala?")) return;
    setLoading(true);
    const { error } = await invokeEdgeFunction("delete-match-room", { roomId: room.id });
    if (error) toast.error("Erro ao excluir sala: " + (error.message || "Erro desconhecido"));
    else toast.success("Sala excluída");
    onUpdate();
    setLoading(false);
  };

  const handleShare = () => {
    const roomUrl = `${window.location.origin}/partidas?room=${room.id}`;
    const playerNames = confirmed.map(p => displayName(p));
    const link = generateWhatsAppInvite(room.title, room.game?.name || "", room.scheduled_at, roomUrl, playerNames, room.description || undefined);
    window.open(link, "_blank");
  };

  const handleResultComplete = async (matchId?: string) => {
    if (isRpg) {
      // RPG: o próprio SessionResultDialog atualiza match_rooms (status=finished, result_type=rpg).
      setHasResult(true);
      setResultType("rpg");
      setResultId(room.id); // para RPG usamos o próprio room.id como referência
    } else if (matchId) {
      const rt = room.blood_script_id ? "blood" : "boardgame";
      await supabase.from("match_rooms").update({ result_id: matchId, result_type: rt } as any).eq("id", room.id);
      setResultId(matchId); setResultType(rt); setHasResult(true);
    }
    setMatchFlowOpen(false); onUpdate();
  };

  const PlayerChip = ({ p, isWaitlist = false }: { p: RoomPlayer; isWaitlist?: boolean }) => {
    const isMe = p.player_id === user?.id;
    const isFriend = friendIds?.has(p.player_id);
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-normal",
          isMe && "border-gold/50 bg-gold/10 text-gold font-semibold",
          !isMe && isFriend && "border-green-500/50 bg-secondary",
          !isMe && !isFriend && "border-border bg-secondary text-muted-foreground",
          isWaitlist && !isMe && "opacity-90"
        )}
      >
        {displayName(p)}
      </Badge>
    );
  };

  return (
    <>
      <div className={cn(
        "rounded-lg border border-border bg-card border-l-[3px] overflow-hidden transition-colors hover:bg-card/80",
        leftBorder
      )}>
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 p-3 sm:p-4">
          <div className="flex gap-3 lg:flex-shrink-0">
            <GameThumb game={room.game} imageUrl={scriptImageUrl} size={64} />
            <div className="flex-1 min-w-0 lg:w-64 lg:flex-shrink-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-bold text-sm leading-tight truncate">{room.title}</h3>
                {canManage && canInteract && (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="text-muted-foreground/60 hover:text-foreground transition-colors flex-shrink-0"
                    title="Editar"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                <Badge variant="outline" className={cn("ml-auto text-[10px] py-0 px-1.5 lg:hidden", status.cls)}>
                  {status.label}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-1.5 truncate">
                <Gamepad2 className="inline h-3 w-3 mr-1" />
                {room.game?.name}{room.season_id ? " · Season" : ""}
              </div>
              {((room.tags && room.tags.length > 0) || avgMmr !== null) && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {room.season_id && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500/40 text-blue-400 bg-blue-500/10">
                      Competitivo
                    </Badge>
                  )}
                  {(room.tags || [])
                    .filter(t => {
                      const n = t.toLowerCase();
                      return n !== "competitivo" && n !== "casual";
                    })
                    .map(t => {
                      const isHighlight = t.toLowerCase().includes("novato");
                      return (
                        <Badge
                          key={t}
                          variant="outline"
                          className={cn(
                            "text-[10px] py-0 px-1.5",
                            isHighlight
                              ? "border-emerald-400/60 text-emerald-300 bg-emerald-500/10 shadow-[0_0_8px_-2px_hsl(var(--domain-positive)/0.5)]"
                              : "border-gold/30 text-gold/80 bg-gold/5",
                          )}
                        >
                          {t}
                        </Badge>
                      );
                    })}
                  {avgMmr !== null && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500/40 text-blue-400 bg-blue-500/10 gap-1">
                      <TrendingUp className="h-2.5 w-2.5" /> MMR médio: {avgMmr}
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-gold" /> {formattedDate}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-gold" /> {formattedTime}</span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  <span className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                    <span className={cn("block h-full rounded-full transition-all", slotColor)} style={{ width: `${slotPct * 100}%` }} />
                  </span>
                  <span className={cn("tabular-nums", slotPct >= 1 && room.status !== "finished" && "text-amber-400")}>
                    {confirmed.length}/{room.max_players}
                  </span>
                </span>
              </div>
              {room.description && (
                <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{room.description}</p>
              )}
            </div>
          </div>
          <div className="hidden lg:block w-px self-stretch bg-border/60" aria-hidden="true" />
          <div className="flex-1 min-w-0 lg:pl-1">
            {confirmed.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">
                  Confirmados
                </div>
                <div className="flex flex-wrap gap-1">
                  {confirmed.map(p => <PlayerChip key={p.id} p={p} />)}
                </div>
              </div>
            )}
            {waitlist.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Reserva ({waitlist.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {waitlist.map(p => <PlayerChip key={p.id} p={p} isWaitlist />)}
                </div>
              </div>
            )}
            {confirmed.length === 0 && waitlist.length === 0 && (
              <span className="text-xs text-muted-foreground/60">Nenhum jogador ainda</span>
            )}
          </div>
          <div className="flex flex-row lg:flex-col items-stretch lg:items-end gap-2 lg:flex-shrink-0">
            <Badge variant="outline" className={cn("hidden lg:inline-flex text-[10px] py-0 px-2", status.cls)}>
              {status.label}
            </Badge>
            {canInteract && user && (
              <div className="flex gap-1.5 flex-1 lg:flex-initial">
                {isInRoom ? (
                  <Button variant="outline" size="sm" className="h-9 flex-1 lg:flex-initial" onClick={handleLeave} disabled={loading}>
                    Sair
                  </Button>
                ) : isInWait ? (
                  <Button variant="outline" size="sm" className="h-9 flex-1 lg:flex-initial border-amber-600/30 text-amber-400 bg-amber-600/10 hover:bg-amber-600/20" disabled>
                    Na reserva
                  </Button>
                ) : (
                  <Button variant={isFull ? "outline" : "gold"} size="sm" className="h-9 flex-1 lg:flex-initial" onClick={handleJoin} disabled={loading}>
                    <LogIn className="h-3.5 w-3.5 mr-1" />
                    {isFull ? "Reserva" : "Entrar"}
                  </Button>
                )}
                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleShare} title="Compartilhar">
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive" onClick={handleCancel} disabled={loading} title="Cancelar sala">
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
            {room.status === "finished" && user && (
              <div className="flex gap-1.5 flex-1 lg:flex-initial">
                {hasResult ? (
                  <Button variant="outline" size="sm" className="h-9 flex-1 lg:flex-initial" onClick={() => setResultModalOpen(true)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Ver Resultados
                  </Button>
                ) : canInsertResult ? (
                  <Button variant="gold" size="sm" className="h-9 flex-1 lg:flex-initial" onClick={() => setMatchFlowOpen(true)}>
                    <ClipboardList className="h-3.5 w-3.5 mr-1" /> Inserir Resultado
                  </Button>
                ) : isRpg ? (
                  <div className="h-9 flex-1 lg:flex-initial flex items-center px-3 rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
                    Aguardando o mestre inserir o resultado
                  </div>
                ) : null}
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive" onClick={handleDelete} disabled={loading} title="Excluir sala">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setCommentsOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Comentários</span>
              {commentCount > 0 && (
                <span className="bg-muted text-muted-foreground rounded-full text-[10px] font-semibold px-1.5 leading-tight">
                  {commentCount}
                </span>
              )}
              {commentsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>
        {commentsOpen && (
          <div className="border-t border-border/60 bg-surface/60 px-4 py-3 lg:pl-24">
            <RoomComments roomId={room.id} />
          </div>
        )}
      </div>
      <EditRoomDialog open={editOpen} onOpenChange={setEditOpen} room={room as any} onSaved={() => { setEditOpen(false); onUpdate(); }} />
      {hasResult && resultId && resultType && (
        <MatchResultModal
          resultId={resultId}
          resultType={resultType}
          open={resultModalOpen}
          onOpenChange={setResultModalOpen}
          participantIds={resultParticipantIds}
        />
      )}
      <Dialog open={matchFlowOpen} onOpenChange={setMatchFlowOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {isRpg ? (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Inserir resultado da sessão</DialogTitle>
                <DialogDescription>
                  Recap, presença e eventos em destaque alimentam a Crônica da campanha.
                </DialogDescription>
              </DialogHeader>
              <ErrorBoundary>
                <SessionResultDialog
                  roomId={room.id}
                  campaignId={room.campaign_id!}
                  defaultTitle={room.session_title || room.title}
                  initialRecap={room.session_recap}
                  initialDuration={room.duration_minutes}
                  initialSessionNumber={room.session_number}
                  scheduledAt={room.scheduled_at}
                  confirmedPlayers={confirmed.map(p => ({ player_id: p.player_id, name: displayName(p) }))}
                  onComplete={() => handleResultComplete()}
                  onCancel={() => setMatchFlowOpen(false)}
                />
              </ErrorBoundary>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Registrar Resultado</DialogTitle>
                <DialogDescription>Registre o resultado desta partida.</DialogDescription>
              </DialogHeader>
              <ErrorBoundary>
                {isBotC ? (
                  <NewMatchBotcFlow onComplete={handleResultComplete} />
                ) : (
                  <NewMatchFlow
                    prefilledGameId={room.game?.id}
                    prefilledPlayers={confirmed.map(p => p.player_id)}
                    prefilledDate={room.scheduled_at?.slice(0, 10)}
                    prefilledCategory="boardgame"
                    prefilledCommunityId={room.community_id ?? undefined}
                    onComplete={handleResultComplete}
                  />
                )}
              </ErrorBoundary>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoomRow;
