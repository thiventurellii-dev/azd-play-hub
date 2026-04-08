import { useState } from "react";
import { supabase } from "@/lib/supabaseExternal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Skull, Shield } from "lucide-react";
import { toast } from "sonner";
import { recalculateSeasonRatings } from "@/lib/bloodRatings";
import { EntitySheet } from "@/components/shared/EntitySheet";

interface BloodCharacter {
  id: string;
  name: string;
  name_en: string;
  team: "good" | "evil";
  role_type: string;
}

interface BloodMatch {
  id: string;
  played_at: string;
  duration_minutes: number | null;
  winning_team: "good" | "evil";
  storyteller_player_id: string;
  season_id: string;
  victory_conditions?: string[];
}

interface MatchPlayer {
  player_id: string;
  character_id: string;
  team: "good" | "evil";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: BloodMatch | null;
  matchPlayers: MatchPlayer[];
  allPlayers: { id: string; name: string; nickname?: string }[];
  goodChars: BloodCharacter[];
  evilChars: BloodCharacter[];
  victoryConditionOptions: string[];
  onSaved: () => void;
}

const BloodMatchEditDialog = ({ open, onOpenChange, match, matchPlayers, allPlayers, goodChars, evilChars, victoryConditionOptions, onSaved }: Props) => {
  const [winningTeam, setWinningTeam] = useState<"good" | "evil">(match?.winning_team || "good");
  const [duration, setDuration] = useState(match?.duration_minutes?.toString() || "");
  const [storyteller, setStoryteller] = useState(match?.storyteller_player_id || "");
  const [players, setPlayers] = useState<MatchPlayer[]>(matchPlayers);
  const [vcs, setVcs] = useState<string[]>(Array.isArray(match?.victory_conditions) ? [...match.victory_conditions] : []);
  const [saving, setSaving] = useState(false);

  // Reset state when match changes
  if (match && winningTeam !== match.winning_team && !saving) {
    setWinningTeam(match.winning_team);
    setDuration(match.duration_minutes?.toString() || "");
    setStoryteller(match.storyteller_player_id);
    setPlayers(matchPlayers);
    setVcs(Array.isArray(match.victory_conditions) ? [...match.victory_conditions] : []);
  }

  const handleSave = async () => {
    if (!match) return;
    setSaving(true);
    try {
      const { error: matchError } = await supabase.from("blood_matches").update({
        winning_team: winningTeam as any,
        duration_minutes: parseInt(duration) || null,
        storyteller_player_id: storyteller,
        victory_conditions: vcs,
      } as any).eq("id", match.id);
      if (matchError) throw matchError;

      await supabase.from("blood_match_players").delete().eq("match_id", match.id);
      if (players.length > 0) {
        const { error: pError } = await supabase.from("blood_match_players").insert(
          players.map((p) => ({ match_id: match.id, player_id: p.player_id, character_id: p.character_id, team: p.team as any }))
        );
        if (pError) throw pError;
      }

      await recalculateSeasonRatings(match.season_id);
      toast.success("Partida atualizada!");
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} title="Editar Partida" widthClass="sm:max-w-2xl">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Time Vencedor</Label>
            <Select value={winningTeam} onValueChange={(v) => setWinningTeam(v as "good" | "evil")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="good">🛡️ Bem</SelectItem>
                <SelectItem value="evil">💀 Mal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duração (min)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="90" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Narrador</Label>
          <Select value={storyteller} onValueChange={setStoryteller}>
            <SelectTrigger><SelectValue placeholder="Selecione o narrador" /></SelectTrigger>
            <SelectContent>
              {allPlayers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nickname || p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Evil */}
        <div className="space-y-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2">
            <Skull className="h-4 w-4 text-red-400" />
            <Label className="text-red-400 font-semibold">Time Maligno</Label>
          </div>
          {players.filter((p) => p.team === "evil").map((ep, i) => {
            const idx = players.indexOf(ep);
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                <Select value={ep.player_id} onValueChange={(v) => { const u = [...players]; u[idx] = { ...u[idx], player_id: v }; setPlayers(u); }}>
                  <SelectTrigger><SelectValue placeholder="Jogador" /></SelectTrigger>
                  <SelectContent>{allPlayers.map((p) => <SelectItem key={p.id} value={p.id}>{p.nickname || p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={ep.character_id} onValueChange={(v) => { const u = [...players]; u[idx] = { ...u[idx], character_id: v }; setPlayers(u); }}>
                  <SelectTrigger><SelectValue placeholder="Personagem" /></SelectTrigger>
                  <SelectContent>{evilChars.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.role_type})</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => setPlayers(players.filter((_, j) => j !== idx))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setPlayers([...players, { player_id: "", character_id: "", team: "evil" }])}>
            <Plus className="h-4 w-4 mr-1" /> Maligno
          </Button>
        </div>

        {/* Good */}
        <div className="space-y-3 p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <Label className="text-blue-400 font-semibold">Time Benigno</Label>
          </div>
          {players.filter((p) => p.team === "good").map((ep, i) => {
            const idx = players.indexOf(ep);
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                <Select value={ep.player_id} onValueChange={(v) => { const u = [...players]; u[idx] = { ...u[idx], player_id: v }; setPlayers(u); }}>
                  <SelectTrigger><SelectValue placeholder="Jogador" /></SelectTrigger>
                  <SelectContent>{allPlayers.map((p) => <SelectItem key={p.id} value={p.id}>{p.nickname || p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={ep.character_id} onValueChange={(v) => { const u = [...players]; u[idx] = { ...u[idx], character_id: v }; setPlayers(u); }}>
                  <SelectTrigger><SelectValue placeholder="Personagem" /></SelectTrigger>
                  <SelectContent>{goodChars.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.role_type})</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => setPlayers(players.filter((_, j) => j !== idx))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setPlayers([...players, { player_id: "", character_id: "", team: "good" }])}>
            <Plus className="h-4 w-4 mr-1" /> Benigno
          </Button>
        </div>

        {/* Victory Conditions */}
        {victoryConditionOptions.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg border border-gold/20 bg-gold/5">
            <Label className="text-gold">Condições de Vitória Especiais</Label>
            <div className="space-y-2">
              {victoryConditionOptions.map((vc, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={vcs.includes(vc)}
                    onCheckedChange={(checked) => setVcs((prev) => (checked ? [...prev, vc] : prev.filter((v) => v !== vc)))}
                  />
                  <span className="text-sm">{vc}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Button variant="gold" onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar Partida"}
        </Button>
      </div>
    </EntitySheet>
  );
};

export default BloodMatchEditDialog;
