import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, UserPlus } from 'lucide-react';

interface Season { id: string; name: string; }
interface Game { id: string; name: string; }
interface Player { id: string; name: string; }
interface MatchResult { player_id: string; position: number; score: number; }

const AdminMatches = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [gameId, setGameId] = useState('');
  const [duration, setDuration] = useState('');
  const [results, setResults] = useState<MatchResult[]>([{ player_id: '', position: 1, score: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [s, g, p] = await Promise.all([
        supabase.from('seasons').select('id, name').order('start_date', { ascending: false }),
        supabase.from('games').select('id, name').order('name'),
        supabase.from('profiles').select('id, name').order('name'),
      ]);
      setSeasons(s.data || []);
      setGames(g.data || []);
      setPlayers(p.data || []);
    };
    fetch();
  }, []);

  const addResult = () => setResults([...results, { player_id: '', position: results.length + 1, score: 0 }]);

  const updateResult = (i: number, field: keyof MatchResult, value: string | number) => {
    const updated = [...results];
    (updated[i] as any)[field] = value;
    setResults(updated);
  };

  const removeResult = (i: number) => setResults(results.filter((_, idx) => idx !== i));

  const calculateElo = (results: MatchResult[], mmrMap: Record<string, number>) => {
    const K = 32;
    const n = results.length;
    const changes: Record<string, number> = {};

    for (const r of results) {
      changes[r.player_id] = 0;
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const rA = mmrMap[results[i].player_id] || 1000;
        const rB = mmrMap[results[j].player_id] || 1000;
        const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
        const eB = 1 - eA;

        let sA: number, sB: number;
        if (results[i].position < results[j].position) {
          sA = 1; sB = 0;
        } else if (results[i].position > results[j].position) {
          sA = 0; sB = 1;
        } else {
          sA = 0.5; sB = 0.5;
        }

        const factor = K / (n - 1);
        changes[results[i].player_id] += factor * (sA - eA);
        changes[results[j].player_id] += factor * (sB - eB);
      }
    }

    return Object.fromEntries(
      Object.entries(changes).map(([id, change]) => [id, Math.round(change)])
    );
  };

  const handleSubmit = async () => {
    if (!seasonId || !gameId || results.some(r => !r.player_id)) {
      return toast.error('Preencha todos os campos');
    }
    setSaving(true);

    try {
      // Get current MMR for all players
      const playerIds = results.map(r => r.player_id);
      const { data: mmrData } = await supabase
        .from('mmr_ratings')
        .select('player_id, current_mmr')
        .eq('season_id', seasonId)
        .in('player_id', playerIds);

      const mmrMap: Record<string, number> = {};
      for (const m of (mmrData || [])) mmrMap[m.player_id] = m.current_mmr;

      // Create missing MMR entries
      for (const pid of playerIds) {
        if (!(pid in mmrMap)) {
          mmrMap[pid] = 1000;
          await supabase.from('mmr_ratings').insert({
            player_id: pid,
            season_id: seasonId,
            current_mmr: 1000,
            games_played: 0,
            wins: 0,
          });
        }
      }

      const eloChanges = calculateElo(results, mmrMap);

      // Create match
      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .insert({ season_id: seasonId, game_id: gameId, duration_minutes: parseInt(duration) || null, played_at: new Date().toISOString() })
        .select()
        .single();

      if (matchErr) throw matchErr;

      // Create match results
      const matchResults = results.map(r => ({
        match_id: match.id,
        player_id: r.player_id,
        position: r.position,
        score: r.score,
        mmr_before: mmrMap[r.player_id],
        mmr_change: eloChanges[r.player_id],
        mmr_after: mmrMap[r.player_id] + eloChanges[r.player_id],
      }));

      const { error: resErr } = await supabase.from('match_results').insert(matchResults);
      if (resErr) throw resErr;

      // Update MMR ratings
      for (const r of results) {
        const isWin = r.position === 1;
        await supabase
          .from('mmr_ratings')
          .update({
            current_mmr: mmrMap[r.player_id] + eloChanges[r.player_id],
            games_played: (mmrData?.find(m => m.player_id === r.player_id) ? 1 : 0) + 1,
            wins: isWin ? 1 : 0,
            updated_at: new Date().toISOString(),
          })
          .eq('player_id', r.player_id)
          .eq('season_id', seasonId);

        // Use RPC or raw increment for proper counting - simplified here
      }

      toast.success('Partida registrada com sucesso!');
      setResults([{ player_id: '', position: 1, score: 0 }]);
      setDuration('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar partida');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Registrar Partida</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Season</Label>
              <Select value={seasonId} onValueChange={setSeasonId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jogo</Label>
              <Select value={gameId} onValueChange={setGameId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="120" />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Resultados dos Jogadores</Label>
            {results.map((r, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select value={r.player_id} onValueChange={v => updateResult(i, 'player_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Jogador" /></SelectTrigger>
                    <SelectContent>
                      {players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input type="number" className="w-20" placeholder="Pos" value={r.position} onChange={e => updateResult(i, 'position', parseInt(e.target.value))} />
                <Input type="number" className="w-24" placeholder="Score" value={r.score} onChange={e => updateResult(i, 'score', parseInt(e.target.value))} />
                {results.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeResult(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addResult}>
              <UserPlus className="h-4 w-4 mr-1" /> Adicionar Jogador
            </Button>
          </div>

          <Button variant="gold" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar Partida'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMatches;
