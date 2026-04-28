import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown, Clock, Target } from "lucide-react";
import type { MatchRecord, BloodMatchRecord, RankingEntry, BloodRankingEntry } from "@/types/database";

interface Props {
  isBlood: boolean;
  matches: MatchRecord[];
  bloodMatches: BloodMatchRecord[];
  rankings: RankingEntry[];
  bloodRankings: BloodRankingEntry[];
}

interface FactionStat { name: string; count: number; pct: number; color: string }

const FACTION_COLORS = ["bg-gold", "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-pink-500", "bg-orange-500"];

export const SeasonStatsPanel = ({ isBlood, matches, bloodMatches, rankings, bloodRankings }: Props) => {
  // Factions
  const factions: FactionStat[] = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    if (isBlood) {
      for (const m of bloodMatches) {
        for (const p of m.players) {
          const k = p.team === "evil" ? "Mal" : "Bem";
          counts[k] = (counts[k] || 0) + 1;
          total++;
        }
      }
    } else {
      for (const m of matches) {
        for (const r of m.results) {
          const f = (r as any).faction;
          if (f) {
            counts[f] = (counts[f] || 0) + 1;
            total++;
          }
        }
      }
    }
    if (total === 0) return [];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], i) => ({
        name, count,
        pct: Math.round((count / total) * 100),
        color: FACTION_COLORS[i % FACTION_COLORS.length],
      }));
  }, [isBlood, matches, bloodMatches]);

  // Top winners (3)
  const topWinners = useMemo(() => {
    if (isBlood) {
      return [...bloodRankings]
        .sort((a, b) => (b.wins_evil + b.wins_good) - (a.wins_evil + a.wins_good))
        .slice(0, 3)
        .map((r) => ({ name: r.player_name, value: r.wins_evil + r.wins_good }));
    }
    return [...rankings].sort((a, b) => b.wins - a.wins).slice(0, 3).map((r) => ({ name: r.player_name, value: r.wins }));
  }, [isBlood, rankings, bloodRankings]);

  // Top win rate (3)
  const topWinRate = useMemo(() => {
    if (isBlood) {
      return [...bloodRankings]
        .filter((r) => r.games_played - r.games_as_storyteller >= 3)
        .map((r) => {
          const games = r.games_played - r.games_as_storyteller;
          const pct = games > 0 ? Math.round(((r.wins_evil + r.wins_good) / games) * 100) : 0;
          return { name: r.player_name, value: pct };
        })
        .sort((a, b) => b.value - a.value).slice(0, 3);
    }
    return [...rankings]
      .filter((r) => r.games_played >= 3)
      .map((r) => ({ name: r.player_name, value: Math.round((r.wins / r.games_played) * 100) }))
      .sort((a, b) => b.value - a.value).slice(0, 3);
  }, [isBlood, rankings, bloodRankings]);

  // Streaks + longest match + max score (boardgame only - blood doesn't have positions)
  const otherStats = useMemo(() => {
    if (isBlood) {
      // Longest match
      let longest = { duration: 0, label: "—" };
      for (const m of bloodMatches) {
        if ((m.duration_minutes || 0) > longest.duration) {
          longest = { duration: m.duration_minutes || 0, label: m.script_name };
        }
      }
      return { winStreak: null, lossStreak: null, longest, maxScore: null };
    }

    // Per-player chronological positions
    const sorted = [...matches].sort((a, b) => a.played_at.localeCompare(b.played_at));
    const perPlayer: Record<string, { name: string; results: number[] }> = {};
    for (const m of sorted) {
      for (const r of m.results) {
        if (!r.player_id) continue;
        if (!perPlayer[r.player_id]) perPlayer[r.player_id] = { name: r.player_name, results: [] };
        perPlayer[r.player_id].results.push(r.position);
      }
    }
    let winStreak = { name: "—", count: 0 };
    let lossStreak = { name: "—", count: 0 };
    for (const p of Object.values(perPlayer)) {
      let curW = 0, maxW = 0, curL = 0, maxL = 0;
      for (const pos of p.results) {
        if (pos === 1) { curW++; curL = 0; maxW = Math.max(maxW, curW); }
        else { curL++; curW = 0; maxL = Math.max(maxL, curL); }
      }
      if (maxW > winStreak.count) winStreak = { name: p.name, count: maxW };
      if (maxL > lossStreak.count) lossStreak = { name: p.name, count: maxL };
    }

    let longest = { duration: 0, label: "—" };
    for (const m of matches) {
      if ((m.duration_minutes || 0) > longest.duration) {
        const top1 = m.results.find((r) => r.position === 1)?.player_name || "?";
        const top2 = m.results.find((r) => r.position === 2)?.player_name || "?";
        longest = { duration: m.duration_minutes || 0, label: `${top1} vs ${top2}` };
      }
    }

    let maxScore = { value: 0, name: "—" };
    for (const m of matches) {
      for (const r of m.results) {
        if ((r.score || 0) > maxScore.value) maxScore = { value: r.score, name: r.player_name };
      }
    }

    return { winStreak, lossStreak, longest, maxScore };
  }, [isBlood, matches, bloodMatches]);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Estatísticas da temporada</h3>

      {/* Factions */}
      <Card className="bg-card border-border">
        <CardContent className="py-4 space-y-3">
          <p className="text-sm font-semibold">{isBlood ? "Times mais jogados" : "Facções mais jogadas"}</p>
          {factions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <div className="space-y-2">
              {factions.map((f) => (
                <div key={f.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="truncate">{f.name}</span>
                    <span className="text-muted-foreground">{f.pct}% ({f.count})</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full ${f.color}`} style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="bg-card border-border">
          <CardContent className="py-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mais vitórias</p>
            {topWinners.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              topWinners.map((w, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate"><span className="text-muted-foreground">{i + 1}</span> {w.name}</span>
                  <span className="font-bold text-gold">{w.value}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="py-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maior win rate</p>
            {topWinRate.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              topWinRate.map((w, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate"><span className="text-muted-foreground">{i + 1}</span> {w.name}</span>
                  <span className="font-bold text-gold">{w.value}%</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Outras estatísticas</p>
        <div className="grid grid-cols-2 gap-2">
          {otherStats.winStreak && (
            <Card className="bg-card border-border">
              <CardContent className="py-3 text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3 w-3" /> Maior seq. vitórias
                </div>
                <p className="text-xl font-bold text-gold">{otherStats.winStreak.count}</p>
                <p className="text-[11px] text-muted-foreground truncate">{otherStats.winStreak.name}</p>
              </CardContent>
            </Card>
          )}
          {otherStats.lossStreak && (
            <Card className="bg-card border-border">
              <CardContent className="py-3 text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <TrendingDown className="h-3 w-3" /> Maior seq. derrotas
                </div>
                <p className="text-xl font-bold text-destructive">{otherStats.lossStreak.count}</p>
                <p className="text-[11px] text-muted-foreground truncate">{otherStats.lossStreak.name}</p>
              </CardContent>
            </Card>
          )}
          <Card className="bg-card border-border">
            <CardContent className="py-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" /> Partida mais longa
              </div>
              <p className="text-xl font-bold">
                {otherStats.longest.duration > 0
                  ? `${Math.floor(otherStats.longest.duration / 60)}h ${otherStats.longest.duration % 60}m`
                  : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{otherStats.longest.label}</p>
            </CardContent>
          </Card>
          {otherStats.maxScore && (
            <Card className="bg-card border-border">
              <CardContent className="py-3 text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Target className="h-3 w-3" /> Maior pontuação
                </div>
                <p className="text-xl font-bold text-gold">{otherStats.maxScore.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{otherStats.maxScore.name}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
