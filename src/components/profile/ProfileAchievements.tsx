import { useMemo, useState } from "react";
import { usePlayerAchievements } from "@/hooks/useAchievements";
import { useGamesMap, resolveDomain, DOMAIN_LABEL, type AchievementDomain } from "@/hooks/useGamesMap";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { AchievementsGalleryDialog } from "@/components/achievements/AchievementsGalleryDialog";
import { Button } from "@/components/ui/button";
import { RARITY_HEX, RARITY_ORDER } from "@/lib/achievementUi";

interface Props {
  profileId: string;
  isOwnProfile?: boolean;
  playerName?: string;
}

const DOMAIN_PRIORITY: AchievementDomain[] = ["boardgame", "botc", "rpg", "global"];

export const ProfileAchievements = ({ profileId, playerName }: Props) => {
  const { data, isLoading } = usePlayerAchievements(profileId);
  const { data: gamesMap } = useGamesMap();
  const [galleryOpen, setGalleryOpen] = useState(false);

  const visible = data?.visible ?? [];
  const map = gamesMap ?? new Map<string, string>();

  const enriched = useMemo(
    () =>
      visible.map((a) => {
        const scopeName = a.scope_id ? map.get(a.scope_id) : undefined;
        const domain = resolveDomain(a.template.scope_type, scopeName, a.template.code);
        return { a, scopeName, domain };
      }),
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

  const showcase = useMemo(() => {
    return [...enriched]
      .sort((x, y) => {
        const r = (RARITY_ORDER[y.a.template.rarity] ?? 0) - (RARITY_ORDER[x.a.template.rarity] ?? 0);
        if (r !== 0) return r;
        return (y.a.unlocked_at ?? "").localeCompare(x.a.unlocked_at ?? "");
      })
      .slice(0, 4);
  }, [enriched]);

  const byDomain = useMemo(() => {
    const m = new Map<AchievementDomain, typeof enriched>();
    for (const e of enriched) {
      const arr = m.get(e.domain) ?? [];
      arr.push(e);
      m.set(e.domain, arr);
    }
    // ordena cada domínio por raridade desc
    for (const arr of m.values()) {
      arr.sort((x, y) => (RARITY_ORDER[y.a.template.rarity] ?? 0) - (RARITY_ORDER[x.a.template.rarity] ?? 0));
    }
    return m;
  }, [enriched]);

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
              {counters.games > 0 ? ` · ${counters.games} jogo${counters.games > 1 ? "s" : ""}` : ""}
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

        {/* Showcase: top 4 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {showcase.map(({ a, scopeName }) => (
            <AchievementCard key={a.id} achievement={a} scopeName={scopeName} />
          ))}
        </div>

        {/* Seções por domínio */}
        <div className="space-y-4 pt-2">
          {DOMAIN_PRIORITY.map((domain) => {
            const items = byDomain.get(domain);
            if (!items || items.length === 0) return null;
            const preview = items.slice(0, 5);
            const remaining = items.length - preview.length;
            return (
              <div key={domain} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                    Conquistas em {DOMAIN_LABEL[domain]}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {items.length} desbloqueada{items.length > 1 ? "s" : ""} neste domínio
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {preview.map(({ a, scopeName }) => (
                    <AchievementCard
                      key={a.id}
                      achievement={a}
                      scopeName={scopeName}
                      variant="chip"
                    />
                  ))}
                  {remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setGalleryOpen(true)}
                      className="text-xs text-primary hover:underline px-2 py-1"
                    >
                      +{remaining} →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
