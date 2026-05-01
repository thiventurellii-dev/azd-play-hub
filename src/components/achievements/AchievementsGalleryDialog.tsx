import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AchievementBadge } from "./AchievementBadge";
import type { PlayerAchievement } from "@/hooks/useAchievements";
import {
  rarityTintStyle,
  RARITY_HEX,
  RARITY_LABEL_SHORT,
  RARITY_ORDER,
  resolveDescription,
} from "@/lib/achievementUi";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  achievements: PlayerAchievement[];
  gamesMap: Map<string, string>;
  playerName?: string;
}

type TabKey = "by_game" | "recent" | "category" | "rare" | "manual" | "season";

interface EnrichedAchievement {
  a: PlayerAchievement;
  scopeName: string;
  description: string;
}

const enrich = (a: PlayerAchievement, gamesMap: Map<string, string>): EnrichedAchievement => {
  const gameName = a.scope_id ? gamesMap.get(a.scope_id) : undefined;
  const scopeName =
    a.template.scope_type === "global"
      ? "Global"
      : a.template.scope_type === "season"
        ? "Season"
        : gameName ?? "—";
  const description = resolveDescription(a.template.description_template, {
    threshold: a.template.threshold,
    gameName,
  });
  return { a, scopeName, description };
};

const formatDate = (d: string | null) =>
  d ? format(new Date(d), "dd/MM", { locale: ptBR }) : "";

