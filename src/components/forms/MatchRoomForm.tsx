import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseExternal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { X, ChevronLeft, Gamepad2, Skull, Sword, Check, Users, ChevronDown, ChevronUp, Sparkles, Search, Eye, UserPlus } from "lucide-react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { sendMatchNotification } from "@/lib/matchNotification";
import { sendRoomNotifications } from "@/lib/roomNotifications";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────── */

interface Game {
  id: string;
  name: string;
  slug: string | null;
  min_players: number | null;
  max_players: number | null;
  image_url: string | null;
}
interface FriendProfile {
  id: string;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
}
interface BloodScript {
  id: string;
  name: string;
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

export interface MatchRoomData {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  max_players: number;
  season_id?: string | null;
  blood_script_id?: string | null;
  community_id?: string | null;
  community_only?: boolean;
  platform?: string | null;
  game: { id: string; name: string; image_url: string | null };
}

const PLATFORM_OPTIONS = ["Presencial", "Tabletop Simulator", "BoardGame Arena", "Foundry", "Outro Online"];

interface MatchRoomFormProps {
  room?: MatchRoomData | null;
  isAdminMode?: boolean;
  onSuccess?: () => void;
  hideHeader?: boolean;
}

/* ── Domain config ─────────────────────────────────── */

type Category = "boardgame" | "botc" | "rpg";

const DOMAIN_CONFIG: Record<
  Category,
  {
    label: string;
    accent: string; // tailwind text color
    accentBg: string;
    accentBorder: string;
    icon: typeof Gamepad2;
    title: string;
  }
> = {
  boardgame: {
    label: "Boardgame",
    accent: "text-gold",
    accentBg: "bg-gold/10",
    accentBorder: "border-gold/40",
    icon: Gamepad2,
    title: "Agendar partida",
  },
  botc: {
    label: "Blood on the Clocktower",
    accent: "text-red-400",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/40",
    icon: Skull,
    title: "Agendar partida",
  },
  rpg: {
    label: "RPG",
    accent: "text-purple-400",
    accentBg: "bg-purple-500/10",
    accentBorder: "border-purple-500/40",
    icon: Sword,
    title: "Agendar sessão",
  },
};

/* ── Form options hook ─────────────────────────────── */

const useFormOptions = (enabled: boolean, userId?: string) =>
  useQuery({
    queryKey: ["match-room-form-options", userId],
    queryFn: async () => {
      const sb: any = supabase;
      const [gamesRes, scriptsRes, tagsRes, seasonsRes, communitiesRes, campaignsRes, recentMatchesRes, friendsRes] = await Promise.all([
        supabase.from("games").select("id, name, slug, min_players, max_players, image_url").order("name"),
        supabase.from("blood_scripts").select("id, name").order("name"),
        supabase.from("room_tags").select("id, name").order("name"),
        supabase.from("seasons").select("id, name, status, type").in("status", ["active", "upcoming"]).order("name"),
        userId
          ? sb
              .from("community_members")
              .select("community_id, communities(id, name, slug)")
              .eq("user_id", userId)
              .eq("status", "active")
          : Promise.resolve({ data: [] }),
        userId
          ? sb
              .from("rpg_campaigns")
              .select("id, name, status, master_id, adventure_id")
              .eq("master_id", userId)
              .in("status", ["planning", "active"])
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase.from("matches").select("game_id, played_at").order("played_at", { ascending: false }).limit(500),
        userId
          ? supabase
              .from("friendships")
              .select("user_id, friend_id, status")
              .eq("status", "accepted" as any)
              .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          : Promise.resolve({ data: [] }),
      ]);

      // Recent games + counts
      const counts: Record<string, number> = {};
      const ordered: string[] = [];
      for (const m of (recentMatchesRes.data || []) as any[]) {
        const gid = m.game_id;
        if (!gid) continue;
        counts[gid] = (counts[gid] || 0) + 1;
        if (!ordered.includes(gid)) ordered.push(gid);
      }

      // Friends
      const friendIdSet = new Set<string>();
      for (const f of (friendsRes.data || []) as any[]) {
        if (f.user_id === userId) friendIdSet.add(f.friend_id);
        else if (f.friend_id === userId) friendIdSet.add(f.user_id);
      }
      let friendProfiles: FriendProfile[] = [];
      if (friendIdSet.size > 0) {
        const { data: fp } = await supabase
          .from("profiles")
          .select("id, name, nickname, avatar_url")
          .in("id", Array.from(friendIdSet));
        friendProfiles = (fp || []) as FriendProfile[];
      }

      return {
        games: (gamesRes.data ?? []) as Game[],
        scripts: (scriptsRes.data ?? []) as BloodScript[],
        tags: (tagsRes.data ?? []) as RoomTag[],
        seasons: (seasonsRes.data ?? []) as Season[],
        communities: ((communitiesRes.data ?? []) as any[]).map((r) => r.communities).filter(Boolean) as {
          id: string;
          name: string;
          slug: string;
        }[],
        campaigns: (campaignsRes.data ?? []) as {
          id: string;
          name: string;
          status: string;
          adventure_id: string | null;
        }[],
        gamePlayCounts: counts,
        recentGameIds: ordered,
        friends: friendProfiles,
      };
    },
    enabled,
    staleTime: 30_000,
  });

/* ── Section wrapper ───────────────────────────────── */

const SectionCard = ({
  index,
  title,
  complete,
  summary,
  children,
  defaultOpen = true,
  collapsible = false,
}: {
  index?: number;
  title: string;
  complete: boolean;
  summary?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const showContent = !collapsible || open;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/40 transition-colors",
        complete ? "border-emerald-500/30" : "border-gold/25",
      )}
    >
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        className={cn("w-full flex items-center gap-3 px-4 py-3", collapsible ? "cursor-pointer" : "cursor-default")}
      >
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0",
            complete ? "bg-emerald-500/20 text-emerald-400" : "bg-gold/15 text-gold",
          )}
        >
          {complete ? <Check className="h-3.5 w-3.5" /> : index}
        </span>
        <span className="font-semibold text-sm text-foreground flex-1 text-left">{title}</span>
        {summary && <span className="text-xs text-muted-foreground truncate max-w-[60%] text-right">{summary}</span>}
        {collapsible && (
          <span className="text-muted-foreground">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        )}
      </button>
      {showContent && <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40">{children}</div>}
    </div>
  );
};

