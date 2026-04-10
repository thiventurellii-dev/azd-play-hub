import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { Badge } from "@/components/ui/badge";
import { Shield, Skull } from "lucide-react";

interface Props {
  resultId: string;
}

interface PlayerRow {
  player_name: string;
  character_name: string;
  team: "good" | "evil";
}

interface BloodData {
  played_at: string;
  duration_minutes: number | null;
  winning_team: "good" | "evil";
  storyteller_name: string;
  storyteller_id: string;
  script_name: string;
  players: PlayerRow[];
  participantIds: string[];
}

const BotCResult = ({ resultId }: Props) => {
  const [data, setData] = useState<BloodData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: match } = await supabase
        .from("blood_matches")
        .select("played_at, duration_minutes, winning_team, storyteller_player_id, script:blood_scripts(name)")
        .eq("id", resultId)
        .maybeSingle();

      if (!match) { setLoading(false); return; }

      const { data: matchPlayers } = await supabase
        .from("blood_match_players")
        .select("player_id, team, character:blood_characters(name)")
        .eq("match_id", resultId);

      if (!matchPlayers) { setLoading(false); return; }

      const allPlayerIds = [
        ...matchPlayers.map((mp: any) => mp.player_id),
        (match as any).storyteller_player_id,
      ].filter(Boolean);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, nickname")
        .in("id", [...new Set(allPlayerIds)]);

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
      const script = Array.isArray((match as any).script) ? (match as any).script[0] : (match as any).script;
      const stProfile = profileMap.get((match as any).storyteller_player_id);

      setData({
        played_at: (match as any).played_at,
        duration_minutes: (match as any).duration_minutes,
        winning_team: (match as any).winning_team,
        storyteller_name: stProfile?.nickname || stProfile?.name || "Narrador",
        storyteller_id: (match as any).storyteller_player_id,
        script_name: script?.name || "Script",
        participantIds: allPlayerIds,
        players: matchPlayers.map((mp: any) => {
          const profile = profileMap.get(mp.player_id);
          const char = Array.isArray(mp.character) ? mp.character[0] : mp.character;
          return {
            player_name: profile?.nickname || profile?.name || "Jogador",
            character_name: char?.name || "?",
            team: mp.team,
          };
        }),
      });
      setLoading(false);
    };
    fetch();
  }, [resultId]);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  if (!data) return <div className="text-center py-8 text-muted-foreground">Resultado não encontrado</div>;

  const isGoodWin = data.winning_team === "good";
  const goodPlayers = data.players.filter((p) => p.team === "good");
  const evilPlayers = data.players.filter((p) => p.team === "evil");

  return (
    <div className="space-y-4">
      {/* Victory banner */}
      <div
        className={`rounded-lg p-4 text-center ${
          isGoodWin
            ? "bg-blue-600/20 border border-blue-500/30"
            : "bg-red-600/20 border border-red-500/30"
        }`}
      >
        {isGoodWin ? (
          <Shield className="h-8 w-8 mx-auto mb-2 text-blue-400" />
        ) : (
          <Skull className="h-8 w-8 mx-auto mb-2 text-red-400" />
        )}
        <p className={`text-lg font-bold ${isGoodWin ? "text-blue-400" : "text-red-400"}`}>
          {isGoodWin ? "VITÓRIA DA VILA" : "VITÓRIA DO DEMÔNIO"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{data.script_name}</p>
      </div>

      {/* Storyteller */}
      <div className="text-center text-sm text-muted-foreground">
        📖 Narrador: <span className="font-medium text-foreground">{data.storyteller_name}</span>
      </div>

      {/* Good team */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">Vila ({goodPlayers.length})</span>
        </div>
        <div className="space-y-1">
          {goodPlayers.map((p, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-blue-600/5 border border-blue-500/10">
              <span className="text-sm">{p.player_name}</span>
              <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-400">
                {p.character_name}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Evil team */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Skull className="h-4 w-4 text-red-400" />
          <span className="text-sm font-medium text-red-400">Demônio ({evilPlayers.length})</span>
        </div>
        <div className="space-y-1">
          {evilPlayers.map((p, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-red-600/5 border border-red-500/10">
              <span className="text-sm">{p.player_name}</span>
              <Badge variant="outline" className="text-xs border-red-500/20 text-red-400">
                {p.character_name}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Match info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
        <span>{new Date(data.played_at).toLocaleDateString("pt-BR")}</span>
        {data.duration_minutes && <span>{data.duration_minutes} min</span>}
      </div>
    </div>
  );
};

export { BotCResult };
export default BotCResult;
