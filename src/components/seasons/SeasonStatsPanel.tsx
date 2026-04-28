import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Clock, Target } from "lucide-react";
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

export const SeasonStatsPanel = ({ isBlood, matches, bloodMatches, rankings, bloodRankings, hasFactions = true }: Props) => {
  const [factionSort, setFactionSort] = useState<"games" | "winrate">("games");

  // Factions
  const factions: FactionStat[] = useMemo(() => {
    const counts: Record<string, number> = {};
    const wins: Record<string, number> = {};
    let total = 0;
    if (isBlood) {
      for (const m of bloodMatches) {
        for (const p of m.players) {
          const k = p.team === "evil" ? "Mal" : "Bem";
          counts[k] = (counts[k] || 0) + 1;
          if (p.team === m.winning_team) wins[k] = (wins[k] || 0) + 1;
          total++;
        }
      }
    } else {
      for (const m of matches) {
        for (const r of m.results) {
          const f = (r as any).faction;
          if (f) {
            counts[f] = (counts[f] || 0) + 1;
            if (r.position === 1) wins[f] = (wins[f] || 0) + 1;
            total++;
          }
        }
      }
    }
    if (total === 0) return [];
    const arr = Object.entries(counts).map(([name, count]) => ({
      name, count,
      wins: wins[name] || 0,
      pct: Math.round((count / total) * 100),
      winRate: count > 0 ? Math.round(((wins[name] || 0) / count) * 100) : 0,
      color: "",
    }));
    arr.sort((a, b) => factionSort === "winrate" ? b.winRate - a.winRate : b.count - a.count);
    return arr.slice(0, 5).map((f, i) => ({ ...f, color: FACTION_COLORS[i % FACTION_COLORS.length] }));
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

  // Streaks + longest match + max score
  const otherStats = useMemo(() => {
    if (isBlood) {
      let longest = { duration: 0, label: "—" };
      for (const m of bloodMatches) {
        if ((m.duration_minutes || 0) > longest.duration) {
          longest = { duration: m.duration_minutes || 0, label: m.script_name };
        }
      }
      return { winStreak: null, longest, maxScore: null };
    }
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
    for (const p of Object.values(perPlayer)) {
      let curW = 0, maxW = 0;
      for (const pos of p.results) {
        if (pos === 1) { curW++; maxW = Math.max(maxW, curW); }
        else { curW = 0; }
      }
      if (maxW > winStreak.count) winStreak = { name: p.name, count: maxW };
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
    return { winStreak, longest, maxScore };
  }, [isBlood, matches, bloodMatches]);

  // Position distribution (non-Blood only)
  const positionStats = useMemo(() => {
    if (isBlood) return null;
    const counts: Record<number, number> = {};
    let total = 0;
    let maxPos = 0;
    for (const m of matches) {
      for (const r of m.results) {
        if (typeof r.position === "number" && r.position > 0) {
          counts[r.position] = (counts[r.position] || 0) + 1;
          if (r.position > maxPos) maxPos = r.position;
          total++;
        }
      }
    }
    if (total === 0) return null;
    const POS_COLORS = ["hsl(142 71% 45%)", "hsl(0 72% 55%)", "hsl(38 92% 55%)", "hsl(217 91% 60%)", "hsl(280 70% 60%)", "hsl(180 60% 50%)", "hsl(20 80% 55%)", "hsl(320 70% 60%)"];
    const slices = Array.from({ length: maxPos }, (_, i) => {
      const pos = i + 1;
      const count = counts[pos] || 0;
      return {
        position: pos,
        count,
        pct: Math.round((count / total) * 100),
        color: POS_COLORS[i % POS_COLORS.length],
      };
    });
    return { slices, total };
  }, [isBlood, matches]);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Estatísticas da temporada</h3>

      {/* Factions — only shown when applicable */}
      {showFactions && (
        <Card className="bg-card border-border">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{isBlood ? "Estatística de Times" : "Estatística de Facções"}</p>
              <Select value={factionSort} onValueChange={(v) => setFactionSort(v as "games" | "winrate")}>
                <SelectTrigger className="h-7 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="games">Mais jogos</SelectItem>
                  <SelectItem value="winrate">Maior winrate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {factions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <div className="space-y-2">
                {factions.map((f) => (
                  <div key={f.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="truncate">{f.name}</span>
                      <span className="text-muted-foreground">
                        {factionSort === "winrate" ? `${f.winRate}% WR · ${f.count}j` : `${f.pct}% (${f.count})`}
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

      <div className="grid gap-3 grid-cols-1 items-stretch">
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

      {positionStats && (
        <Card className="bg-card border-border">
          <CardContent className="py-4 space-y-3">
            <div>
              <p className="text-sm font-semibold">Posição final na mesa</p>
              <p className="text-xs text-muted-foreground">Distribuição das colocações</p>
            </div>
            <div className="flex items-center gap-4">
              {(() => {
                const size = 120;
                const stroke = 22;
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
                          <circle
                            key={s.position}
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={stroke}
                            strokeDasharray={dasharray}
                            strokeDashoffset={dashoffset}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xl font-bold leading-none">{positionStats.total}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">partidas</p>
                    </div>
                  </div>
                );
              })()}
              <div className="flex-1 space-y-1.5 min-w-0">
                {positionStats.slices.map((s) => (
                  <div key={s.position} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-muted-foreground flex-shrink-0">{s.position}º lugar</span>
                    <span className="ml-auto font-semibold text-foreground">{s.pct}%</span>
                    <span className="text-muted-foreground">({s.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
