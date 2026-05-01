import { useMemo, useState } from "react";
import { usePlayerAchievements } from "@/hooks/useAchievements";
import { useGamesMap } from "@/hooks/useGamesMap";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { AchievementsGalleryDialog } from "@/components/achievements/AchievementsGalleryDialog";
import { Button } from "@/components/ui/button";
import { RARITY_HEX, RARITY_ORDER } from "@/lib/achievementUi";

interface Props {
  profileId: string;
  isOwnProfile?: boolean;
  playerName?: string;
}

export const ProfileAchievements = ({ profileId, playerName }: Props) => {
  const { data, isLoading } = usePlayerAchievements(profileId);
  const { data: gamesMap } = useGamesMap();
  const [galleryOpen, setGalleryOpen] = useState(false);

  const visible = data?.visible ?? [];
  const map = gamesMap ?? new Map<string, string>();

  const enriched = useMemo(
    () =>
      visible.map((a) => ({
        a,
        scopeName: a.scope_id ? map.get(a.scope_id) : undefined,
      })),
    [visible, map],
  );

  const counters = useMemo(() => {
    const games = new Set<string>();
    let rare = 0, mesa = 0, legendary = 0;
    for (const { a } of enriched) {
      if (a.template.scope_type === "game" && a.scope_id) games.add(a.scope_id);
      if (a.template.rarity === "rare") rare++;
      if (a.template.rarity === "mesa") mesa++;
      if (a.template.rarity === "legendary") legendary++;
    }
    return { total: enriched.length, games: games.size, rare, mesa, legendary };
  }, [enriched]);

  const showcase = useMemo(
    () =>
      [...enriched]
        .sort((x, y) => {
          const r =
            (RARITY_ORDER[y.a.template.rarity] ?? 0) -
            (RARITY_ORDER[x.a.template.rarity] ?? 0);
          if (r !== 0) return r;
          return (y.a.unlocked_at ?? "").localeCompare(x.a.unlocked_at ?? "");
        })
        .slice(0, 4),
    [enriched],
  );

  if (isLoading) return null;
  if (visible.length === 0) return null;

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-5 space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Conquistas</h3>
            <p className="text-xs text-muted-foreground">
              {counters.total} desbloqueada{counters.total > 1 ? "s" : ""}
              {counters.games > 0
                ? ` · ${counters.games} jogo${counters.games > 1 ? "s" : ""}`
                : ""}
              {counters.rare > 0 ? (
                <> · <span style={{ color: RARITY_HEX.rare }}>{counters.rare} rara{counters.rare > 1 ? "s" : ""}</span></>
              ) : null}
              {counters.mesa > 0 ? (
                <> · <span style={{ color: RARITY_HEX.mesa }}>{counters.mesa} mesa</span></>
              ) : null}
              {counters.legendary > 0 ? (
                <> · <span style={{ color: RARITY_HEX.legendary }}>{counters.legendary} lendária{counters.legendary > 1 ? "s" : ""}</span></>
              ) : null}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary hover:text-primary"
            onClick={() => setGalleryOpen(true)}
          >
            Ver todas →
          </Button>
        </header>

        {/* Vitrine: top 4 por raridade */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {showcase.map(({ a, scopeName }) => (
            <AchievementCard key={a.id} achievement={a} scopeName={scopeName} />
          ))}
        </div>
      </section>

      <AchievementsGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        achievements={visible}
        gamesMap={map}
        playerName={playerName}
      />
    </>
  );
};

export default ProfileAchievements;