// ---------------------------------------------------------------
// Linha de conquista — usada em todas as abas
// ---------------------------------------------------------------
const AchievementRow = ({ item }: { item: EnrichedAchievement }) => {
  const { a, scopeName, description } = item;
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border"
      style={rarityTintStyle(a.template.rarity)}
    >
      <AchievementBadge
        category={a.template.category}
        rarity={a.template.rarity}
        level={a.template.progression_level ?? undefined}
        size="medium"
        name={a.template.name}
        description={description}
        communityPct={a.community_percentage}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{a.template.name}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-1">
          {description || scopeName}
          {description && a.template.scope_type === "game" ? (
            <> · <span className="text-foreground/60">{scopeName}</span></>
          ) : null}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span
          className="text-[10px] uppercase tracking-wider tabular-nums"
          style={{ color: RARITY_HEX[a.template.rarity] }}
        >
          {RARITY_LABEL_SHORT[a.template.rarity]}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {formatDate(a.unlocked_at)}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------
// Helpers de agrupamento
// ---------------------------------------------------------------
const sortByRecency = (a: EnrichedAchievement, b: EnrichedAchievement) =>
  (b.a.unlocked_at ?? "").localeCompare(a.a.unlocked_at ?? "");

const sortByRarity = (a: EnrichedAchievement, b: EnrichedAchievement) => {
  const r = RARITY_ORDER[b.a.template.rarity] - RARITY_ORDER[a.a.template.rarity];
  if (r !== 0) return r;
  return sortByRecency(a, b);
};

const CATEGORY_LABEL: Record<string, string> = {
  participation: "Participação",
  competitive: "Competitivo",
  social: "Social",
  season: "Temporada",
  special: "Especial",
  contribution: "Contribuição",
};

// ---------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------
export const AchievementsGalleryDialog = ({
  open,
  onOpenChange,
  achievements,
  gamesMap,
  playerName,
}: Props) => {
  const [tab, setTab] = useState<TabKey>("by_game");

  const items = useMemo(
    () => achievements.map((a) => enrich(a, gamesMap)),
    [achievements, gamesMap],
  );

  const counters = useMemo(() => {
    const games = new Set<string>();
    let rare = 0, mesa = 0, legendary = 0, manual = 0;
    const seasons = new Set<string>();
    for (const it of items) {
      if (it.a.template.scope_type === "game" && it.a.scope_id) games.add(it.a.scope_id);
      if (it.a.template.scope_type === "season" && it.a.scope_id) seasons.add(it.a.scope_id);
      if (it.a.template.rarity === "rare") rare++;
      if (it.a.template.rarity === "mesa") mesa++;
      if (it.a.template.rarity === "legendary") legendary++;
      if (it.a.template.type === "manual_claim" || it.a.template.rarity === "mesa") manual++;
    }
    return {
      total: items.length,
      games: games.size,
      seasons: seasons.size,
      rare,
      mesa,
      legendary,
      manual,
    };
  }, [items]);

  // Agrupado por jogo: globals primeiro, depois cada jogo
  const byGameGroups = useMemo(() => {
    const globals: EnrichedAchievement[] = [];
    const seasons: EnrichedAchievement[] = [];
    const perGame = new Map<string, EnrichedAchievement[]>();
    for (const it of items) {
      if (it.a.template.scope_type === "global") globals.push(it);
      else if (it.a.template.scope_type === "season") seasons.push(it);
      else if (it.a.template.scope_type === "game") {
        const key = it.scopeName;
        if (!perGame.has(key)) perGame.set(key, []);
        perGame.get(key)!.push(it);
      }
    }
    globals.sort(sortByRecency);
    seasons.sort(sortByRecency);
    const groups: { name: string; items: EnrichedAchievement[] }[] = [];
    if (globals.length > 0) groups.push({ name: "Globais", items: globals });
    if (seasons.length > 0) groups.push({ name: "Seasons", items: seasons });
    for (const [name, list] of perGame) {
      list.sort(sortByRecency);
      groups.push({ name, items: list });
    }
    return groups;
  }, [items]);

  const recentList = useMemo(() => [...items].sort(sortByRecency), [items]);

  const byCategoryGroups = useMemo(() => {
    const m = new Map<string, EnrichedAchievement[]>();
    for (const it of items) {
      const k = it.a.template.category;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return [...m.entries()].map(([cat, list]) => ({
      name: CATEGORY_LABEL[cat] ?? cat,
      items: list.sort(sortByRarity),
    }));
  }, [items]);

  const rareList = useMemo(
    () =>
      items
        .filter((it) =>
          ["rare", "epic", "legendary", "mesa"].includes(it.a.template.rarity),
        )
        .sort(sortByRarity),
    [items],
  );

  const manualList = useMemo(
    () =>
      items
        .filter(
          (it) =>
            it.a.template.type === "manual_claim" || it.a.template.rarity === "mesa",
        )
        .sort(sortByRecency),
    [items],
  );

  const seasonList = useMemo(
    () =>
      items.filter((it) => it.a.template.scope_type === "season").sort(sortByRecency),
    [items],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span>Conquistas{playerName ? ` de ${playerName}` : ""}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {counters.total} desbloqueada{counters.total > 1 ? "s" : ""}
              {counters.games > 0 ? ` · ${counters.games} jogo${counters.games > 1 ? "s" : ""} com conquistas` : ""}
              {counters.rare > 0 ? (
                <> · <span style={{ color: RARITY_HEX.rare }}>{counters.rare} rara{counters.rare > 1 ? "s" : ""}</span></>
              ) : null}
              {counters.mesa > 0 ? (
                <> · <span style={{ color: RARITY_HEX.mesa }}>{counters.mesa} validada{counters.mesa > 1 ? "s" : ""} pela mesa</span></>
              ) : null}
              {counters.legendary > 0 ? (
                <> · <span style={{ color: RARITY_HEX.legendary }}>{counters.legendary} lendária{counters.legendary > 1 ? "s" : ""}</span></>
              ) : null}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="self-start flex-wrap h-auto">
            <TabsTrigger value="by_game">Por jogo</TabsTrigger>
            <TabsTrigger value="recent">Recentes</TabsTrigger>
            <TabsTrigger value="category">Categoria</TabsTrigger>
            {(counters.rare + counters.mesa + counters.legendary) > 0 && (
              <TabsTrigger value="rare">
                Raras <span className="ml-1 text-muted-foreground">{rareList.length}</span>
              </TabsTrigger>
            )}
            {counters.manual > 0 && (
              <TabsTrigger value="manual">
                Manuais <span className="ml-1 text-muted-foreground">{manualList.length}</span>
              </TabsTrigger>
            )}
            {counters.seasons > 0 && (
              <TabsTrigger value="season">
                Seasons <span className="ml-1 text-muted-foreground">{counters.seasons}</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[60vh] pr-3">
              <TabsContent value="by_game" className="m-0 space-y-5">
                {byGameGroups.map((g) => (
                  <GroupBlock key={g.name} title={g.name} items={g.items} />
                ))}
              </TabsContent>
              <TabsContent value="recent" className="m-0 space-y-2">
                {recentList.map((it) => (
                  <AchievementRow key={it.a.id} item={it} />
                ))}
              </TabsContent>
              <TabsContent value="category" className="m-0 space-y-5">
                {byCategoryGroups.map((g) => (
                  <GroupBlock key={g.name} title={g.name} items={g.items} />
                ))}
              </TabsContent>
              <TabsContent value="rare" className="m-0 space-y-2">
                {rareList.length === 0 ? (
                  <EmptyState>Nenhuma conquista rara ainda.</EmptyState>
                ) : (
                  rareList.map((it) => <AchievementRow key={it.a.id} item={it} />)
                )}
              </TabsContent>
              <TabsContent value="manual" className="m-0 space-y-2">
                {manualList.length === 0 ? (
                  <EmptyState>Nenhuma conquista validada pela mesa.</EmptyState>
                ) : (
                  manualList.map((it) => <AchievementRow key={it.a.id} item={it} />)
                )}
              </TabsContent>
              <TabsContent value="season" className="m-0 space-y-2">
                {seasonList.length === 0 ? (
                  <EmptyState>Nenhuma conquista de season.</EmptyState>
                ) : (
                  seasonList.map((it) => <AchievementRow key={it.a.id} item={it} />)
                )}
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>

        {/* Legenda de raridade */}
        <div className="border-t border-border/60 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {(["common", "uncommon", "rare", "epic", "legendary", "mesa"] as const).map((r) => (
            <div key={r} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: RARITY_HEX[r] }}
              />
              {RARITY_LABEL_SHORT[r]}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const GroupBlock = ({
  title,
  items,
}: {
  title: string;
  items: EnrichedAchievement[];
}) => (
  <div className="space-y-2">
    <div className="flex items-baseline gap-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <span className="text-xs text-muted-foreground">
        {items.length} conquista{items.length > 1 ? "s" : ""}
      </span>
    </div>
    <div className="space-y-2">
      {items.map((it) => (
        <AchievementRow key={it.a.id} item={it} />
      ))}
    </div>
  </div>
);

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground py-8 text-center">{children}</p>
);

export default AchievementsGalleryDialog;
