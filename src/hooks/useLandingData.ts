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
  min_players: number | null;
  max_players: number | null;
  matchCount: number;
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
        const [statsRes, gamesRes, matchesRes, bloodRes, seasonsRes] = await Promise.all([
          supabase.rpc("get_landing_stats"),
          supabase.from("games").select("id,name,image_url,category,min_players,max_players"),
          supabase.from("matches").select("game_id"),
          supabase.from("blood_matches").select("id"),
          supabase
            .from("seasons")
            .select("id,name,status,end_date,start_date")
            .eq("status", "active")
            .order("start_date", { ascending: false })
            .limit(1),
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

        const games = (gamesRes.data ?? []) as Omit<PopularGame, "matchCount">[];
        const counts = new Map<string, number>();
        for (const m of (matchesRes.data ?? []) as { game_id: string }[]) {
          counts.set(m.game_id, (counts.get(m.game_id) ?? 0) + 1);
        }
        const blood = games.find((g) => /blood on the clocktower/i.test(g.name));
        if (blood) counts.set(blood.id, (counts.get(blood.id) ?? 0) + (bloodRes.data?.length ?? 0));

        const ranked = games
          .filter((g) => !/^rpg$/i.test(g.name))
          .map((g) => ({ ...g, matchCount: counts.get(g.id) ?? 0 }))
          .sort((a, b) => b.matchCount - a.matchCount)
          .slice(0, 8);
        setPopularGames(ranked);

        const s = seasonsRes.data?.[0];
        if (s) {
          const end = new Date(s.end_date + "T23:59:59");
          const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
          const seasonId = s.id as string;
          setActiveSeason({ id: seasonId, name: s.name as string, end_date: s.end_date as string, daysLeft: days });

          const { data: ratings } = await supabase
            .from("mmr_ratings")
            .select("player_id,current_mmr,profile:profiles!mmr_ratings_player_id_fkey(name,full_name)")
            .eq("season_id", seasonId)
            .order("current_mmr", { ascending: false })
            .limit(4);
          if (!cancelled && ratings) {
            setTopPlayers(
              ratings.map((r: any) => ({
                name: r.profile?.full_name || r.profile?.name || "Jogador",
                mmr: Number(r.current_mmr ?? 0),
              })),
            );
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
