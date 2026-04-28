import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, Target, Hash, Flame, Award } from "lucide-react";
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

export const GamePersonalStatsPanel = ({ matches, results, playerMap, avatarMap }: Props) => {
  const { user } = useAuth();

  // Build list of players that have at least one result
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
    const winPct = games > 0 ? Math.round((wins / games) * 100) : 0;
    const scores = myResults.map((r) => r.score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

    // Streaks (chronological order)
    const sortedMatches = [...matches].sort((a, b) => a.played_at.localeCompare(b.played_at));
    const myByMatch: Record<string, ResultLite> = {};
    for (const r of myResults) myByMatch[r.match_id] = r;
    let bestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    let lastWon = false;
    for (const m of sortedMatches) {
      const r = myByMatch[m.id];
      if (!r) continue;
      if (r.position === 1) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
        lastWon = true;
      } else {
        tempStreak = 0;
        lastWon = false;
      }
    }
    // recompute current streak from end
    currentStreak = 0;
    for (let i = sortedMatches.length - 1; i >= 0; i--) {
      const r = myByMatch[sortedMatches[i].id];
      if (!r) continue;
      if (r.position === 1) currentStreak++;
      else break;
    }

    // Faction prefs
    const facStats: Record<string, { games: number; wins: number }> = {};
    for (const r of myResults) {
      if (!r.faction) continue;
      if (!facStats[r.faction]) facStats[r.faction] = { games: 0, wins: 0 };
      facStats[r.faction].games++;
      if (r.position === 1) facStats[r.faction].wins++;
    }
    const factions = Object.entries(facStats)
      .map(([name, s]) => ({ name, games: s.games, wins: s.wins, winPct: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 8);

    // Seat prefs
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

    return { games, wins, winPct, avgScore, bestScore, bestStreak, currentStreak, factions, seats, lastWon };
  }, [playerId, results, matches]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold">Estatísticas pessoais</h3>
        {availablePlayers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Jogador:</span>
            <Select value={playerId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[200px] h-9">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Hash} value={stats.games} label="Partidas" />
            <KpiCard icon={Trophy} value={`${stats.winPct}%`} label="Win rate" sub={`${stats.wins}/${stats.games} vitórias`} />
            <KpiCard icon={TrendingUp} value={stats.avgScore} label="Pontuação média" sub={`Recorde: ${stats.bestScore}`} />
            <KpiCard icon={Flame} value={stats.bestStreak} label="Maior sequência" sub={stats.currentStreak > 0 ? `Atual: ${stats.currentStreak}` : undefined} />
          </div>

          {(stats.factions.length > 0 || stats.seats.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {stats.factions.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="py-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold">Facções jogadas</p>
                      <p className="text-xs text-muted-foreground">Win rate por facção</p>
                    </div>
                    <div className="space-y-2">
                      {stats.factions.map((f) => (
                        <div key={f.name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="truncate">{f.name}</span>
                            <span className="text-muted-foreground">
                              {f.games} {f.games === 1 ? "partida" : "partidas"} •{" "}
                              <span className="text-gold font-medium">{f.winPct}%</span>
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-gold" style={{ width: `${f.winPct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {stats.seats.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="py-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold">Posição na mesa</p>
                      <p className="text-xs text-muted-foreground">Win rate por assento</p>
                    </div>
                    <div className="space-y-2">
                      {stats.seats.map((s) => (
                        <div key={s.seat}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>Assento {s.seat}</span>
                            <span className="text-muted-foreground">
                              {s.games} {s.games === 1 ? "partida" : "partidas"} •{" "}
                              <span className="text-gold font-medium">{s.winPct}%</span>
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-gold" style={{ width: `${s.winPct}%` }} />
                          </div>
                        </div>
                      ))}
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
