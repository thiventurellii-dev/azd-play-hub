import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AchievementCard } from "./AchievementCard";
import type { PlayerAchievement } from "@/hooks/useAchievements";
import {
  resolveDomain,
  DOMAIN_LABEL,
  type AchievementDomain,
} from "@/hooks/useGamesMap";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  achievements: PlayerAchievement[];
  gamesMap: Map<string, string>;
  playerName?: string;
}

const RARITY_ORDER: Record<string, number> = {
  legendary: 5, epic: 4, mesa: 3, rare: 2, uncommon: 1, common: 0,
};

export const AchievementsGalleryDialog = ({
  open,
  onOpenChange,
  achievements,
  gamesMap,
  playerName,
}: Props) => {
  const [tab, setTab] = useState<AchievementDomain | "all">("all");

  const enriched = useMemo(
    () =>
      achievements.map((a) => {
        const scopeName = a.scope_id ? gamesMap.get(a.scope_id) : undefined;
        const domain = resolveDomain(a.template.scope_type, scopeName, a.template.code);
        return { a, scopeName, domain };
      }),
    [achievements, gamesMap],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: enriched.length, boardgame: 0, botc: 0, rpg: 0, global: 0 };
    for (const e of enriched) c[e.domain]++;
    return c;
  }, [enriched]);

  const filtered = useMemo(() => {
    const base = tab === "all" ? enriched : enriched.filter((e) => e.domain === tab);
    return [...base].sort((x, y) => {
      const r = (RARITY_ORDER[y.a.template.rarity] ?? 0) - (RARITY_ORDER[x.a.template.rarity] ?? 0);
      if (r !== 0) return r;
      return (y.a.unlocked_at ?? "").localeCompare(x.a.unlocked_at ?? "");
    });
  }, [enriched, tab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Conquistas{playerName ? ` de ${playerName}` : ""}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({enriched.length})
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="self-start">
            <TabsTrigger value="all">Todas ({counts.all})</TabsTrigger>
            {counts.boardgame > 0 && (
              <TabsTrigger value="boardgame">Boardgame ({counts.boardgame})</TabsTrigger>
            )}
            {counts.botc > 0 && (
              <TabsTrigger value="botc">BotC ({counts.botc})</TabsTrigger>
            )}
            {counts.rpg > 0 && (
              <TabsTrigger value="rpg">RPG ({counts.rpg})</TabsTrigger>
            )}
            {counts.global > 0 && (
              <TabsTrigger value="global">Global ({counts.global})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value={tab} className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[60vh] pr-3">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhuma conquista neste domínio.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filtered.map(({ a, scopeName }) => (
                    <AchievementCard key={a.id} achievement={a} scopeName={scopeName} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AchievementsGalleryDialog;
