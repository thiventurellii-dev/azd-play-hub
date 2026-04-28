import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, Hash, Flame, Armchair, Swords, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MatchLite { id: string; played_at: string; }
interface ResultLite {
  match_id: string;
  player_id: string;
  position: number;
  score: number | null;
  faction?: string | null;
  seat_position?: number | null;
}

interface Props {
  matches: MatchLite[];
  results: ResultLite[];
  playerMap: Record<string, string>;
  avatarMap: Record<string, string | null>;
}

// ============== sub-components ==============

const StatCard = ({
  icon: Icon,
  iconNode,
  value,
  label,
  sub,
  highlight = false,
}: {
  icon?: any;
  iconNode?: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  highlight?: boolean;
}) => (
  <Card className={`bg-card border-border ${highlight ? "ring-1 ring-gold/30" : ""}`}>
    <CardContent className="py-5 flex flex-col items-center justify-center text-center gap-1.5 h-full">
      {iconNode ? iconNode : Icon && <Icon className="h-6 w-6 text-gold" />}
      <p className="text-3xl font-bold leading-none tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground/80">{sub}</p>}
    </CardContent>
  </Card>
);

// Animated donut showing win rate
const WinRateDonut = ({ wins, losses }: { wins: number; losses: number }) => {
  const total = wins + losses;
  const pct = total > 0 ? wins / total : 0;
  const size = 120;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--secondary))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--gold))"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gold leading-none">{Math.round(pct * 100)}%</span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">Win rate</span>
      </div>
    </div>
  );
};

// Faction tile with mini-donut
const FactionTile = ({ name, games, wins, winPct, color }: { name: string; games: number; wins: number; winPct: number; color: string }) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = c * (winPct / 100);
  const size = 44;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20 hover:border-gold/30 transition-colors">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={4} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={4}
            fill="none"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold tabular-nums">{winPct}%</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">{wins}/{games} {games === 1 ? "partida" : "partidas"}</p>
      </div>
    </div>
  );
};

