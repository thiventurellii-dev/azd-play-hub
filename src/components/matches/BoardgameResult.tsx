import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  resultId: string;
}

interface ResultRow {
  player_id: string;
  player_name: string;
  position: number;
  score: number;
  mmr_before: number;
  mmr_change: number;
  mmr_after: number;
  faction: string | null;
}

interface MatchData {
  played_at: string;
  duration_minutes: number | null;
  game_name: string;
  game_image_url: string | null;
  results: ResultRow[];
  participantIds: string[];
}

const BoardgameResult = ({ resultId }: Props) => {
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: match } = await supabase
        .from("matches")
        .select("played_at, duration_minutes, game:games(name, image_url)")
        .eq("id", resultId)
        .maybeSingle();

      const { data: results } = await supabase
        .from("match_results")
        .select("player_id, position, score, mmr_before, mmr_change, mmr_after")
        .eq("match_id", resultId)
        .order("position");

      if (!match || !results) { setLoading(false); return; }

      const playerIds = results.map((r: any) => r.player_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, nickname")
        .in("id", playerIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
      const game = Array.isArray((match as any).game) ? (match as any).game[0] : (match as any).game;

      setData({
        played_at: (match as any).played_at,
        duration_minutes: (match as any).duration_minutes,
        game_name: game?.name || "Jogo",
        game_image_url: game?.image_url || null,
        participantIds: playerIds,
        results: results.map((r: any) => {
          const profile = profileMap.get(r.player_id);
          return {
            ...r,
            player_name: profile?.nickname || profile?.name || "Jogador",
          };
        }),
      });
      setLoading(false);
    };
    fetch();
  }, [resultId]);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  if (!data) return <div className="text-center py-8 text-muted-foreground">Resultado não encontrado</div>;

  const winner = data.results[0];

  return (
    <div className="space-y-4">
      {/* Winner highlight */}
      {winner && (
        <div className="flex flex-col items-center gap-2 py-4">
          <Trophy className="h-8 w-8 text-gold" />
          <p className="text-xl font-bold text-gold">{winner.player_name}</p>
          <p className="text-sm text-muted-foreground">
            {winner.score > 0 ? `${winner.score} pontos` : "1º lugar"}
          </p>
        </div>
      )}

      {/* Results table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Jogador</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Pontos</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">MMR</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r, i) => (
              <tr key={i} className={`border-t border-border ${i === 0 ? "bg-gold/5" : ""}`}>
                <td className="px-3 py-2 font-medium">{r.position}º</td>
                <td className="px-3 py-2">
                  <span className={i === 0 ? "text-gold font-semibold" : ""}>{r.player_name}</span>
                </td>
                <td className="px-3 py-2 text-right">{r.score}</td>
                <td className="px-3 py-2 text-right">
                  <Badge
                    variant="outline"
                    className={`text-xs gap-1 ${
                      r.mmr_change > 0
                        ? "border-green-500/30 text-green-400"
                        : r.mmr_change < 0
                        ? "border-red-500/30 text-red-400"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {r.mmr_change > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : r.mmr_change < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {r.mmr_change > 0 ? "+" : ""}{Math.round(r.mmr_change)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Match info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
        <span>{new Date(data.played_at).toLocaleDateString("pt-BR")}</span>
        {data.duration_minutes && <span>{data.duration_minutes} min</span>}
      </div>
    </div>
  );
};

export { BoardgameResult };
export type { MatchData };
export default BoardgameResult;
