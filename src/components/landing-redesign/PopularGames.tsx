import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BoardgameCard from "@/components/games/BoardgameCard";
import { useGamesData } from "@/hooks/useGamesData";
import { supabase } from "@/lib/supabaseExternal";
import { SectionHead } from "./SectionHead";
import bloodCover from "@/assets/blood-clocktower.png";

const BLOOD_DESCRIPTION =
  "O jogo de papel social mais complexo e satisfatório já criado. Aldeões contra Demônio em uma batalha de informação, lógica e confiança.";

// Slugs/names dos jogos "principais" — ficam em destaque
const FEATURED_MATCHERS = [
  /dune/i,
  /blood on the clocktower/i,
  /brass/i,
];

const isFeatured = (name: string) => FEATURED_MATCHERS.some((r) => r.test(name));

export const PopularGames = () => {
  const { data, isLoading } = useGamesData();
  const [extras, setExtras] = useState<{ blood: any | null; rpg: any | null }>({
    blood: null,
    rpg: null,
  });
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [bloodRes, rpgGameRes, rpgAdvRes, bloodMatchRes] = await Promise.all([
        supabase
          .from("games")
          .select("*")
          .or("slug.eq.blood-on-the-clocktower,name.ilike.%clocktower%")
          .maybeSingle(),
        supabase
          .from("games")
          .select("*")
          .or("slug.eq.rpg-generico,slug.eq.rpg-generic,name.eq.RPG")
          .maybeSingle(),
        supabase
          .from("rpg_adventures")
          .select("id,name,description,image_url,min_players,max_players,recommended_level")
          .ilike("name", "%RPG da AzD%")
          .maybeSingle(),
        supabase.from("blood_matches").select("id"),
      ]);

      const bloodGame = bloodRes.data as any | null;
      const rpgGame = rpgGameRes.data as any | null;
      const rpgAdv = rpgAdvRes.data as any | null;

      setExtras({
        blood: bloodGame
          ? {
              ...bloodGame,
              image_url: bloodCover,
              description: BLOOD_DESCRIPTION,
              category: bloodGame.category ?? "Dedução Social",
              min_players: bloodGame.min_players ?? 5,
              max_players: bloodGame.max_players ?? 20,
              __matchCount: bloodMatchRes.data?.length ?? 0,
            }
          : null,
        rpg: rpgGame
          ? {
              ...rpgGame,
              name: rpgAdv?.name || "RPG da AzD",
              slug: rpgGame.slug,
              image_url: rpgAdv?.image_url || rpgGame.image_url,
              description:
                rpgAdv?.description ||
                "Mesa oficial de RPG da comunidade no sistema Pathfinder 2e.",
              category: "RPG · Pathfinder 2e",
              min_players: rpgAdv?.min_players ?? rpgGame.min_players ?? 3,
              max_players: rpgAdv?.max_players ?? rpgGame.max_players ?? 6,
            }
          : null,
      });
    })();
  }, []);

  const games = data?.games ?? [];
  const matchCounts = data?.matchCounts ?? {};
  const avgDurations = data?.avgDurations ?? {};
  const gameSeasons = data?.gameSeasons ?? {};
  const gameTagMap = data?.gameTagMap ?? {};
  const activeSeasonGameIds = data?.activeSeasonGameIds ?? new Set<string>();

  // Build full list, then sort: featured first (Dune, Blood, Brass), rest by matches
  const all: any[] = [...games];
  // Replace blood entry with enriched one (override image/desc), or push if missing
  if (extras.blood) {
    const idx = all.findIndex((g) => /blood on the clocktower/i.test(g.name));
    if (idx >= 0) all[idx] = { ...all[idx], ...extras.blood };
    else all.push(extras.blood);
  }
  // Replace generic RPG with curated one
  if (extras.rpg) {
    const idx = all.findIndex((g) => /^rpg$/i.test(g.name));
    if (idx >= 0) all[idx] = { ...all[idx], ...extras.rpg };
    else all.push(extras.rpg);
  }

  const sorted = all.sort((a, b) => {
    const fa = isFeatured(a.name) ? 0 : 1;
    const fb = isFeatured(b.name) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return (matchCounts[b.id] || 0) - (matchCounts[a.id] || 0) || a.name.localeCompare(b.name);
  });

  const scroll = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  return (
    <section id="jogos" className="border-t border-border/60 py-20 md:py-24">
      <div className="container">
        <SectionHead
          eyebrow="Jogos populares"
          title={<>O que está rolando por aqui.</>}
          align="row"
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Anterior"
                onClick={() => scroll(-1)}
                className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-muted-foreground hover:bg-surface-raised transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Próximo"
                onClick={() => scroll(1)}
                className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-muted-foreground hover:bg-surface-raised transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <Link
                to="/games"
                className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-border text-sm font-medium hover:border-muted-foreground hover:bg-surface-raised transition-all"
              >
                Ver catálogo →
              </Link>
            </div>
          }
        />
      </div>

      <div className="container mt-8">
        <div
          ref={scrollerRef}
          className="overflow-x-auto overflow-y-visible pt-6 pb-8 scroll-smooth snap-x snap-mandatory"
          style={{
            maskImage:
              "linear-gradient(90deg, transparent 0, rgba(0,0,0,0.15) 60px, black 160px, black calc(100% - 160px), rgba(0,0,0,0.15) calc(100% - 60px), transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0, rgba(0,0,0,0.15) 60px, black 160px, black calc(100% - 160px), rgba(0,0,0,0.15) calc(100% - 60px), transparent 100%)",
          }}
        >
          <div className="flex gap-5 items-stretch px-2">
            {isLoading && sorted.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-[320px] h-[520px] rounded-2xl border border-border/60 bg-surface animate-pulse"
                  />
                ))
              : sorted.map((g: any, i: number) => {
                  const featured = isFeatured(g.name);
                  return (
                    <div
                      key={g.id}
                      className={`flex-shrink-0 w-[320px] h-[520px] snap-start transition-all duration-300 ${
                        featured
                          ? "opacity-100"
                          : "opacity-80 hover:opacity-100 saturate-90 hover:saturate-100"
                      }`}
                    >
                      <BoardgameCard
                        game={g}
                        seasons={gameSeasons[g.id] || []}
                        avgDuration={avgDurations[g.id]}
                        matchCount={
                          g.__matchCount != null ? g.__matchCount : matchCounts[g.id] || 0
                        }
                        hasActiveSeason={activeSeasonGameIds.has(g.id)}
                        tags={gameTagMap[g.id] || []}
                        index={i}
                        onUpdated={() => {}}
                      />
                    </div>
                  );
                })}
          </div>
        </div>
      </div>

      {!isLoading && sorted.length === 0 && (
        <div className="container mt-6">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum jogo cadastrado ainda.
          </p>
        </div>
      )}
    </section>
  );
};
