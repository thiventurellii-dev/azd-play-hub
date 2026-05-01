import { useMemo, useState } from "react";
import { usePlayerAchievements } from "@/hooks/useAchievements";
import {
  useGamesMap,
  resolveDomain,
  DOMAIN_LABEL,
  type AchievementDomain,
} from "@/hooks/useGamesMap";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { AchievementsGalleryDialog } from "@/components/achievements/AchievementsGalleryDialog";
import { RARITY_ORDER } from "@/lib/achievementUi";

interface Props {
  profileId: string;
  domain: AchievementDomain;
  playerName?: string;
  /** quantos chips mostrar antes de virar "+N" */
  limit?: number;
}

/**
 * Sub-seção "Conquistas em [domínio]" embutida em cada tab
 * (Boardgames/BotC/RPG) — ver briefing item 2.
 */
export const ProfileDomainAchievements = ({
  profileId,
  domain,
  playerName,
  limit = 7,
}: Props) => {
  const { data } = usePlayerAchievements(profileId);
  const { data: gamesMap } = useGamesMap();
  const [galleryOpen, setGalleryOpen] = useState(false);

  const map = gamesMap ?? new Map<string, string>();
  const visible = data?.visible ?? [];

  const filtered = useMemo(() => {
    return visible
      .map((a) => {
        const scopeName = a.scope_id ? map.get(a.scope_id) : undefined;
        const d = resolveDomain(a.template.scope_type, scopeName, a.template.code);
        return { a, scopeName, domain: d };
      })
      .filter((e) => e.domain === domain)
      .sort(
        (x, y) =>
          (RARITY_ORDER[y.a.template.rarity] ?? 0) -
          (RARITY_ORDER[x.a.template.rarity] ?? 0),
      );
  }, [visible, map, domain]);

  if (filtered.length === 0) return null;

  const preview = filtered.slice(0, limit);
  const remaining = filtered.length - preview.length;

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
            Conquistas em {DOMAIN_LABEL[domain]}
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {filtered.length} desbloqueada{filtered.length > 1 ? "s" : ""}
          </span>
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
      </section>

      <AchievementsGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        achievements={visible}
        gamesMap={map}
        playerName={playerName}
        initialDomainFilter={domain}
      />
    </>
  );
};

export default ProfileDomainAchievements;
