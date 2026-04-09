import { useEffect, useState, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import MatchRoomCard from "@/components/matchrooms/MatchRoomCard";
import CreateRoomDialog from "@/components/matchrooms/CreateRoomDialog";
import NewMatchFlow from "@/components/matches/NewMatchFlow";
import { Calendar, ClipboardList, Filter, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EntitySheet } from "@/components/shared/EntitySheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface MatchRoom {
  id: string; title: string; description: string | null; scheduled_at: string;
  max_players: number; status: string; created_by: string; season_id?: string | null;
  game: { id: string; name: string; image_url: string | null };
  tags?: string[];
}

const MatchRooms = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
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
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [experienceFilters, setExperienceFilters] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("active");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

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
      .select("id, title, description, scheduled_at, max_players, status, created_by, season_id, game:games(id, name, image_url), match_room_tag_links(room_tags(name))")
      .order("scheduled_at", { ascending: true });

    if (data) {
      setRooms(data.map((r: any) => ({
        ...r,
        game: Array.isArray(r.game) ? r.game[0] : r.game,
        tags: (r.match_room_tag_links ?? []).flatMap((link: any) => {
          const roomTag = Array.isArray(link.room_tags) ? link.room_tags[0] : link.room_tags;
          return roomTag?.name ? [roomTag.name] : [];
        }),
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();

    const channel = supabase.channel("match-rooms-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "match_rooms" }, () => fetchRooms())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_room_players" }, () => fetchRooms())
      .subscribe();

    const poll = setInterval(fetchRooms, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, []);

  const games = useMemo(() => {
    const unique = new Map<string, string>();
    rooms.forEach(r => { if (r.game) unique.set(r.game.id, r.game.name); });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  const normalizeTag = (tag: string) =>
    tag
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const roomMatchesExperience = (room: MatchRoom, filter: string) => {
    const normalizedTags = (room.tags ?? []).map(normalizeTag);

    if (filter === "iniciante") return normalizedTags.some((tag) => tag.includes("iniciante"));
    if (filter === "experiente") return normalizedTags.some((tag) => tag.includes("experiente"));
    if (filter === "novatos") return normalizedTags.some((tag) => tag.includes("novato"));

    return false;
  };

  const hasActiveFilters =
    gameFilter !== 'all' ||
    availabilityFilter !== 'all' ||
    dateFilter !== 'all' ||
    typeFilters.length > 0 ||
    experienceFilters.length > 0;

  const filterRooms = (list: MatchRoom[]) => {
    return list.filter(r => {
      if (gameFilter !== 'all' && r.game?.id !== gameFilter) return false;
      if (availabilityFilter === 'available' && r.status !== 'open') return false;
      if (availabilityFilter === 'full' && r.status !== 'full') return false;
      if (typeFilters.length > 0) {
        const matchesType = typeFilters.some((typeFilter) =>
          typeFilter === "casual" ? !r.season_id : Boolean(r.season_id)
        );
        if (!matchesType) return false;
      }
      if (experienceFilters.length > 0) {
        const matchesExperience = experienceFilters.some((experienceFilter) =>
          roomMatchesExperience(r, experienceFilter)
        );
        if (!matchesExperience) return false;
      }
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

  const toggleArrayFilter = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const clearFilters = () => {
    setGameFilter('all');
    setAvailabilityFilter('all');
    setDateFilter('all');
    setTypeFilters([]);
    setExperienceFilters([]);
  };

  const activeFilterCount =
    [gameFilter !== 'all', availabilityFilter !== 'all', dateFilter !== 'all'].filter(Boolean).length +
    typeFilters.length +
    experienceFilters.length;

  const renderFilterChip = (
    label: string,
    value: string,
    selectedValues: string[],
    setter: Dispatch<SetStateAction<string[]>>,
  ) => (
    <Button
      key={value}
      type="button"
      variant={selectedValues.includes(value) ? "secondary" : "outline"}
      size="sm"
      className="h-9 px-3"
      onClick={() => toggleArrayFilter(value, setter)}
    >
      {label}
    </Button>
  );

  const filterControls = (
    <>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Jogo</label>
        <Select value={gameFilter} onValueChange={setGameFilter}>
          <SelectTrigger className="w-full h-9"><SelectValue placeholder="Jogo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os jogos</SelectItem>
            {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Disponibilidade</label>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="available">Com vagas</SelectItem>
            <SelectItem value="full">Lotadas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Data</label>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer data</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 min-w-[220px]">
        <label className="text-xs font-medium text-muted-foreground">Tipo</label>
        <div className="flex flex-wrap gap-2">
          {renderFilterChip("Casual", "casual", typeFilters, setTypeFilters)}
          {renderFilterChip("Competitivo", "competitive", typeFilters, setTypeFilters)}
        </div>
      </div>
      <div className="space-y-1 min-w-[260px]">
        <label className="text-xs font-medium text-muted-foreground">Nível</label>
        <div className="flex flex-wrap gap-2">
          {renderFilterChip("Iniciante", "iniciante", experienceFilters, setExperienceFilters)}
          {renderFilterChip("Experiente", "experiente", experienceFilters, setExperienceFilters)}
          {renderFilterChip("Novatos", "novatos", experienceFilters, setExperienceFilters)}
        </div>
      </div>
    </>
  );

  return (
    <div className="container py-6 sm:py-10 px-4">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-gold" />
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Partidas</h1>
            <p className="text-sm text-muted-foreground">Agende e entre em salas de partida</p>
          </div>
        </div>
      </div>

      {/* Desktop: Filters row with action buttons on the right */}
      {!isMobile && (
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <Filter className="h-4 w-4 text-muted-foreground self-center mt-5" />
          {filterControls}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground hover:text-foreground self-end mb-0.5">
              <X className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            className="min-h-[44px] w-[200px]"
            onClick={() => { setPrefill(null); setMatchFlowOpen(true); }}
          >
            <ClipboardList className="h-4 w-4 mr-1" /> Registrar Resultado
          </Button>
          <CreateRoomDialog onCreated={fetchRooms} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" /></div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile: Tabs + Filter button on same row */}
          {isMobile ? (
            <div className="flex items-center gap-2 mb-4">
              <TabsList className="bg-secondary flex-1">
                <TabsTrigger value="active" className="flex-1">Abertas ({activeRooms.length})</TabsTrigger>
                <TabsTrigger value="past" className="flex-1">Encerradas ({pastRooms.length})</TabsTrigger>
              </TabsList>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setFilterDrawerOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gold text-primary-foreground rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          ) : (
            <TabsList className="bg-secondary mb-6">
              <TabsTrigger value="active">Abertas ({activeRooms.length})</TabsTrigger>
              <TabsTrigger value="past">Encerradas ({pastRooms.length})</TabsTrigger>
            </TabsList>
          )}

          {/* Mobile: action buttons — same width, respecting card margins */}
          {isMobile && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                variant="outline"
                className="min-h-[44px] text-sm w-full"
                onClick={() => { setPrefill(null); setMatchFlowOpen(true); }}
              >
                <ClipboardList className="h-4 w-4 mr-1 shrink-0" /> Registrar Resultado
              </Button>
              <CreateRoomDialog onCreated={fetchRooms} />
            </div>
          )}

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
                {pastRooms.map(room => (
                  <MatchRoomCard key={room.id} room={room} onUpdate={fetchRooms} />
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

      {/* Registrar Resultado — EntitySheet */}
      <EntitySheet
        open={matchFlowOpen}
        onOpenChange={setMatchFlowOpen}
        title="Registrar Resultado"
        description="Registre o resultado de uma partida jogada."
        widthClass="sm:max-w-2xl"
      >
        <ErrorBoundary>
          <NewMatchFlow
            prefilledGameId={prefill?.gameId}
            prefilledPlayers={prefill?.playerIds}
            prefilledDate={prefill?.date?.slice(0, 10)}
            onComplete={() => { setMatchFlowOpen(false); fetchRooms(); }}
          />
        </ErrorBoundary>
      </EntitySheet>

      {/* Mobile Filter Drawer */}
      <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <SheetContent side="right" className="w-[300px] p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" /> Filtros
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Accordion type="multiple" defaultValue={["game", "availability", "date"]} className="space-y-0">
              <AccordionItem value="game">
                <AccordionTrigger className="text-sm py-3">Jogo</AccordionTrigger>
                <AccordionContent>
                  <Select value={gameFilter} onValueChange={setGameFilter}>
                    <SelectTrigger className="w-full h-9"><SelectValue placeholder="Jogo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os jogos</SelectItem>
                      {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="availability">
                <AccordionTrigger className="text-sm py-3">Disponibilidade</AccordionTrigger>
                <AccordionContent>
                  <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                    <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="available">Com vagas</SelectItem>
                      <SelectItem value="full">Lotadas</SelectItem>
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="date">
                <AccordionTrigger className="text-sm py-3">Data</AccordionTrigger>
                <AccordionContent>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Qualquer data</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Esta semana</SelectItem>
                      <SelectItem value="month">Este mês</SelectItem>
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="type">
                <AccordionTrigger className="text-sm py-3">Tipo</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {renderFilterChip("Casual", "casual", typeFilters, setTypeFilters)}
                    {renderFilterChip("Competitivo", "competitive", typeFilters, setTypeFilters)}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="experience">
                <AccordionTrigger className="text-sm py-3">Nível</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {renderFilterChip("Iniciante", "iniciante", experienceFilters, setExperienceFilters)}
                    {renderFilterChip("Experiente", "experiente", experienceFilters, setExperienceFilters)}
                    {renderFilterChip("Novatos", "novatos", experienceFilters, setExperienceFilters)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div className="px-6 py-4 border-t border-border flex gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => { clearFilters(); }}>
                Limpar
              </Button>
            )}
            <Button variant="gold" size="sm" className="flex-1 min-h-[44px]" onClick={() => setFilterDrawerOpen(false)}>
              Aplicar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MatchRooms;