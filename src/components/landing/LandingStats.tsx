import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCountUp, useInView } from "@/hooks/useCountUp";

interface Counts {
  players: number;
  matches: number;
  seasons: number;
  games: number;
}

const StatItem = ({ value, label, inView, delay = 0 }: { value: number; label: string; inView: boolean; delay?: number }) => {
  const animated = useCountUp(value, 1400 + delay, inView);
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gold leading-none tabular-nums">
        {animated.toLocaleString("pt-BR")}
      </span>
      <span className="text-[0.7rem] sm:text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
};

export const LandingStats = () => {
  const [counts, setCounts] = useState<Counts>({ players: 0, matches: 0, seasons: 0, games: 0 });
  const { ref, inView } = useInView<HTMLDivElement>(0.25);

  useEffect(() => {
    (async () => {
      const [p, m, b, s, g] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("matches").select("id", { count: "exact", head: true }),
        supabase.from("blood_matches").select("id", { count: "exact", head: true }),
        supabase.from("seasons").select("id", { count: "exact", head: true }),
        supabase.from("games").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        players: p.count ?? 0,
        matches: (m.count ?? 0) + (b.count ?? 0),
        seasons: s.count ?? 0,
        games: g.count ?? 0,
      });
    })();
  }, []);

  return (
    <section id="stats" ref={ref} className="border-y border-border bg-surface py-12 md:py-16">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatItem value={counts.players} label="Jogadores ativos" inView={inView} />
          <StatItem value={counts.matches} label="Partidas registradas" inView={inView} delay={100} />
          <StatItem value={counts.seasons} label="Seasons realizadas" inView={inView} delay={200} />
          <StatItem value={counts.games} label="Jogos no catálogo" inView={inView} delay={300} />
        </div>
      </div>
    </section>
  );
};
