import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseExternal";

export interface LandingStats {
  players: number;
  matches: number;
  seasons: number;
  games: number;
}

export interface PopularGame {
  id: string;
  name: string;
  image_url: string | null;
  category: string | null;
  description: string | null;
  min_players: number | null;
  max_players: number | null;
  matchCount: number;
  /** Optional href override (used for virtual entries like RPG) */
  href?: string;
  /** Optional type/system label shown as small chip */
  typeLabel?: string;
}

export interface ActiveSeasonInfo {
  id: string;
  name: string;
  end_date: string;
  daysLeft: number;
}

export function useLandingData() {
  const [stats, setStats] = useState<LandingStats>({ players: 0, matches: 0, seasons: 0, games: 0 });
  const [popularGames, setPopularGames] = useState<PopularGame[]>([]);
  const [activeSeason, setActiveSeason] = useState<ActiveSeasonInfo | null>(null);
  const [topPlayers, setTopPlayers] = useState<{ name: string; mmr: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, gamesRes, matchesRes, bloodRes, seasonsRes, rpgAdvRes, rpgSysRes, rpgCampRes] =
          await Promise.all([
            supabase.rpc("get_landing_stats"),
            supabase
              .from("games")
              .select("id,name,image_url,category,description,min_players,max_players"),
            supabase.from("matches").select("game_id"),
            supabase.from("blood_matches").select("id"),
            supabase
              .from("seasons")
              .select("id,name,status,end_date,start_date")
              .eq("status", "active")
              .order("start_date", { ascending: false })
              .limit(1),
            supabase
              .from("rpg_adventures")
              .select("id,name,description,image_url,system_id,min_players,max_players"),
            supabase.from("rpg_systems").select("id,name"),
            supabase.from("rpg_campaigns").select("id"),
          ]);

        if (cancelled) return;

        if (statsRes.data && typeof statsRes.data === "object") {
          const d = statsRes.data as Record<string, number>;
          setStats({
            players: d.players ?? 0,
            matches: d.matches ?? 0,
            seasons: d.seasons ?? 0,
            games: d.games ?? 0,
          });
        }

        const games = (gamesRes.data ?? []) as Array<Omit<PopularGame, "matchCount" | "href" | "typeLabel">>;
        const counts = new Map<string, number>();
        for (const m of (matchesRes.data ?? []) as { game_id: string }[]) {
          counts.set(m.game_id, (counts.get(m.game_id) ?? 0) + 1);
        }

        const blood = games.find((g) => /blood on the clocktower/i.test(g.name));
        if (blood) counts.set(blood.id, (counts.get(blood.id) ?? 0) + (bloodRes.data?.length ?? 0));

        const rpgGame = games.find((g) => /^rpg$/i.test(g.name));
        const rpgCampaignCount = (rpgCampRes.data?.length ?? 0);
        const adventures = (rpgAdvRes.data ?? []) as Array<{
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          system_id: string | null;
          min_players: number | null;
          max_players: number | null;
        }>;
        const systems = (rpgSysRes.data ?? []) as Array<{ id: string; name: string }>;
        const pathfinder = systems.find((s) => /pathfinder/i.test(s.name));
        const pathfinderAdv = pathfinder
          ? adventures.find((a) => a.system_id === pathfinder.id)
          : adventures[0];

        const boardgames: PopularGame[] = games
          .filter((g) => !/^rpg$/i.test(g.name))
          .map((g) => {
            const isBotc = /blood on the clocktower/i.test(g.name);
            return {
              ...g,
              matchCount: counts.get(g.id) ?? 0,
              typeLabel: isBotc ? "Social Deduction" : g.category ?? null ?? undefined,
            };
          })
          .filter((g) => g.matchCount > 0);

        // Build virtual RPG entry (Pathfinder 2e) if we have data
        const rpgEntry: PopularGame | null =
          rpgGame && pathfinder
            ? {
                id: rpgGame.id,
                name: "RPG · Pathfinder 2e",
                image_url: pathfinderAdv?.image_url ?? rpgGame.image_url ?? null,
                category: "RPG",
                description:
                  pathfinderAdv?.description ??
                  "Mesas de RPG da comunidade no sistema Pathfinder 2e, com mestres e personagens recorrentes.",
                min_players: pathfinderAdv?.min_players ?? rpgGame.min_players ?? 3,
                max_players: pathfinderAdv?.max_players ?? rpgGame.max_players ?? 6,
                matchCount: rpgCampaignCount,
                href: `/games/${rpgGame.id}`,
                typeLabel: pathfinder.name,
              }
            : null;

        const ranked = [...boardgames].sort((a, b) => b.matchCount - a.matchCount).slice(0, 8);
        if (rpgEntry) ranked.push(rpgEntry);
        setPopularGames(ranked);

        const s = seasonsRes.data?.[0];
        if (s) {
          const end = new Date(s.end_date + "T23:59:59");
          const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
          const seasonId = s.id as string;
          setActiveSeason({ id: seasonId, name: s.name as string, end_date: s.end_date as string, daysLeft: days });

          const { data: ratings } = await supabase
            .from("mmr_ratings")
            .select("player_id,current_mmr")
            .eq("season_id", seasonId);
          if (!cancelled && ratings) {
            const agg = new Map<string, { mmr: number; count: number }>();
            for (const r of ratings as { player_id: string; current_mmr: number }[]) {
              const cur = agg.get(r.player_id) ?? { mmr: 0, count: 0 };
              cur.mmr += Number(r.current_mmr ?? 0);
              cur.count += 1;
              agg.set(r.player_id, cur);
            }
            const top = Array.from(agg.entries())
              .map(([player_id, v]) => ({ player_id, mmr: v.mmr / Math.max(1, v.count) }))
              .sort((a, b) => b.mmr - a.mmr)
              .slice(0, 4);
            if (top.length) {
              const ids = top.map((t) => t.player_id);
              const { data: profs } = await supabase
                .from("profiles")
                .select("id,name,nickname")
                .in("id", ids);
              const nameById = new Map<string, string>();
              for (const p of (profs ?? []) as any[]) {
                nameById.set(p.id, p.nickname || p.name || "Jogador");
              }
              setTopPlayers(top.map((t) => ({ name: nameById.get(t.player_id) ?? "Jogador", mmr: t.mmr })));
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, popularGames, activeSeason, topPlayers, loading };
}
