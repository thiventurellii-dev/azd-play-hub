import { useEffect, useState, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import MatchRoomCard from "@/components/matchrooms/MatchRoomCard";
import RoomRow, { type MatchRoom } from "@/components/matchrooms/RoomRow";
import CalendarCarousel from "@/components/matchrooms/CalendarCarousel";
import CreateRoomDialog from "@/components/matchrooms/CreateRoomDialog";
import NewMatchFlow from "@/components/matches/NewMatchFlow";
import { Calendar, ClipboardList, Filter, X, SlidersHorizontal, Star, Gamepad2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EntitySheet } from "@/components/shared/EntitySheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const dayStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const MONTHS_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const WEEKDAYS_LONG = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
const fmtDateLong = (d: Date) => `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`;

const MatchRooms = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rooms, setRooms] = useState<MatchRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchFlowOpen, setMatchFlowOpen] = useState(false);
  const [prefill, setPrefill] = useState<any>(null);

  // Selected calendar day
  const [selectedDate, setSelectedDate] = useState<Date>(() => dayStart(new Date()));

  // Friends + favorite games/scripts
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [favoriteGameIds, setFavoriteGameIds] = useState<Set<string>>(new Set());
  const [favoriteScriptIds, setFavoriteScriptIds] = useState<Set<string>>(new Set());
  const [inferredGame, setInferredGame] = useState<{ id: string; name: string } | null>(null);

  // Deep link
  const [deepLinkOpen, setDeepLinkOpen] = useState(false);
  const [deepLinkRoom, setDeepLinkRoom] = useState<any>(null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);
  const deepLinkFetched = useRef(false);

  // Filters
  const [gameFilter, setGameFilter] = useState("all");
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [experienceFilters, setExperienceFilters] = useState<string[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Prefill from navigation state
  useEffect(() => {
    const state = location.state as any;
    if (state?.prefill) {
      setPrefill(state.prefill);
      setMatchFlowOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Deep link
  useEffect(() => {
    if (deepLinkFetched.current) return;
    const roomParam = searchParams.get("room");
    if (!roomParam) return;
    deepLinkFetched.current = true;

    setDeepLinkOpen(true);
    setDeepLinkLoading(true);

    Promise.resolve(
      supabase
        .from("match_rooms")
        .select(
          "id, title, description, scheduled_at, max_players, status, created_by, season_id, blood_script_id, room_type, campaign_id, community_id, community_only, accept_observers, session_number, session_recap, session_title, duration_minutes, game:games(id, name, image_url)",
        )
        .eq("id", roomParam)
        .maybeSingle(),
    )
      .then(({ data }) => {
        if (data) {
          const room = {
            ...data,
            game: Array.isArray((data as any).game) ? (data as any).game[0] : (data as any).game,
          };
          setDeepLinkRoom(room);
        } else {
          toast.error("Sala não encontrada");
          setDeepLinkOpen(false);
          setSearchParams({}, { replace: true });
        }
        setDeepLinkLoading(false);
      })
      .catch(() => {
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
    await supabase
      .from("match_rooms")
      .update({ status: "finished" as any })
      .in("status", ["open", "full", "in_progress"] as any)
      .lt("scheduled_at", now);

    const { data } = await supabase
      .from("match_rooms")
      .select(
        "id, title, description, scheduled_at, max_players, status, created_by, season_id, blood_script_id, room_type, campaign_id, community_id, community_only, accept_observers, session_number, session_recap, session_title, duration_minutes, result_id, result_type, game:games(id, name, image_url), match_room_tag_links(room_tags(name))",
      )
      .order("scheduled_at", { ascending: true });

    if (data) {
      setRooms(
        data.map((r: any) => ({
          ...r,
          game: Array.isArray(r.game) ? r.game[0] : r.game,
          tags: (r.match_room_tag_links ?? []).flatMap((link: any) => {
            const roomTag = Array.isArray(link.room_tags) ? link.room_tags[0] : link.room_tags;
            return roomTag?.name ? [roomTag.name] : [];
          }),
        })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    const channel = supabase
      .channel("match-rooms-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "match_rooms" }, () => fetchRooms())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_room_players" }, () => fetchRooms())
      .subscribe();
    const poll = setInterval(fetchRooms, 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, []);

  // Friends list (accepted) — for chip highlighting
  useEffect(() => {
    if (!user?.id) {
      setFriendIds(new Set());
      return;
    }
    supabase
      .from("friendships")
      .select("user_id, friend_id, status")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .then(({ data }) => {
        const ids = new Set<string>();
        (data || []).forEach((f: any) => {
          if (f.user_id === user.id) ids.add(f.friend_id);
          else if (f.friend_id === user.id) ids.add(f.user_id);
        });
        setFriendIds(ids);
      });
  }, [user?.id]);

  // Manual favorites (preferred) — fall back to inferred most-played game
  useEffect(() => {
    if (!user?.id) {
      setFavoriteGameIds(new Set());
      setFavoriteScriptIds(new Set());
      return;
    }
    supabase
      .from("user_favorites")
      .select("entity_type, entity_id")
      .eq("user_id", user.id)
      .in("entity_type", ["game", "blood_script"])
      .then(({ data }) => {
        const games = new Set<string>();
        const scripts = new Set<string>();
        (data || []).forEach((r: any) => {
          if (r.entity_type === "game") games.add(r.entity_id);
          else if (r.entity_type === "blood_script") scripts.add(r.entity_id);
        });
        setFavoriteGameIds(games);
        setFavoriteScriptIds(scripts);
      });
  }, [user?.id]);

  // Inferred favorite (fallback) = most-played game in the last 90 days
  useEffect(() => {
    if (!user?.id) {
      setInferredGame(null);
      return;
    }
    const since = new Date();
    since.setDate(since.getDate() - 90);
    supabase
      .from("match_results")
      .select("match_id, matches!inner(game_id, played_at, games!inner(id, name))")
      .eq("player_id", user.id)
      .gte("matches.played_at", since.toISOString())
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setInferredGame(null);
          return;
        }
        const counts = new Map<string, { name: string; count: number }>();
        data.forEach((r: any) => {
          const m = Array.isArray(r.matches) ? r.matches[0] : r.matches;
          const g = m && (Array.isArray(m.games) ? m.games[0] : m.games);
          if (!g?.id) return;
          const cur = counts.get(g.id) ?? { name: g.name, count: 0 };
          cur.count += 1;
          counts.set(g.id, cur);
        });
        let topId: string | null = null;
        let topCount = 0;
        let topName = "";
        counts.forEach((v, k) => {
          if (v.count > topCount) {
            topId = k;
            topCount = v.count;
            topName = v.name;
          }
        });
        setInferredGame(topId ? { id: topId, name: topName } : null);
      });
  }, [user?.id]);

  // Has any manual favorite (game OR script)
  const hasManualFavorites = favoriteGameIds.size > 0 || favoriteScriptIds.size > 0;

  // Effective favorite game id set (used only when no manual favorites — fallback)
  const effectiveFavIds = useMemo(() => {
    if (hasManualFavorites) return favoriteGameIds;
    if (inferredGame) return new Set([inferredGame.id]);
    return new Set<string>();
  }, [hasManualFavorites, favoriteGameIds, inferredGame]);

  const games = useMemo(() => {
    const unique = new Map<string, string>();
    rooms.forEach((r) => {
      if (r.game) unique.set(r.game.id, r.game.name);
    });
    return Array.from(unique.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  const normalizeTag = (tag: string) =>
    tag
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const roomMatchesExperience = (room: MatchRoom, filter: string) => {
    const tags = (room.tags ?? []).map(normalizeTag);
    if (filter === "iniciante") return tags.some((t) => t.includes("iniciante"));
    if (filter === "experiente") return tags.some((t) => t.includes("experiente"));
    if (filter === "novatos") return tags.some((t) => t.includes("novato"));
    return false;
  };

  const passesTagFilters = (r: MatchRoom) => {
    if (gameFilter !== "all" && r.game?.id !== gameFilter) return false;
    if (typeFilters.length > 0) {
      const ok = typeFilters.some((f) => (f === "casual" ? !r.season_id : Boolean(r.season_id)));
      if (!ok) return false;
    }
    if (experienceFilters.length > 0) {
      const ok = experienceFilters.some((f) => roomMatchesExperience(r, f));
      if (!ok) return false;
    }
    return true;
  };

  const hasActiveFilters = gameFilter !== "all" || typeFilters.length > 0 || experienceFilters.length > 0;

  const dayRooms = useMemo(() => {
    return rooms
      .filter((r) => isSameDay(new Date(r.scheduled_at), selectedDate))
      .filter(passesTagFilters)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, selectedDate, gameFilter, typeFilters, experienceFilters]);

  const favRooms = useMemo(() => {
    if (gameFilter !== "all") return [];
    if (effectiveFavIds.size === 0 && favoriteScriptIds.size === 0) return [];
    const today = dayStart(new Date());
    const dayRoomIds = new Set(dayRooms.map((r) => r.id));
    return rooms
      .filter((r) => {
        const matchGame = r.game?.id ? effectiveFavIds.has(r.game.id) : false;
        const matchScript = r.blood_script_id ? favoriteScriptIds.has(r.blood_script_id) : false;
        if (!matchGame && !matchScript) return false;
        if (dayRoomIds.has(r.id)) return false; // already shown in the day
        if (new Date(r.scheduled_at) < today) return false;
        return r.status === "open" || r.status === "full";
      })
      .filter(passesTagFilters)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, dayRooms, effectiveFavIds, favoriteScriptIds, selectedDate, gameFilter, typeFilters, experienceFilters]);

  // Quando o jogador filtra por jogo, mostramos todas as salas abertas daquele jogo agrupadas por data
  const gameFilterRoomsByDay = useMemo(() => {
    if (gameFilter === "all") return [];
    const today = dayStart(new Date());
    const filtered = rooms
      .filter((r) => r.game?.id === gameFilter)
      .filter((r) => r.status === "open" || r.status === "full")
      .filter((r) => new Date(r.scheduled_at) >= today)
      .filter(passesTagFilters)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    const groups = new Map<string, { date: Date; rooms: MatchRoom[] }>();
    for (const r of filtered) {
      const d = dayStart(new Date(r.scheduled_at));
      const key = d.toISOString();
      if (!groups.has(key)) groups.set(key, { date: d, rooms: [] });
      groups.get(key)!.rooms.push(r);
    }
    return Array.from(groups.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, gameFilter, typeFilters, experienceFilters]);

  const filteredGameName = useMemo(() => {
    if (gameFilter === "all") return null;
    return rooms.find((r) => r.game?.id === gameFilter)?.game?.name ?? null;
  }, [rooms, gameFilter]);

  const toggleArrayFilter = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((cur) => (cur.includes(value) ? cur.filter((i) => i !== value) : [...cur, value]));
  };

  const clearFilters = () => {
    setGameFilter("all");
    setTypeFilters([]);
    setExperienceFilters([]);
  };

  const activeFilterCount = (gameFilter !== "all" ? 1 : 0) + typeFilters.length + experienceFilters.length;

  const renderChip = (label: string, value: string, list: string[], setter: Dispatch<SetStateAction<string[]>>) => (
    <Button
      key={value}
      type="button"
      variant={list.includes(value) ? "secondary" : "outline"}
      size="sm"
      className="h-8 px-3 rounded-full text-xs"
      onClick={() => toggleArrayFilter(value, setter)}
    >
      {label}
    </Button>
  );

  const filterControls = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Sobre o filtro de jogo"
                className="text-muted-foreground hover:text-gold transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-xs">
              Ao filtrar por jogo, será mostrado todas as salas abertas desse jogo agrupadas por data.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Select value={gameFilter} onValueChange={setGameFilter}>
          <SelectTrigger
            className={cn("h-8 w-auto min-w-[160px] text-xs", gameFilter !== "all" && "text-gold border-gold/40")}
          >
            <SelectValue placeholder="Todos os jogos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os jogos</SelectItem>
            {games.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="hidden sm:block w-px h-5 bg-border mx-1" />
      <div className="flex flex-wrap gap-1.5">
        {renderChip("Casual", "casual", typeFilters, setTypeFilters)}
        {renderChip("Competitivo", "competitive", typeFilters, setTypeFilters)}
        {renderChip("Iniciante", "iniciante", experienceFilters, setExperienceFilters)}
        {renderChip("Experiente", "experiente", experienceFilters, setExperienceFilters)}
        {renderChip("Novatos", "novatos", experienceFilters, setExperienceFilters)}
      </div>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={clearFilters}
        >
          <X className="h-3 w-3" /> Limpar
        </Button>
      )}
    </div>
  );

  const isToday = isSameDay(selectedDate, dayStart(new Date()));

  return (
    <div className="container py-6 sm:py-8 px-3 sm:px-4 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">Partidas</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Agende e entre em salas de partida</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 sm:flex-initial"
            onClick={() => {
              setPrefill(null);
              setMatchFlowOpen(true);
            }}
          >
            <ClipboardList className="h-4 w-4 mr-1.5" /> Registrar Resultado
          </Button>
          <CreateRoomDialog onCreated={fetchRooms} />
        </div>
      </div>

      {/* Filter bar */}
      {!isMobile ? (
        <div className="rounded-lg border border-border bg-surface p-2.5 mb-5">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 ml-1" />
            {filterControls}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 justify-start gap-2 relative"
            onClick={() => setFilterDrawerOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="ml-auto bg-gold text-gold-foreground rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Calendar */}
          <CalendarCarousel
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            rooms={rooms}
            gameFilter={gameFilter}
          />

          {gameFilter !== "all" ? (
            <>
              <div className="flex items-center gap-2.5 mb-4">
                <Gamepad2 className="h-4 w-4 text-gold" />
                <h2 className="text-sm font-bold text-foreground">
                  Salas abertas — <span className="text-gold">{filteredGameName ?? "Jogo"}</span>
                </h2>
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-xs text-muted-foreground">
                  {gameFilterRoomsByDay.reduce((acc, g) => acc + g.rooms.length, 0)} sala
                  {gameFilterRoomsByDay.reduce((acc, g) => acc + g.rooms.length, 0) !== 1 ? "s" : ""}
                </span>
              </div>

              {gameFilterRoomsByDay.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm">Nenhuma sala aberta para esse jogo</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Que tal criar uma e chamar a galera?</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {gameFilterRoomsByDay.map((group) => {
                    const isGroupToday = isSameDay(group.date, new Date());
                    return (
                      <div key={group.date.toISOString()}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="text-xs font-bold text-muted-foreground capitalize">
                            {fmtDateLong(group.date)}
                          </span>
                          {isGroupToday && (
                            <span className="text-[9px] font-bold bg-gold text-gold-foreground px-1.5 py-0.5 rounded-full tracking-wider">
                              HOJE
                            </span>
                          )}
                          <div className="flex-1 h-px bg-border/40" />
                          <span className="text-[11px] text-muted-foreground/70">
                            {group.rooms.length} sala{group.rooms.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {group.rooms.map((room) => (
                            <RoomRow key={room.id} room={room} onUpdate={fetchRooms} friendIds={friendIds} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selected day header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-muted-foreground capitalize">{fmtDateLong(selectedDate)}</h2>
                  {isToday && (
                    <span className="text-[10px] font-bold bg-gold text-gold-foreground px-2 py-0.5 rounded-full tracking-wider">
                      HOJE
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {dayRooms.length} sala{dayRooms.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Day rooms */}
              {dayRooms.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm">Nenhuma sala neste dia</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {hasActiveFilters ? "Tente ajustar os filtros" : "Tente outro dia ou crie uma sala"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {dayRooms.map((room) => (
                    <RoomRow key={room.id} room={room} onUpdate={fetchRooms} friendIds={friendIds} />
                  ))}
                </div>
              )}

              {/* Favorite game from other days */}
              {favRooms.length > 0 && (
                <div className="mt-9">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Star className="h-3.5 w-3.5 text-gold fill-gold" />
                    <span className="text-xs font-bold text-muted-foreground tracking-wide">
                      {hasManualFavorites ? "Salas de Jogos Favoritos" : `Outras salas — ${inferredGame?.name ?? ""}`}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-xs text-muted-foreground/70">
                      {favRooms.length} sala{favRooms.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {favRooms.map((room) => (
                      <RoomRow key={room.id} room={room} onUpdate={fetchRooms} friendIds={friendIds} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Legend */}
          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] text-muted-foreground/70 pt-4 border-t border-border/40">
            <span className="font-semibold tracking-wide uppercase text-[10px]">Legenda</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gold/10 border border-gold/50" /> Você
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-secondary border border-green-500/50" /> Amigos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-secondary border border-border" /> Outros
            </span>
          </div>
        </>
      )}

      {/* Mobile filter drawer */}
      <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <SheetContent side="bottom" className="h-[85vh] sm:h-auto">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Jogo</label>
              <Select value={gameFilter} onValueChange={setGameFilter}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os jogos</SelectItem>
                  {games.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {renderChip("Casual", "casual", typeFilters, setTypeFilters)}
                {renderChip("Competitivo", "competitive", typeFilters, setTypeFilters)}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nível</label>
              <div className="flex flex-wrap gap-2">
                {renderChip("Iniciante", "iniciante", experienceFilters, setExperienceFilters)}
                {renderChip("Experiente", "experiente", experienceFilters, setExperienceFilters)}
                {renderChip("Novatos", "novatos", experienceFilters, setExperienceFilters)}
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" className="w-full" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1.5" /> Limpar filtros
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Deep link modal — keeps original card view */}
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
            <MatchRoomCard room={deepLinkRoom} onUpdate={fetchRooms} />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Manual result registration */}
      <Dialog open={matchFlowOpen} onOpenChange={setMatchFlowOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Resultado</DialogTitle>
            <DialogDescription>Registre o resultado de uma partida já jogada.</DialogDescription>
          </DialogHeader>
          <ErrorBoundary>
            <NewMatchFlow
              prefilledGameId={prefill?.gameId}
              prefilledPlayers={prefill?.players}
              prefilledDate={prefill?.date}
              onComplete={() => {
                setMatchFlowOpen(false);
                fetchRooms();
              }}
            />
          </ErrorBoundary>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchRooms;
