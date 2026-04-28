import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, Hash, Flame, Armchair, Swords } from "lucide-react";
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

const KpiCard = ({ icon: Icon, value, label, sub }: { icon: any; value: string | number; label: string; sub?: string }) => (
  <Card className="bg-card border-border">
    <CardContent className="pt-5 pb-5 text-center">
      <Icon className="h-7 w-7 mx-auto text-gold mb-1.5" />
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

// Animated donut showing win rate
const WinRateDonut = ({ wins, losses }: { wins: number; losses: number }) => {
  const total = wins + losses;
  const pct = total > 0 ? wins / total : 0;
  const size = 180;
  const stroke = 16;
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
        <span className="text-3xl font-bold text-gold leading-none">{Math.round(pct * 100)}%</span>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">Win rate</span>
      </div>
    </div>
  );
};

// Faction pills as a colorful tile grid with mini-donut
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
          <span className="text-[10px] font-bold">{winPct}%</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground">{wins}/{games} {games === 1 ? "partida" : "partidas"}</p>
      </div>
    </div>
  );
};

// Seat layout: round table with seats positioned around it
const SeatTable = ({ seats }: { seats: { seat: number; games: number; wins: number; winPct: number }[] }) => {
  if (seats.length === 0) return null;
  const max = Math.max(...seats.map((s) => s.seat));
  const tableSize = 220;
  const seatSize = 54;
  const radius = tableSize / 2 - 4;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: tableSize + seatSize, height: tableSize + seatSize }}>
        {/* Table */}
        <div
          className="absolute rounded-full border-2 border-gold/30 bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center"
          style={{ width: tableSize, height: tableSize, left: seatSize / 2, top: seatSize / 2 }}
        >
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Mesa</span>
        </div>
        {/* Seats */}
        {seats.map((s, i) => {
          const angle = (i / seats.length) * 2 * Math.PI - Math.PI / 2;
          const cx = (tableSize + seatSize) / 2 + radius * Math.cos(angle) - seatSize / 2;
          const cy = (tableSize + seatSize) / 2 + radius * Math.sin(angle) - seatSize / 2;
          const intensity = Math.min(1, s.winPct / 100);
          const bg = `hsl(45 80% ${20 + intensity * 35}%)`;
          return (
            <div
              key={s.seat}
              className="absolute rounded-full border border-gold/40 flex flex-col items-center justify-center text-center shadow-md"
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

    return { games, wins, losses, winPct, avgScore, bestScore, bestStreak, currentStreak, factions, seats, positions };
  }, [playerId, results, matches]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold">Estatísticas pessoais</h3>
        {availablePlayers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Jogador:</span>
            <Select value={playerId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Selecione..." />
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
          {/* Hero row: donut + KPI cards */}
          <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <Card className="bg-card border-border">
              <CardContent className="py-6 flex flex-col items-center gap-3">
                <WinRateDonut wins={stats.wins} losses={stats.losses} />
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" /> {stats.wins} vitórias</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-secondary" /> {stats.losses} derrotas</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon={Hash} value={stats.games} label="Partidas" />
              <KpiCard icon={TrendingUp} value={stats.avgScore} label="Pontuação média" sub={`Recorde: ${stats.bestScore}`} />
              <KpiCard icon={Flame} value={stats.bestStreak} label="Maior sequência" sub={stats.currentStreak > 0 ? `Atual: ${stats.currentStreak}` : "Atual: 0"} />
              <KpiCard icon={Trophy} value={stats.wins} label="Vitórias" sub={`${stats.winPct}% win rate`} />
            </div>
          </div>

          {/* Position distribution as colored bars */}
          <Card className="bg-card border-border">
            <CardContent className="py-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">Distribuição de posições</p>
                <p className="text-xs text-muted-foreground">Em quantas partidas terminou em cada lugar</p>
              </div>
              <div className="flex items-end gap-2 h-32">
                {stats.positions.map((p, i) => {
                  const max = Math.max(...stats.positions.map((x) => x.count), 1);
                  const h = (p.count / max) * 100;
                  const colors = ["hsl(var(--gold))", "hsl(217 91% 60%)", "hsl(25 95% 55%)", "hsl(var(--muted-foreground))"];
                  return (
                    <div key={p.label} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-xs font-bold">{p.count}</span>
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{ height: `${Math.max(h, 4)}%`, background: colors[i] }}
                      />
                      <span className="text-[11px] text-muted-foreground">{p.label}</span>
                      <span className="text-[10px] text-muted-foreground/70">{p.pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Factions + Seats grid */}
          {(stats.factions.length > 0 || stats.seats.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {stats.factions.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="py-4 space-y-3">
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
                  <CardContent className="py-4 space-y-3">
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
