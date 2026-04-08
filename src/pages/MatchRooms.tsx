import { useEffect, useState, useMemo, useRef } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import MatchRoomCard from "@/components/matchrooms/MatchRoomCard";
import CreateRoomDialog from "@/components/matchrooms/CreateRoomDialog";
import NewMatchFlow from "@/components/matches/NewMatchFlow";
import { Calendar, ClipboardList, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface MatchRoom {
  id: string; title: string; description: string | null; scheduled_at: string;
  max_players: number; status: string; created_by: string; season_id?: string | null;
  game: { id: string; name: string; image_url: string | null };
}

const MatchRooms = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState<MatchRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchFlowOpen, setMatchFlowOpen] = useState(false);
  const [prefill, setPrefill] = useState<any>(null);

  // Deep link modal state
  const [deepLinkOpen, setDeepLinkOpen] = useState(false);
  const [deepLinkRoom, setDeepLinkRoom] = useState<MatchRoom | null>(null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);
  const deepLinkFetched = useRef(false);

  // Filters
  const [gameFilter, setGameFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    const state = location.state as any;
    if (state?.prefill) {
      setPrefill(state.prefill);
      setMatchFlowOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Handle ?room=ID deep link — runs only once
  useEffect(() => {
    if (deepLinkFetched.current) return;
    const roomParam = searchParams.get('room');
    if (!roomParam) return;
    deepLinkFetched.current = true;

    setDeepLinkOpen(true);
    setDeepLinkLoading(true);

    Promise.resolve(
      supabase.from("match_rooms")
        .select("id, title, description, scheduled_at, max_players, status, created_by, season_id, game:games(id, name, image_url)")
        .eq("id", roomParam)
        .maybeSingle()
    ).then(({ data }) => {
      if (data) {
        const room = { ...data, game: Array.isArray((data as any).game) ? (data as any).game[0] : (data as any).game } as MatchRoom;
        setDeepLinkRoom(room);
      } else {
        toast.error("Sala não encontrada");
        setDeepLinkOpen(false);
        setSearchParams({}, { replace: true });
      }
      setDeepLinkLoading(false);
    }).catch(() => {
      toast.error("Erro ao carregar sala");
      setDeepLinkLoading(false);
      setDeepLinkOpen(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeepLinkClose = (open: boolean) => {
    setDeepLinkOpen(open);
    if (!open) {
      setSearchParams({}, { replace: true });
      setDeepLinkRoom(null);
      deepLinkFetched.current = false;
    }
  };

  const fetchRooms = async () => {
    const now = new Date().toISOString();
    await supabase.from("match_rooms").update({ status: "finished" as any })
      .in("status", ["open", "full", "in_progress"] as any).lt("scheduled_at", now);

    const { data } = await supabase.from("match_rooms")
      .select("id, title, description, scheduled_at, max_players, status, created_by, season_id, game:games(id, name, image_url)")
      .order("scheduled_at", { ascending: true });

    if (data) {
      setRooms(data.map((r: any) => ({ ...r, game: Array.isArray(r.game) ? r.game[0] : r.game })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    const channel = supabase.channel("match-rooms-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "match_rooms" }, () => fetchRooms())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const games = useMemo(() => {
    const unique = new Map<string, string>();
    rooms.forEach(r => { if (r.game) unique.set(r.game.id, r.game.name); });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  const hasActiveFilters = gameFilter !== 'all' || availabilityFilter !== 'all' || dateFilter !== 'all';

  const filterRooms = (list: MatchRoom[]) => {
    return list.filter(r => {
      if (gameFilter !== 'all' && r.game?.id !== gameFilter) return false;
      if (availabilityFilter === 'available' && r.status !== 'open') return false;
      if (availabilityFilter === 'full' && r.status !== 'full') return false;
      if (dateFilter !== 'all') {
        const d = new Date(r.scheduled_at);
        const now = new Date();
        if (dateFilter === 'today') {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'week') {
          const weekAhead = new Date(now); weekAhead.setDate(weekAhead.getDate() + 7);
          if (d > weekAhead) return false;
        } else if (dateFilter === 'month') {
          const monthAhead = new Date(now); monthAhead.setMonth(monthAhead.getMonth() + 1);
          if (d > monthAhead) return false;
        }
      }
      return true;
    });
  };

  const activeRooms = filterRooms(rooms.filter(r => r.status === "open" || r.status === "full" || r.status === "in_progress"));
  const pastRooms = filterRooms(rooms.filter(r => r.status === "finished" || r.status === "cancelled"));

  const clearFilters = () => { setGameFilter('all'); setAvailabilityFilter('all'); setDateFilter('all'); };

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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setPrefill(null); setMatchFlowOpen(true); }}>
            <ClipboardList className="h-4 w-4 mr-1" /> Registrar Resultado
          </Button>
          <CreateRoomDialog onCreated={fetchRooms} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={gameFilter} onValueChange={setGameFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Jogo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os jogos</SelectItem>
            {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="available">Com vagas</SelectItem>
            <SelectItem value="full">Lotadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer data</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary mb-6">
            <TabsTrigger value="active">Abertas ({activeRooms.length})</TabsTrigger>
            <TabsTrigger value="past">Encerradas ({pastRooms.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {activeRooms.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhuma sala encontrada</p>
                <p className="text-sm mt-1">{hasActiveFilters ? 'Tente ajustar os filtros' : 'Crie uma sala para começar!'}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeRooms.map(room => (
                  <div key={room.id}>
                    <MatchRoomCard room={room} onUpdate={fetchRooms} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="past">
            {pastRooms.length === 0 ? (
              <p className="text-center py-16 text-muted-foreground">Nenhuma sala encerrada</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pastRooms.map(room => (
                  <div key={room.id}>
                    <MatchRoomCard room={room} onUpdate={fetchRooms} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Deep link room modal */}
      <Dialog open={deepLinkOpen} onOpenChange={handleDeepLinkClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {deepLinkLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : deepLinkRoom ? (
            <MatchRoomCard room={deepLinkRoom} onUpdate={() => {
              fetchRooms();
              const roomId = deepLinkRoom?.id;
              if (!roomId) return;
              Promise.resolve(
                supabase.from("match_rooms")
                  .select("id, title, description, scheduled_at, max_players, status, created_by, game:games(id, name, image_url)")
                  .eq("id", roomId)
                  .maybeSingle()
              ).then(({ data }) => {
                if (data) {
                  setDeepLinkRoom({ ...data, game: Array.isArray((data as any).game) ? (data as any).game[0] : (data as any).game } as MatchRoom);
                }
              }).catch(() => {});
            }} />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={matchFlowOpen} onOpenChange={setMatchFlowOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Resultado</DialogTitle></DialogHeader>
          <ErrorBoundary>
            <NewMatchFlow
              prefilledGameId={prefill?.gameId}
              prefilledPlayers={prefill?.playerIds}
              prefilledDate={prefill?.date?.slice(0, 10)}
              onComplete={() => { setMatchFlowOpen(false); fetchRooms(); }}
            />
          </ErrorBoundary>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchRooms;