// Round table with seats around it
const SeatTable = ({ seats }: { seats: { seat: number; games: number; wins: number; winPct: number }[] }) => {
  if (seats.length === 0) return null;
  const max = Math.max(...seats.map((s) => s.seat));
  const tableSize = 200;
  const seatSize = 54;
  const radius = tableSize / 2 - 4;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: tableSize + seatSize, height: tableSize + seatSize }}>
        <div
          className="absolute rounded-full border-2 border-gold/30 bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center"
          style={{ width: tableSize, height: tableSize, left: seatSize / 2, top: seatSize / 2 }}
        >
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Mesa</span>
        </div>
        {seats.map((s, i) => {
          const angle = (i / seats.length) * 2 * Math.PI - Math.PI / 2;
          const cx = (tableSize + seatSize) / 2 + radius * Math.cos(angle) - seatSize / 2;
          const cy = (tableSize + seatSize) / 2 + radius * Math.sin(angle) - seatSize / 2;
          const intensity = Math.min(1, s.winPct / 100);
          const bg = `hsl(45 80% ${20 + intensity * 35}%)`;
          return (
            <div
              key={s.seat}
              className="absolute rounded-full border border-gold/40 flex flex-col items-center justify-center text-center shadow-md tabular-nums"
              style={{ width: seatSize, height: seatSize, left: cx, top: cy, background: bg }}
              title={`Assento ${s.seat}: ${s.wins}/${s.games} (${s.winPct}%)`}
            >
              <span className="text-[10px] text-foreground/80 leading-none">P{s.seat}</span>
              <span className="text-sm font-bold text-foreground leading-none mt-0.5">{s.winPct}%</span>
              <span className="text-[9px] text-foreground/70 leading-none mt-0.5">{s.games}p</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">{max} {max === 1 ? "assento" : "assentos"} • cor mais forte = win rate maior</p>
    </div>
  );
};

const FACTION_COLORS = [
  "hsl(var(--gold))",
  "hsl(217 91% 60%)",
  "hsl(271 81% 65%)",
  "hsl(160 64% 45%)",
  "hsl(330 81% 60%)",
  "hsl(25 95% 55%)",
  "hsl(190 90% 50%)",
  "hsl(0 84% 60%)",
];

// ============== main panel ==============

export const GamePersonalStatsPanel = ({ matches, results, playerMap, avatarMap }: Props) => {
  const { user } = useAuth();

  const availablePlayers = useMemo(() => {
    const seen = new Set<string>();
    for (const r of results) if (r.player_id) seen.add(r.player_id);
    return [...seen]
      .map((id) => ({ id, name: playerMap[id] || "?", avatar_url: avatarMap[id] || null }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [results, playerMap, avatarMap]);

  const defaultId = useMemo(() => {
    if (user && availablePlayers.some((p) => p.id === user.id)) return user.id;
    return availablePlayers[0]?.id || "";
  }, [user, availablePlayers]);

  const [selectedId, setSelectedId] = useState<string>("");
  const playerId = selectedId || defaultId;

  const stats = useMemo(() => {
    if (!playerId) return null;
    const myResults = results.filter((r) => r.player_id === playerId);
    if (myResults.length === 0) return null;

    const games = myResults.length;
    const wins = myResults.filter((r) => r.position === 1).length;
    const losses = games - wins;
    const winPct = games > 0 ? Math.round((wins / games) * 100) : 0;
    const scores = myResults.map((r) => r.score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

    const sortedMatches = [...matches].sort((a, b) => a.played_at.localeCompare(b.played_at));
    const myByMatch: Record<string, ResultLite> = {};
    for (const r of myResults) myByMatch[r.match_id] = r;
    let bestStreak = 0;
    let tempStreak = 0;
    for (const m of sortedMatches) {
      const r = myByMatch[m.id];
      if (!r) continue;
      if (r.position === 1) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    let currentStreak = 0;
    for (let i = sortedMatches.length - 1; i >= 0; i--) {
      const r = myByMatch[sortedMatches[i].id];
      if (!r) continue;
      if (r.position === 1) currentStreak++;
      else break;
    }

    const facStats: Record<string, { games: number; wins: number }> = {};
    for (const r of myResults) {
      if (!r.faction) continue;
      if (!facStats[r.faction]) facStats[r.faction] = { games: 0, wins: 0 };
      facStats[r.faction].games++;
      if (r.position === 1) facStats[r.faction].wins++;
    }
    const factions = Object.entries(facStats)
      .map(([name, s], i) => ({
        name,
        games: s.games,
        wins: s.wins,
        winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
        color: FACTION_COLORS[i % FACTION_COLORS.length],
      }))
      .sort((a, b) => b.games - a.games);

    const seatStats: Record<number, { games: number; wins: number }> = {};
    for (const r of myResults) {
      const s = r.seat_position;
      if (typeof s !== "number" || s <= 0) continue;
      if (!seatStats[s]) seatStats[s] = { games: 0, wins: 0 };
      seatStats[s].games++;
      if (r.position === 1) seatStats[s].wins++;
    }
    const seats = Object.entries(seatStats)
      .map(([seat, s]) => ({ seat: parseInt(seat), games: s.games, wins: s.wins, winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
      .sort((a, b) => a.seat - b.seat);

    // Position distribution (1st, 2nd, 3rd, 4th+)
    const posBuckets: Record<string, number> = { "1º": 0, "2º": 0, "3º": 0, "4º+": 0 };
    for (const r of myResults) {
      if (r.position === 1) posBuckets["1º"]++;
      else if (r.position === 2) posBuckets["2º"]++;
      else if (r.position === 3) posBuckets["3º"]++;
      else posBuckets["4º+"]++;
    }
    const positions = Object.entries(posBuckets).map(([label, count]) => ({
      label,
      count,
      pct: games > 0 ? Math.round((count / games) * 100) : 0,
    }));

    // Top opponents (most-played-with players, excluding self)
    const oppCount: Record<string, { games: number; wins: number; losses: number }> = {};
    const myMatchIds = new Set(myResults.map((r) => r.match_id));
    for (const r of results) {
      if (!myMatchIds.has(r.match_id)) continue;
      if (r.player_id === playerId) continue;
      if (!oppCount[r.player_id]) oppCount[r.player_id] = { games: 0, wins: 0, losses: 0 };
      oppCount[r.player_id].games++;
      // I beat them if my position < their position in same match
      const myRow = myResults.find((mr) => mr.match_id === r.match_id);
      if (myRow && myRow.position < r.position) oppCount[r.player_id].wins++;
      else if (myRow && myRow.position > r.position) oppCount[r.player_id].losses++;
    }
    const topOpponents = Object.entries(oppCount)
      .map(([pid, s]) => ({
        id: pid,
        name: playerMap[pid] || "?",
        avatar_url: avatarMap[pid] || null,
        ...s,
        winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 8);

    return { games, wins, losses, winPct, avgScore, bestScore, bestStreak, currentStreak, factions, seats, positions, topOpponents };
  }, [playerId, results, matches, playerMap, avatarMap]);

  // Selected player display data
  const selectedPlayer = availablePlayers.find((p) => p.id === playerId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold">Estatísticas pessoais</h3>
        {availablePlayers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Jogador:</span>
            <Select value={playerId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Selecione...">
                  {selectedPlayer && (
                    <span className="inline-flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        {selectedPlayer.avatar_url && <AvatarImage src={selectedPlayer.avatar_url} alt={selectedPlayer.name} />}
                        <AvatarFallback className="text-[9px] bg-secondary">{selectedPlayer.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {selectedPlayer.name}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availablePlayers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.name} />}
                        <AvatarFallback className="text-[9px] bg-secondary">{p.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!playerId ? (
        <Card className="bg-card border-border">
          <CardContent className="py-10 text-center text-muted-foreground">Sem jogadores neste jogo ainda.</CardContent>
        </Card>
      ) : !stats ? (
        <Card className="bg-card border-border">
          <CardContent className="py-10 text-center text-muted-foreground">
            Este jogador ainda não jogou este jogo.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* HERO ROW: 5 KPIs in a single line, donut as the "big" card */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {/* Donut card */}
            <Card className="bg-card border-border ring-1 ring-gold/30">
              <CardContent className="py-5 flex flex-col items-center justify-center gap-2 h-full">
                <WinRateDonut wins={stats.wins} losses={stats.losses} />
                <div className="flex gap-3 text-[11px]">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-gold" /> {stats.wins} vit</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> {stats.losses} der</span>
                </div>
              </CardContent>
            </Card>
            <StatCard icon={Hash} value={stats.games} label="Partidas" />
            <StatCard icon={TrendingUp} value={stats.avgScore} label="Pontuação média" sub={`Recorde: ${stats.bestScore}`} />
            <StatCard icon={Flame} value={stats.bestStreak} label="Maior sequência" sub={`Atual: ${stats.currentStreak}`} />
            <StatCard icon={Trophy} value={stats.wins} label="Vitórias" sub={`${stats.winPct}% win rate`} />
          </div>

          {/* Position distribution as elegant horizontal bars */}
          <Card className="bg-card border-border">
            <CardContent className="py-5 space-y-4">
              <div>
                <p className="text-sm font-semibold">Distribuição de posições</p>
                <p className="text-xs text-muted-foreground">Em quantas partidas terminou em cada lugar</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {stats.positions.map((p, i) => {
                  const colors = ["hsl(var(--gold))", "hsl(217 91% 60%)", "hsl(25 95% 55%)", "hsl(var(--muted-foreground))"];
                  return (
                    <div key={p.label} className="rounded-lg border border-border bg-secondary/20 p-3 flex flex-col items-center text-center gap-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold tabular-nums">{p.count}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">/ {stats.games}</span>
                      </div>
                      <p className="text-xs font-semibold" style={{ color: colors[i] }}>{p.label}</p>
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, background: colors[i] }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{p.pct}%</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top opponents — players you faced the most */}
          {stats.topOpponents.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gold" />
                  <div>
                    <p className="text-sm font-semibold">Jogadores Principais</p>
                    <p className="text-xs text-muted-foreground">Com quem mais jogou este jogo</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const max = Math.max(...stats.topOpponents.map((o) => o.games), 1);
                    return stats.topOpponents.map((o) => {
                      const pct = (o.games / max) * 100;
                      return (
                        <div key={o.id} className="flex items-center gap-3 text-sm">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            {o.avatar_url && <AvatarImage src={o.avatar_url} alt={o.name} />}
                            <AvatarFallback className="text-[10px] bg-secondary">{o.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium truncate">{o.name}</span>
                              <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                                <span className="font-semibold text-foreground">{o.games}</span> partidas · {o.wins}V · {o.losses}D · <span className="text-gold font-semibold">{o.winPct}%</span>
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-gold/80 to-gold transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Factions + Seats */}
          {(stats.factions.length > 0 || stats.seats.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {stats.factions.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="py-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Swords className="h-4 w-4 text-gold" />
                      <div>
                        <p className="text-sm font-semibold">Facções jogadas</p>
                        <p className="text-xs text-muted-foreground">Win rate por facção</p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {stats.factions.map((f) => (
                        <FactionTile key={f.name} {...f} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {stats.seats.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="py-5 space-y-3 h-full">
                    <div className="flex items-center gap-2">
                      <Armchair className="h-4 w-4 text-gold" />
                      <div>
                        <p className="text-sm font-semibold">Posição na mesa</p>
                        <p className="text-xs text-muted-foreground">Win rate por assento</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center py-2">
                      <SeatTable seats={stats.seats} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GamePersonalStatsPanel;
