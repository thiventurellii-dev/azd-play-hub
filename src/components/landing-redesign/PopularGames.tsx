import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BoardgameCard from "@/components/games/BoardgameCard";
import { useGamesData } from "@/hooks/useGamesData";
import { supabase } from "@/lib/supabaseExternal";
import { SectionHead } from "./SectionHead";

const BLOOD_DESCRIPTION =
  "O jogo de papel social mais complexo e satisfatório já criado. Aldeões contra Demônio em uma batalha de informação, lógica e confiança.";
const BLOOD_OFFICIAL_IMAGE =
  "https://wiki.bloodontheclocktower.com/images/4/4f/Blood-on-the-Clocktower-Logo-Tavern.png";

export const PopularGames = () => {
  const { data, isLoading } = useGamesData();
  const [extras, setExtras] = useState<{ blood: any | null; rpg: any | null }>({
    blood: null,
    rpg: null,
  });
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [bloodRes, rpgRes, bloodScriptRes, bloodMatchRes] = await Promise.all([
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
          .from("blood_scripts")
          .select("name,image_url")
          .order("created_at", { ascending: true })
          .limit(1),
        supabase.from("blood_matches").select("id"),
      ]);

      const bloodGame = bloodRes.data as any | null;
      const rpgGame = rpgRes.data as any | null;
      const officialImage =
        BLOOD_OFFICIAL_IMAGE ||
        (bloodScriptRes.data?.[0] as any)?.image_url ||
        bloodGame?.image_url;

      setExtras({
        blood: bloodGame
          ? {
              ...bloodGame,
              image_url: officialImage,
              description: BLOOD_DESCRIPTION,
              category: bloodGame.category ?? "Dedução Social",
              min_players: bloodGame.min_players ?? 5,
              max_players: bloodGame.max_players ?? 20,
              __matchCount: bloodMatchRes.data?.length ?? 0,
            }
          : null,
        rpg: rpgGame ?? null,
      });
    })();
  }, []);

  const games = data?.games ?? [];
  const matchCounts = data?.matchCounts ?? {};
  const avgDurations = data?.avgDurations ?? {};
  const gameSeasons = data?.gameSeasons ?? {};
  const gameTagMap = data?.gameTagMap ?? {};
  const activeSeasonGameIds = data?.activeSeasonGameIds ?? new Set<string>();

  // Sort: most matches first, then alpha
  const boardgames = [...games].sort(
    (a: any, b: any) =>
      (matchCounts[b.id] || 0) - (matchCounts[a.id] || 0) ||
      a.name.localeCompare(b.name),
  );

  const allCards: any[] = [...boardgames];
  if (extras.blood) allCards.push(extras.blood);
  if (extras.rpg) allCards.push(extras.rpg);

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

      <div
        ref={scrollerRef}
        className="overflow-x-auto overflow-y-visible pt-6 pb-8 scroll-smooth snap-x"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent 0, black 32px, black calc(100% - 32px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0, black 32px, black calc(100% - 32px), transparent 100%)",
        }}
      >
        <div className="container">
          <div className="flex gap-4 min-w-max items-stretch">
            {isLoading && allCards.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-[300px] sm:w-[320px] h-[440px] rounded-2xl border border-border/60 bg-surface animate-pulse"
                  />
                ))
              : allCards.map((g: any, i: number) => (
                  <div
                    key={g.id}
                    className="flex-shrink-0 w-[300px] sm:w-[330px] snap-start"
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
                ))}
          </div>
        </div>
      </div>

      {!isLoading && allCards.length === 0 && (
        <div className="container mt-6">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum jogo cadastrado ainda.
          </p>
        </div>
      )}
    </section>
  );
};
