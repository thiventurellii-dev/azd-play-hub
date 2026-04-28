import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MatchRecord, BloodMatchRecord, RankingEntry, BloodRankingEntry } from "@/types/database";

interface Props {
  isBlood: boolean;
  matches: MatchRecord[];
  bloodMatches: BloodMatchRecord[];
  rankings: RankingEntry[];
  bloodRankings: BloodRankingEntry[];
  /** When false, hides the factions box entirely (e.g. selected boardgame has no factions). */
  hasFactions?: boolean;
}

interface FactionStat { name: string; count: number; wins: number; pct: number; winRate: number; color: string }

const FACTION_COLORS = ["bg-gold", "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-pink-500", "bg-orange-500"];

const PlayerLine = ({ rank, name, avatar_url, value, suffix = "" }: { rank: number; name: string; avatar_url?: string | null; value: number | string; suffix?: string }) => (
  <div className="flex items-center justify-between text-sm gap-2 min-w-0">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <span className="text-muted-foreground text-xs w-3 flex-shrink-0">{rank}</span>
      <Avatar className="h-5 w-5 flex-shrink-0">
        {avatar_url && <AvatarImage src={avatar_url} alt={name} />}
        <AvatarFallback className="text-[9px] bg-secondary">{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate min-w-0">{name}</span>
    </div>
    <span className="font-bold text-gold flex-shrink-0">{value}{suffix}</span>
  </div>
);

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const SeasonStatsPanel = ({ isBlood, matches, bloodMatches, rankings, bloodRankings, hasFactions = true }: Props) => {
  const [factionSort, setFactionSort] = useState<"games" | "winrate">("games");

  // Factions
  const factions: FactionStat[] = useMemo(() => {
    const counts: Record<string, number> = {};
    const wins: Record<string, number> = {};
    const totalMatches = isBlood ? bloodMatches.length : matches.length;
    if (isBlood) {
      for (const m of bloodMatches) {
        const seen = new Set<string>();
        for (const p of m.players) {
          const k = p.team === "evil" ? "Mal" : "Bem";
          if (seen.has(k)) continue;
          seen.add(k);
          counts[k] = (counts[k] || 0) + 1;
          if (p.team === m.winning_team) wins[k] = (wins[k] || 0) + 1;
        }
      }
    } else {
      for (const m of matches) {
        const seen = new Set<string>();
        for (const r of m.results) {
          const f = (r as any).faction;
          if (!f || seen.has(f)) continue;
          seen.add(f);
          counts[f] = (counts[f] || 0) + 1;
          if (m.results.some((rr) => (rr as any).faction === f && rr.position === 1)) {
            wins[f] = (wins[f] || 0) + 1;
          }
        }
      }
    }
    if (totalMatches === 0) return [];
    const arr = Object.entries(counts).map(([name, count]) => ({
      name, count,
      wins: wins[name] || 0,
      pct: Math.round((count / totalMatches) * 100),
      winRate: count > 0 ? Math.round(((wins[name] || 0) / count) * 100) : 0,
      color: "",
    }));
    arr.sort((a, b) => factionSort === "winrate" ? b.winRate - a.winRate : b.count - a.count);
    return arr.slice(0, 10).map((f, i) => ({ ...f, color: FACTION_COLORS[i % FACTION_COLORS.length] }));
  }, [isBlood, matches, bloodMatches, factionSort]);

  const showFactions = hasFactions && (isBlood || factions.length > 0);

  // Top winners (3)
  const topWinners = useMemo(() => {
    if (isBlood) {
      return [...bloodRankings]
        .sort((a, b) => (b.wins_evil + b.wins_good) - (a.wins_evil + a.wins_good))
        .slice(0, 3)
        .map((r) => ({ player_id: r.player_id, name: r.player_name, avatar_url: r.avatar_url, value: r.wins_evil + r.wins_good }));
    }
    return [...rankings]
      .sort((a, b) => b.wins - a.wins).slice(0, 3)
      .map((r) => ({ player_id: r.player_id, name: r.player_name, avatar_url: r.avatar_url, value: r.wins }));
  }, [isBlood, rankings, bloodRankings]);

  // Top win rate (3)
  const topWinRate = useMemo(() => {
    if (isBlood) {
      return [...bloodRankings]
        .filter((r) => r.games_played - r.games_as_storyteller >= 3)
        .map((r) => {
          const games = r.games_played - r.games_as_storyteller;
          const pct = games > 0 ? Math.round(((r.wins_evil + r.wins_good) / games) * 100) : 0;
          return { player_id: r.player_id, name: r.player_name, avatar_url: r.avatar_url, value: pct };
        })
        .sort((a, b) => b.value - a.value).slice(0, 3);
    }
    return [...rankings]
      .filter((r) => r.games_played >= 3)
      .map((r) => ({ player_id: r.player_id, name: r.player_name, avatar_url: r.avatar_url, value: Math.round((r.wins / r.games_played) * 100) }))
      .sort((a, b) => b.value - a.value).slice(0, 3);
  }, [isBlood, rankings, bloodRankings]);

  // Streaks + longest match + max/min winning score
  const otherStats = useMemo(() => {
    if (isBlood) {
      let longest = { duration: 0, label: "—" };
      for (const m of bloodMatches) {
        if ((m.duration_minutes || 0) > longest.duration) {
          longest = { duration: m.duration_minutes || 0, label: m.script_name };
        }
      }
      return { winStreak: null, longest, maxScore: null, minScore: null };
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
    let minScore: { value: number; name: string } | null = null;
    for (const m of matches) {
      const winner = m.results.find((r) => r.position === 1);
      if (winner) {
        if ((winner.score || 0) > maxScore.value) maxScore = { value: winner.score, name: winner.player_name };
        if (minScore === null || (winner.score || 0) < minScore.value) minScore = { value: winner.score || 0, name: winner.player_name };
      }
    }
    return { winStreak: null, longest, maxScore, minScore };
  }, [isBlood, matches, bloodMatches]);

  // Platform stats
  const platformStats = useMemo(() => {
    const counts: Record<string, number> = {};
    const source: { platform?: string | null }[] = isBlood ? bloodMatches as any[] : matches as any[];
    let total = 0;
    for (const m of source) {
      const p = (m as any).platform || "Não especificado";
      counts[p] = (counts[p] || 0) + 1;
      total++;
    }
    if (total === 0) return null;
    const PLAT_COLORS = ["bg-gold", "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-pink-500", "bg-orange-500"];
    const arr = Object.entries(counts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .map((p, i) => ({ ...p, color: PLAT_COLORS[i % PLAT_COLORS.length] }));
    return { items: arr, total };
  }, [isBlood, matches, bloodMatches]);

  // Win rate by seat position (non-Blood only)
  const positionStats = useMemo(() => {
    if (isBlood) return null;
    const wins: Record<number, number> = {};
    const totals: Record<number, number> = {};
    let maxSeat = 0;
    let totalWins = 0;
    for (const m of matches) {
      for (const r of m.results) {
        const seat = (r as any).seat_position;
        if (typeof seat !== "number" || seat <= 0) continue;
        totals[seat] = (totals[seat] || 0) + 1;
        if (seat > maxSeat) maxSeat = seat;
        if (r.position === 1) {
          wins[seat] = (wins[seat] || 0) + 1;
          totalWins++;
        }
      }
    }
    if (totalWins === 0 || maxSeat === 0) return null;
    const POS_COLORS = ["hsl(142 71% 45%)", "hsl(0 72% 55%)", "hsl(38 92% 55%)", "hsl(217 91% 60%)", "hsl(280 70% 60%)", "hsl(180 60% 50%)", "hsl(20 80% 55%)", "hsl(320 70% 60%)"];
    const slices = Array.from({ length: maxSeat }, (_, i) => {
      const seat = i + 1;
      const w = wins[seat] || 0;
      const t = totals[seat] || 0;
      return {
        position: seat,
        count: w,
        pct: totalWins > 0 ? Math.round((w / totalWins) * 100) : 0,
        winRate: t > 0 ? Math.round((w / t) * 100) : 0,
        played: t,
        color: POS_COLORS[i % POS_COLORS.length],
      };
    });
    return { slices, total: totalWins };
  }, [isBlood, matches]);

  // Duration histogram + average
  const durationStats = useMemo(() => {
    const source = isBlood
      ? bloodMatches.map((m) => m.duration_minutes || 0)
      : matches.map((m) => m.duration_minutes || 0);
    const valid = source.filter((d) => d > 0);
    if (valid.length === 0) return null;
    const buckets = [
      { label: "0–60", min: 0, max: 60 },
      { label: "60–90", min: 60, max: 90 },
      { label: "90–120", min: 90, max: 120 },
      { label: "120–150", min: 120, max: 150 },
      { label: "150+", min: 150, max: Infinity },
    ];
    const counts = buckets.map((b) => valid.filter((d) => d >= b.min && d < b.max).length);
    const max = Math.max(...counts, 1);
    const avg = Math.round(valid.reduce((s, d) => s + d, 0) / valid.length);
    const variance = valid.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / valid.length;
    const std = Math.round(Math.sqrt(variance));
    return {
      buckets: buckets.map((b, i) => ({ label: b.label, count: counts[i], pct: Math.round((counts[i] / valid.length) * 100), height: (counts[i] / max) * 100 })),
      avg,
      std,
    };
  }, [isBlood, matches, bloodMatches]);

  // Heatmap day-of-week × hour-bucket
  const heatmap = useMemo(() => {
    const dates = isBlood ? bloodMatches.map((m) => m.played_at) : matches.map((m) => m.played_at);
    if (dates.length === 0) return null;
    // 4 hour buckets: 0h, 6h, 12h, 18h
    const grid: number[][] = Array.from({ length: 4 }, () => Array(7).fill(0));
    let max = 0;
    for (const iso of dates) {
      const d = new Date(iso);
      const day = d.getDay(); // 0..6 (Sun..Sat)
      const h = d.getHours();
      const row = Math.floor(h / 6); // 0..3
      grid[row][day] += 1;
      if (grid[row][day] > max) max = grid[row][day];
    }
    return { grid, max };
  }, [isBlood, matches, bloodMatches]);

  const longestLabel = otherStats.longest.duration > 0
    ? `${Math.floor(otherStats.longest.duration / 60)}h ${otherStats.longest.duration % 60}m`
    : "—";

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Estatísticas da temporada</h3>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* LEFT: 3 columns of stacked rows */}
        <div className="space-y-4 lg:col-span-3">
          {/* Row 1: Mais vitórias | Pontuação vencedora (max+min) | Maior win rate */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-card border-border">
              <CardContent className="py-4 flex flex-col gap-2 h-full">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mais vitórias</p>
                <div className="flex-1 flex flex-col gap-2 justify-start">
                  {topWinners.length === 0 ? (
                    <p className="text-xs text-muted-foreground">—</p>
                  ) : (
                    topWinners.map((w, i) => (
                      <PlayerLine key={w.player_id || i} rank={i + 1} name={w.name} avatar_url={w.avatar_url} value={w.value} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {otherStats.maxScore ? (
              <Card className="bg-card border-border">
                <CardContent className="py-4 flex flex-col gap-3 h-full">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pontuação vencedora</p>
                  <div className="flex-1 grid grid-cols-2 gap-2 items-center">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Maior</p>
                      <p className="text-2xl font-bold text-gold leading-none">{otherStats.maxScore.value}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-1">{otherStats.maxScore.name}</p>
                    </div>
                    <div className="text-center border-l border-border">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Menor</p>
                      <p className="text-2xl font-bold leading-none">{otherStats.minScore?.value ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-1">{otherStats.minScore?.name ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="bg-card border-border">
              <CardContent className="py-4 flex flex-col gap-2 h-full">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maior win rate</p>
                <div className="flex-1 flex flex-col gap-2 justify-start">
                  {topWinRate.length === 0 ? (
                    <p className="text-xs text-muted-foreground">—</p>
                  ) : (
                    topWinRate.map((w, i) => (
                      <PlayerLine key={w.player_id || i} rank={i + 1} name={w.name} avatar_url={w.avatar_url} value={w.value} suffix="%" />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Plataforma + Posição na mesa */}
          <div className="grid gap-4 md:grid-cols-2">
            {platformStats && (
              <Card className="bg-card border-border">
                <CardContent className="py-4 space-y-3 h-full">
                  <div>
                    <p className="text-sm font-semibold">Local / Plataforma</p>
                    <p className="text-xs text-muted-foreground">Onde as partidas aconteceram</p>
                  </div>
                  <div className="space-y-2">
                    {platformStats.items.map((p) => (
                      <div key={p.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="truncate">{p.name}</span>
                          <span className="text-muted-foreground">{p.pct}% ({p.count})</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {positionStats && (
              <Card className="bg-card border-border">
                <CardContent className="py-4 space-y-3 h-full">
                  <div>
                    <p className="text-sm font-semibold">Vitórias por posição na mesa</p>
                    <p className="text-xs text-muted-foreground">Em qual assento mais se ganha</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {(() => {
                      const size = 110;
                      const stroke = 20;
                      const r = (size - stroke) / 2;
                      const c = 2 * Math.PI * r;
                      let offset = 0;
                      return (
                        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
                          <svg width={size} height={size} className="-rotate-90">
                            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
                            {positionStats.slices.map((s) => {
                              if (s.count === 0) return null;
                              const len = (s.count / positionStats.total) * c;
                              const dasharray = `${len} ${c - len}`;
                              const dashoffset = -offset;
                              offset += len;
                              return (
                                <circle key={s.position} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={dasharray} strokeDashoffset={dashoffset} />
                              );
                            })}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-lg font-bold leading-none">{positionStats.total}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">vitórias</p>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex-1 space-y-1 min-w-0">
                      {positionStats.slices.map((s) => (
                        <div key={s.position} className="flex items-center gap-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                          <span className="text-muted-foreground flex-shrink-0">{s.position}ª</span>
                          <span className="ml-auto font-semibold text-foreground">{s.pct}%</span>
                          <span className="text-muted-foreground">({s.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Row 3: Duração + Heatmap */}
          <div className="grid gap-4 lg:grid-cols-2">
            {durationStats && (
              <Card className="bg-card border-border">
                <CardContent className="py-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Duração das partidas</p>
                    <p className="text-xs text-muted-foreground">Tempo total das partidas</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-secondary/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Média</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl font-bold leading-none">{durationStats.avg} min</span>
                        <span className="text-[10px] text-muted-foreground">± {durationStats.std}</span>
                      </div>
                    </div>
                    <div className="rounded-md bg-secondary/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Mais longa</p>
                      <div className="mt-0.5">
                        <span className="text-xl font-bold leading-none">{longestLabel}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{otherStats.longest.label}</p>
                    </div>
                  </div>
                  <div className="flex items-end justify-around gap-2 h-32 mt-2 pb-5 relative">
                    {durationStats.buckets.map((b) => (
                      <div key={b.label} className="flex-1 flex flex-col items-center justify-end h-full relative">
                        <span className="text-[10px] text-muted-foreground mb-1">{b.pct}%</span>
                        <div
                          className="w-[60%] bg-gold rounded-t-sm transition-all min-h-[2px]"
                          style={{ height: `${b.height}%` }}
                        />
                        <span className="absolute -bottom-5 text-[10px] text-muted-foreground">{b.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {heatmap && (
              <Card className="bg-card border-border">
                <CardContent className="py-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Mapa de calor</p>
                    <p className="text-xs text-muted-foreground">Dias da semana e horários mais jogados</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-col justify-around text-[10px] text-muted-foreground py-4 w-6">
                      {["0h", "6h", "12h", "18h"].map((h) => <span key={h}>{h}</span>)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
                        {DAY_LABELS.map((d) => <span key={d}>{d}</span>)}
                      </div>
                      <div className="grid grid-rows-4 gap-1">
                        {heatmap.grid.map((row, ri) => (
                          <div key={ri} className="grid grid-cols-7 gap-1">
                            {row.map((count, ci) => {
                              const intensity = heatmap.max > 0 ? count / heatmap.max : 0;
                              return (
                                <div key={ci} className="h-6 rounded-sm border border-border/40"
                                  style={{ backgroundColor: count === 0 ? "hsl(var(--secondary) / 0.3)" : `hsl(38 100% 50% / ${0.15 + intensity * 0.85})` }}
                                  title={`${DAY_LABELS[ci]} ${ri * 6}h–${(ri + 1) * 6}h: ${count} partidas`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* RIGHT: Faction stats — full height sidebar */}
        {showFactions && (
          <Card className="bg-card border-border lg:col-span-1 h-full">
            <CardContent className="py-4 space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{isBlood ? "Estatística de Times" : "Estatística de Facções"}</p>
              </div>
              <Select value={factionSort} onValueChange={(v) => setFactionSort(v as "games" | "winrate")}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="games">Mais jogos</SelectItem>
                  <SelectItem value="winrate">Maior winrate</SelectItem>
                </SelectContent>
              </Select>
              {factions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
              ) : (
                <div className="space-y-3 flex-1">
                  {factions.map((f) => (
                    <div key={f.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="truncate">{f.name}</span>
                        <span className="text-muted-foreground">
                          {factionSort === "winrate" ? `${f.winRate}% (${f.count})` : `${f.pct}% (${f.count})`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full ${f.color}`} style={{ width: `${factionSort === "winrate" ? f.winRate : f.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