/* ── Category picker ───────────────────────────────── */

const categoryCards: Array<{
  id: Category;
  label: string;
  description: string;
  icon: typeof Gamepad2;
  color: string;
  border: string;
  bg: string;
}> = [
  {
    id: "boardgame",
    label: "Boardgame",
    description: "Jogos de tabuleiro",
    icon: Gamepad2,
    color: "text-gold",
    border: "hover:border-gold/60 hover:bg-gold/5",
    bg: "bg-gold/10",
  },
  {
    id: "botc",
    label: "Blood on the Clocktower",
    description: "Jogo de Dedução Social",
    icon: Skull,
    color: "text-red-400",
    border: "hover:border-red-500/60 hover:bg-red-500/5",
    bg: "bg-red-500/10",
  },
  {
    id: "rpg",
    label: "RPG",
    description: "Sessão ou one-shot",
    icon: Sword,
    color: "text-purple-400",
    border: "hover:border-purple-500/60 hover:bg-purple-500/5",
    bg: "bg-purple-500/10",
  },
];

/* ── Component ─────────────────────────────────────── */

const MatchRoomForm = ({ room, isAdminMode = false, onSuccess, hideHeader = false }: MatchRoomFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!room;

  const { data: options, isLoading: optionsLoading } = useFormOptions(true, user?.id);
  const games = useMemo(() => options?.games ?? [], [options?.games]);
  const bloodScripts = useMemo(() => options?.scripts ?? [], [options?.scripts]);
  const availableTags = useMemo(() => options?.tags ?? [], [options?.tags]);
  const seasons = useMemo(() => options?.seasons ?? [], [options?.seasons]);
  const userCommunities = useMemo(() => options?.communities ?? [], [options?.communities]);
  const userCampaigns = useMemo(() => options?.campaigns ?? [], [options?.campaigns]);
  const gamePlayCounts = useMemo(() => options?.gamePlayCounts ?? {}, [options?.gamePlayCounts]);
  const recentGameIds = useMemo(() => options?.recentGameIds ?? [], [options?.recentGameIds]);
  const friends = useMemo(() => options?.friends ?? [], [options?.friends]);

  const [category, setCategory] = useState<Category | "">("");
  const [gameId, setGameId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const now = new Date();
  const [scheduledDate, setScheduledDate] = useState(isEdit ? "" : now.toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState(isEdit ? "" : now.toTimeString().slice(0, 5));
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [communityOnly, setCommunityOnly] = useState(false);
  const [platform, setPlatform] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [acceptObservers, setAcceptObservers] = useState(false);
  const [gameSearch, setGameSearch] = useState("");
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);
  const [friendSearch, setFriendSearch] = useState("");

  /* hydrate edit */
  useEffect(() => {
    if (!room) return;
    setGameId(room.game?.id ?? "");
    setTitle(room.title ?? "");
    setDescription(room.description ?? "");
    const d = new Date(room.scheduled_at);
    setScheduledDate(d.toISOString().slice(0, 10));
    setScheduledTime(d.toTimeString().slice(0, 5));
    setMaxPlayers(String(room.max_players ?? 10));
    setSelectedSeasonId(room.season_id ?? "");
    setSelectedScriptId(room.blood_script_id ?? "");
    setSelectedCommunityId(room.community_id ?? "");
    setCommunityOnly(!!room.community_only);
    setPlatform(room.platform ?? "");
    setAdminStatus("");
    const game = games.find((g) => g.id === room.game?.id);
    if (game?.slug === "blood-on-the-clocktower") setCategory("botc");
    else setCategory("boardgame");
  }, [room, games]);

  useEffect(() => {
    if (!room?.id) return;
    supabase
      .from("match_room_tag_links")
      .select("tag_id")
      .eq("room_id", room.id)
      .then(({ data }) => {
        if (data) setSelectedTagIds(data.map((t) => t.tag_id));
      });
  }, [room?.id]);

  useEffect(() => {
    if (isEdit) return;
    const game = games.find((g) => g.id === gameId);
    if (game?.max_players) setMaxPlayers(String(game.max_players));
  }, [gameId, games, isEdit]);

  // Auto-título RPG
  useEffect(() => {
    if (isEdit || category !== "rpg" || !selectedCampaignId) return;
    const camp = userCampaigns.find((c) => c.id === selectedCampaignId);
    if (!camp) return;
    (async () => {
      const { count } = await supabase
        .from("match_rooms")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", selectedCampaignId);
      const n = (count || 0) + 1;
      setTitle(`Sessão ${n} — ${camp.name}`);
      setMaxPlayers("8");
    })();
  }, [selectedCampaignId, category, isEdit, userCampaigns]);

  const isBotC = category === "botc";
  const isRpg = category === "rpg";
  const botcGame = games.find((g) => g.slug === "blood-on-the-clocktower");
  const rpgGame = games.find(
    (g) => g.slug === "rpg-generico" || g.slug === "rpg-generic" || g.name?.toLowerCase() === "rpg",
  );
  const selectedCampaign = userCampaigns.find((c) => c.id === selectedCampaignId);
  const selectedGame = games.find((g) => g.id === gameId);

  const filteredGames = games.filter((g) => {
    if (category === "boardgame")
      return g.slug !== "blood-on-the-clocktower" && g.slug !== "rpg-generico" && g.slug !== "rpg-generic";
    return true;
  });

  const recentGames = useMemo(() => {
    return recentGameIds
      .map((gid) => filteredGames.find((g) => g.id === gid))
      .filter(Boolean)
      .slice(0, 4) as Game[];
  }, [recentGameIds, filteredGames]);

  const filteredCatalog = useMemo(() => {
    const q = gameSearch.trim().toLowerCase();
    if (!q) return [];
    return filteredGames.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 8);
  }, [gameSearch, filteredGames]);

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) =>
      (f.nickname || f.name || "").toLowerCase().includes(q),
    );
  }, [friendSearch, friends]);

  const filteredSeasons =
    category === "boardgame"
      ? seasons.filter((s) => s.type === "boardgame" && s.status === "active")
      : category === "botc"
        ? seasons.filter((s) => s.type === "blood" && s.status === "active")
        : [];

  const toggleTag = (tagId: string) =>
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));

  /* ── Section completion checks ─── */
  const sec1Complete = isBotC
    ? !!selectedScriptId && !!title
    : isRpg
      ? !!selectedCampaignId && !!title
      : !!gameId && !!title;
  const sec2Complete = !!scheduledDate && !!scheduledTime && !!maxPlayers;
  const sec3Complete = !!maxPlayers && parseInt(maxPlayers) > 0;
  const sec4Complete = true; // visibilidade tem defaults

  /* ── Mutation ─── */
  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      const scheduledAt = scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : new Date(`${scheduledDate}T00:00:00`).toISOString();

      let finalGameId = isBotC ? (botcGame?.id ?? "") : isRpg ? (rpgGame?.id ?? "") : gameId;

      if (isBotC && !finalGameId) {
        const { data: newGame } = await supabase
          .from("games")
          .insert({
            name: "Blood on the Clocktower",
            slug: "blood-on-the-clocktower",
            min_players: 5,
            max_players: 20,
          })
          .select("id")
          .single();
        if (newGame) finalGameId = newGame.id;
      }
      if (isRpg && !finalGameId) {
        const { data: existing } = await supabase
          .from("games")
          .select("id")
          .or("slug.eq.rpg-generico,slug.eq.rpg-generic,name.ilike.rpg")
          .limit(1)
          .maybeSingle();
        if (existing?.id) finalGameId = existing.id;
        else {
          const { data: newGame } = await supabase
            .from("games")
            .insert({ name: "RPG", slug: "rpg-generico", min_players: 2, max_players: 10 } as any)
            .select("id")
            .single();
          if (newGame) finalGameId = newGame.id;
        }
      }
      if (!finalGameId) throw new Error("Jogo não encontrado");

      let finalDescription = description || null;
      if (isBotC && selectedScriptId && !isEdit) {
        const scriptName = bloodScripts.find((s) => s.id === selectedScriptId)?.name;
        finalDescription = `[Script: ${scriptName}]${description ? `\n${description}` : ""}`;
      }

      if (isEdit && room) {
        const updatePayload: any = {
          game_id: finalGameId,
          title,
          description: finalDescription,
          scheduled_at: scheduledAt,
          max_players: parseInt(maxPlayers) || 10,
          season_id: selectedSeasonId || null,
          community_id: selectedCommunityId || null,
          community_only: !!selectedCommunityId && communityOnly,
          room_type: category || "boardgame",
          platform: platform || null,
          accept_observers: acceptObservers,
          ...(isAdminMode && adminStatus
            ? { status: adminStatus as "open" | "full" | "in_progress" | "finished" | "cancelled" }
            : {}),
        };
        const { error } = await supabase.from("match_rooms").update(updatePayload).eq("id", room.id);
        if (error) throw error;

        await supabase.from("match_room_tag_links").delete().eq("room_id", room.id);
        if (selectedTagIds.length > 0) {
          await supabase
            .from("match_room_tag_links")
            .insert(selectedTagIds.map((tagId) => ({ room_id: room.id, tag_id: tagId })));
        }
      } else {
        const { data, error } = await supabase
          .from("match_rooms")
          .insert({
            game_id: finalGameId,
            created_by: user.id,
            title,
            description: finalDescription,
            scheduled_at: scheduledAt,
            max_players: parseInt(maxPlayers) || 10,
            status: "open",
            blood_script_id: isBotC ? selectedScriptId : null,
            season_id: selectedSeasonId || null,
            community_id: selectedCommunityId || null,
            community_only: !!selectedCommunityId && communityOnly,
            room_type: category || "boardgame",
            platform: platform || null,
            campaign_id: isRpg ? selectedCampaignId || null : null,
            accept_observers: acceptObservers,
          } as any)
          .select()
          .single();
        if (error) throw error;

        if (selectedTagIds.length > 0) {
          await supabase
            .from("match_room_tag_links")
            .insert(selectedTagIds.map((tagId) => ({ room_id: data.id, tag_id: tagId })));
        }

        // Convites
        if (invitedFriendIds.length > 0) {
          const inviteRows = invitedFriendIds.map((pid, i) => ({
            room_id: data.id,
            player_id: pid,
            type: "invited",
            position: i + 1,
          }));
          await supabase.from("match_room_players").insert(inviteRows as any);
          sendRoomNotifications({
            userIds: invitedFriendIds,
            type: "room_invite",
            title: "Você foi convidado!",
            message: `${title ? `"${title}"` : "Uma sala"} — confirme sua presença.`,
            roomId: data.id,
          }).catch(() => {});
        }

        const game = games.find((g) => g.id === finalGameId);
        sendMatchNotification({
          event: "match_created",
          room_id: data.id,
          game: game?.name || "",
          title,
          scheduled_at: scheduledAt,
          max_players: parseInt(maxPlayers) || 10,
          players: [],
          created_by: user.id,
        });
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Sala atualizada!" : "Sala criada!");
      queryClient.invalidateQueries({ queryKey: ["match-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["match-room-form-options"] });
      onSuccess?.();
    },
    onError: () => {
      toast.error(isEdit ? "Erro ao atualizar sala" : "Erro ao criar sala");
    },
  });

  const handleSubmit = () => {
    if (!sec1Complete) {
      toast.error("Preencha o que vai jogar e o título");
      return;
    }
    if (!sec2Complete) {
      toast.error("Defina data, hora e vagas");
      return;
    }
    mutation.mutate();
  };

  /* ── Picker ─── */
  if (!isEdit && !category) {
    return (
      <div className="space-y-5">
        {!hideHeader && (
          <div>
            <h2 className="text-lg font-semibold text-foreground">Agendar partida ou sessão</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Crie uma sala pra reunir jogadores em um momento futuro
            </p>
          </div>
        )}
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Escolha a categoria</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {categoryCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setCategory(card.id);
                  if (card.id === "botc") setMaxPlayers("15");
                }}
                className={cn(
                  "flex flex-col items-center justify-center px-4 py-6 rounded-xl border border-border/60 bg-card/40 transition-all group",
                  card.border,
                )}
              >
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-full mb-3", card.bg)}>
                  <Icon className={cn("h-6 w-6", card.color)} />
                </span>
                <p className="font-semibold text-sm text-foreground">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-1 text-center">{card.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (optionsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  const cat: Category = (category || "boardgame") as Category;
  const cfg = DOMAIN_CONFIG[cat];
  const CatIcon = cfg.icon;

  /* ── Summaries ─── */
  const sec1Summary = sec1Complete
    ? isBotC
      ? `${bloodScripts.find((s) => s.id === selectedScriptId)?.name ?? ""} · ${title}`
      : isRpg
        ? `${selectedCampaign?.name ?? ""} · ${title}`
        : `${selectedGame?.name ?? ""} · ${title}`
    : undefined;
  const sec2Summary =
    sec2Complete && scheduledDate
      ? `${new Date(`${scheduledDate}T${scheduledTime || "00:00"}`).toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        })} · ${scheduledTime}${platform ? ` · ${platform}` : ""}`
      : undefined;
  const sec4Summary = (() => {
    const parts: string[] = [];
    if (selectedTagIds.length > 0) {
      parts.push(
        selectedTagIds
          .map((id) => availableTags.find((t) => t.id === id)?.name)
          .filter(Boolean)
          .join(" + "),
      );
    }
    const season = filteredSeasons.find((s) => s.id === selectedSeasonId);
    if (season) parts.push(season.name);
    return parts.join(" · ") || undefined;
  })();

  /* ── Form ─── */
  return (
    <div className="space-y-4">
      {/* Header */}
      {(!isEdit || !hideHeader) && (
        <div className="flex items-start gap-3">
          {!isEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategory("");
                setGameId("");
                setSelectedScriptId("");
                setSelectedCampaignId("");
              }}
              className="shrink-0"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          <div className="flex-1">
            {!hideHeader && <h2 className="text-lg font-semibold text-foreground">{cfg.title}</h2>}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
                hideHeader ? "" : "mt-1.5",
                cfg.accentBg,
                cfg.accentBorder,
                cfg.accent,
              )}
            >
              <CatIcon className="h-3.5 w-3.5" />
              {cfg.label}
            </span>
          </div>
        </div>
      )}

      {/* Section 1 - O que vai jogar */}
      <SectionCard index={1} title="O que vai jogar" complete={sec1Complete} summary={sec1Summary}>
        {isBotC ? (
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Script *</label>
            <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione o script" />
              </SelectTrigger>
              <SelectContent>
                {bloodScripts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : isRpg ? (
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Campanha *</label>
            {userCampaigns.length === 0 ? (
              <div className="mt-1.5 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Você ainda não mestra nenhuma campanha.{" "}
                <a href="/campanhas" className="text-purple-400 hover:underline">
                  Criar campanha
                </a>
              </div>
            ) : (
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione a campanha" />
                </SelectTrigger>
                <SelectContent>
                  {userCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedCampaign && (
              <div className="mt-2 rounded-md border border-purple-500/30 bg-purple-500/5 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  Apenas os aventureiros da campanha podem entrar como jogadores. Outros podem entrar como observadores.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Jogo *</label>
              {gameId && selectedGame ? (
                <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-border/40 bg-background/40 p-3">
                  <div className="h-14 w-14 rounded-md bg-secondary overflow-hidden flex-shrink-0">
                    {selectedGame.image_url ? (
                      <img src={selectedGame.image_url} alt={selectedGame.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        {selectedGame.name.slice(0, 4).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{selectedGame.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {selectedGame.min_players ?? 1}-{selectedGame.max_players ?? "?"} jogadores
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGameId("")}
                    className="text-xs text-gold hover:underline"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="mt-1.5 space-y-3">
                  {recentGames.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {recentGames.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGameId(g.id)}
                          className="group rounded-lg border border-border/40 bg-background/40 p-2 hover:border-gold/40 transition text-left"
                        >
                          <div className="aspect-square rounded-md bg-secondary overflow-hidden mb-2">
                            {g.image_url ? (
                              <img
                                src={g.image_url}
                                alt={g.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                                {g.name.slice(0, 4).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-medium truncate">{g.name}</p>
                          <p className="text-[10px] text-muted-foreground">{gamePlayCounts[g.id] || 0} partidas</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={gameSearch}
                      onChange={(e) => setGameSearch(e.target.value)}
                      placeholder="Buscar no catálogo..."
                      className="pl-9"
                    />
                    {filteredCatalog.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-60 overflow-auto">
                        {filteredCatalog.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setGameId(g.id);
                              setGameSearch("");
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-secondary text-sm flex items-center gap-2"
                          >
                            <div className="h-8 w-8 rounded bg-secondary overflow-hidden flex-shrink-0">
                              {g.image_url && (
                                <img src={g.image_url} alt={g.name} className="w-full h-full object-cover" />
                              )}
                            </div>
                            {g.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Título *</label>
              <Input
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Mesa de sábado"
              />
            </div>
          </div>
        )}

        {(isBotC || isRpg) && (
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Título *</label>
            <Input
              className="mt-1.5"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isBotC ? "Ex: Sessão de quinta" : "Ex: Sessão 3 - O Vale"}
            />
          </div>
        )}
      </SectionCard>

      {/* Section 2 - Quando */}
      <SectionCard index={2} title="Quando" complete={sec2Complete} summary={sec2Summary}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Data e hora *</label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <DatePickerField value={scheduledDate} onChange={setScheduledDate} placeholder="Data" />
              </div>
              <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-[110px] shrink-0" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Vagas</label>
            <div className="relative">
              <Input
                type="number"
                min="2"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                className="pr-16"
              />
              {selectedGame?.max_players && !isBotC && !isRpg && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                  de {selectedGame.max_players} max
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Local</label>
            <Select value={platform || "none"} onValueChange={(v) => setPlatform(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Onde será jogado?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não especificado</SelectItem>
                {PLATFORM_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Section 3 - Mesa */}
      <SectionCard index={3} title="Mesa" complete={sec3Complete} summary="Configure quem entra e em qual papel">
        <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-3 flex items-center gap-3">
          <Users className={cn("h-4 w-4", cfg.accent)} />
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold flex-1">
            Vagas de jogadores
          </span>
          <Input
            type="number"
            min="2"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
            className="w-20 text-center"
          />
          {selectedGame?.max_players && !isBotC && !isRpg && (
            <span className="text-[11px] text-muted-foreground">de {selectedGame.max_players} max</span>
          )}
        </div>

        {/* Convidar amigos — sempre visível, sem toggle */}
        {!isEdit && friends.length > 0 && (
          <div className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-gold" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold flex-1">
                Convidar amigos
              </span>
              <span className="text-[11px] text-muted-foreground">
                {invitedFriendIds.length}/{Math.max(parseInt(maxPlayers) || 0, 0)} vagas
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Buscar amigo..."
                className="pl-9 h-8 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto">
              {filteredFriends.map((f) => {
                const selected = invitedFriendIds.includes(f.id);
                const initials = (f.nickname || f.name || "?").slice(0, 2).toUpperCase();
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      setInvitedFriendIds((prev) =>
                        prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id],
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-xs font-medium border transition-all",
                      selected
                        ? "bg-gold/20 border-gold/60 text-gold"
                        : "bg-muted/40 border-border text-muted-foreground hover:border-gold/40",
                    )}
                  >
                    <span className="h-5 w-5 rounded-full bg-secondary text-[10px] inline-flex items-center justify-center overflow-hidden">
                      {f.avatar_url ? (
                        <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </span>
                    {f.nickname || f.name}
                    {selected && <X className="h-3 w-3" />}
                  </button>
                );
              })}
              {filteredFriends.length === 0 && (
                <p className="text-[11px] text-muted-foreground py-1">Nenhum amigo encontrado</p>
              )}
            </div>
            {invitedFriendIds.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Convidados ficam aguardando confirmação. Quando aceitarem, viram <strong>confirmados</strong>.
              </p>
            )}
          </div>
        )}

        {/* Observadores */}
        <label className="flex items-start gap-3 px-3 py-3 rounded-lg border border-border/40 bg-background/40 cursor-pointer hover:border-gold/30 transition">
          <Checkbox checked={acceptObservers} onCheckedChange={(c) => setAcceptObservers(!!c)} className="mt-0.5" />
          <Eye className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Aceitar observadores</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Qualquer pessoa pode entrar como observador (sem ocupar vaga, sem aprovação)
            </p>
          </div>
        </label>
      </SectionCard>

      {/* Section 4 - Quem pode entrar */}
      <SectionCard index={4} title="Quem pode entrar" complete={sec4Complete} summary={sec4Summary}>
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Tags da sala</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {availableTags
              .filter((tag) => {
                const n = tag.name.toLowerCase();
                return n !== "casual" && n !== "competitivo";
              })
              .map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                const isHighlight = tag.name.toLowerCase().includes("novato");
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      isSelected
                        ? isHighlight
                          ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-[0_0_12px_-2px_hsl(var(--domain-positive)/0.4)]"
                          : "bg-gold/20 border-gold/50 text-gold"
                        : isHighlight
                          ? "bg-emerald-500/5 border-emerald-400/30 text-emerald-300/80 hover:bg-emerald-500/10"
                          : "bg-muted/40 border-border text-muted-foreground hover:border-gold/30",
                    )}
                  >
                    {isHighlight && <Sparkles className="h-3 w-3 inline mr-1 -mt-0.5" />}
                    {tag.name}
                    {isSelected && <X className="h-3 w-3 inline ml-1" />}
                  </button>
                );
              })}
          </div>
        </div>

        {filteredSeasons.length > 0 && (
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Vale para temporada?
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={() => setSelectedSeasonId("")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  !selectedSeasonId
                    ? "bg-muted/60 border-border text-foreground"
                    : "bg-muted/30 border-border/60 text-muted-foreground hover:border-border",
                )}
              >
                Casual
              </button>
              {filteredSeasons.map((s) => {
                const active = selectedSeasonId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSeasonId(s.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      active
                        ? "bg-gold/20 border-gold/60 text-gold"
                        : "bg-muted/40 border-border text-muted-foreground hover:border-gold/30",
                    )}
                  >
                    {active && <Check className="h-3 w-3 inline mr-1 -mt-0.5" />}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {userCommunities.length > 0 && (
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Comunidade</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {userCommunities.map((c) => {
                const active = selectedCommunityId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setSelectedCommunityId("");
                        setCommunityOnly(false);
                      } else {
                        setSelectedCommunityId(c.id);
                      }
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      active
                        ? "bg-purple-500/20 border-purple-400/60 text-purple-300 shadow-[0_0_12px_-2px_hsl(270_70%_60%/0.4)]"
                        : "bg-muted/40 border-border text-muted-foreground hover:border-purple-400/40 hover:text-purple-300/80",
                    )}
                  >
                    <Users className="h-3 w-3" />
                    {c.name}
                    {active && <X className="h-3 w-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
            {selectedCommunityId && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer mt-2 px-3 py-2 rounded-md bg-purple-500/5 border border-purple-500/20">
                <Checkbox checked={communityOnly} onCheckedChange={(c) => setCommunityOnly(!!c)} />
                Exclusiva para membros da comunidade
              </label>
            )}
          </div>
        )}

        {isAdminMode && isEdit && (
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Status (admin)
            </label>
            <Select value={adminStatus} onValueChange={setAdminStatus}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Manter atual" />
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
        )}
      </SectionCard>

      {/* Section 5 - Descrição (collapsible) */}
      <SectionCard
        title="Descrição (opcional)"
        complete={!!description}
        summary="Texto livre"
        collapsible
        defaultOpen={false}
      >
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Observações sobre a partida..."
          rows={3}
        />
      </SectionCard>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <p className="text-xs text-muted-foreground">
          {sec1Complete && sec2Complete
            ? "Pronto pra agendar"
            : "Falta preencher: " +
              [!sec1Complete && "o que jogar", !sec2Complete && "data/hora"].filter(Boolean).join(", ")}
        </p>
        <Button variant="gold" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Agendar partida"}
        </Button>
      </div>
    </div>
  );
};

export default MatchRoomForm;
