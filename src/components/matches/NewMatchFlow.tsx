import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/components/NotificationDialog';
import { Upload, UserPlus, Trash2, Trophy, ChevronLeft, ChevronRight, Check, Search } from 'lucide-react';
import ScoringSheet from './ScoringSheet';

interface Season { id: string; name: string; }
interface Game { id: string; name: string; slug: string | null; min_players: number | null; max_players: number | null; }
interface Player { id: string; name: string; nickname?: string; }
interface PlayerEntry {
  player_id: string;
  seat_position: number;
  faction: string;
  is_new_player: boolean;
}

interface Props {
  prefilledGameId?: string;
  prefilledPlayers?: string[];
  prefilledDate?: string;
  onComplete?: () => void;
}

const NewMatchFlow = ({ prefilledGameId, prefilledPlayers, prefilledDate, onComplete }: Props) => {
  const { notify } = useNotification();
  const [step, setStep] = useState(1);

  // Step 1
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [gameId, setGameId] = useState(prefilledGameId || '');
  const [playedDate, setPlayedDate] = useState(prefilledDate || '');
  const [playedTime, setPlayedTime] = useState('');
  const [duration, setDuration] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Step 2
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [entries, setEntries] = useState<PlayerEntry[]>(
    prefilledPlayers?.map((pid, i) => ({
      player_id: pid, seat_position: i + 1, faction: '', is_new_player: false,
    })) || [{ player_id: '', seat_position: 1, faction: '', is_new_player: false }]
  );
  const [playerSearch, setPlayerSearch] = useState('');

  // Step 3
  const [scoringSchema, setScoringSchema] = useState<any>(null);
  const [playerScores, setPlayerScores] = useState<any[]>([]);

  // Game factions
  const [gameFactions, setGameFactions] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  const selectedGame = games.find(g => g.id === gameId);

  useEffect(() => {
    const fetchBase = async () => {
      const [s, g, p] = await Promise.all([
        supabase.from('seasons').select('id, name').eq('type', 'boardgame' as any).order('start_date', { ascending: false }),
        supabase.from('games').select('id, name, slug, min_players, max_players').order('name'),
        supabase.from('profiles').select('id, name, nickname').order('name'),
      ]);
      setSeasons(s.data || []);
      setGames((g.data || []) as Game[]);
      setAllPlayers(p.data || []);
    };
    fetchBase();
  }, []);

  // Fetch scoring schema + factions when game changes
  useEffect(() => {
    if (!gameId) { setScoringSchema(null); setGameFactions([]); return; }
    const fetchSchema = async () => {
      const [schemaRes, gameRes] = await Promise.all([
        supabase.from('game_scoring_schemas').select('schema').eq('game_id', gameId).maybeSingle(),
        supabase.from('games').select('factions').eq('id', gameId).maybeSingle(),
      ]);
      setScoringSchema(schemaRes.data?.schema || null);
      // Parse factions from game data
      const fData = (gameRes.data as any)?.factions;
      if (Array.isArray(fData)) {
        setGameFactions(fData.map((f: any) => typeof f === 'string' ? f : f.name || ''));
      } else {
        setGameFactions([]);
      }
    };
    fetchSchema();
  }, [gameId]);

  const addEntry = () => setEntries([...entries, {
    player_id: '', seat_position: entries.length + 1, faction: '', is_new_player: false,
  }]);

  const updateEntry = (i: number, field: keyof PlayerEntry, value: any) => {
    const updated = [...entries];
    (updated[i] as any)[field] = value;
    setEntries(updated);
  };

  const removeEntry = (i: number) => setEntries(entries.filter((_, idx) => idx !== i));

  const filteredPlayers = useMemo(() => {
    if (!playerSearch) return allPlayers;
    const q = playerSearch.toLowerCase();
    return allPlayers.filter(p =>
      (p.nickname || '').toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    );
  }, [allPlayers, playerSearch]);

  const scoringPlayers = entries.filter(e => e.player_id).map(e => {
    const p = allPlayers.find(p => p.id === e.player_id);
    return { id: e.player_id, name: p?.nickname || p?.name || '?' };
  });

  // Validate player count
  const playerCountValid = () => {
    const count = entries.filter(e => e.player_id).length;
    if (!selectedGame) return count >= 1;
    const min = selectedGame.min_players || 1;
    const max = selectedGame.max_players || 99;
    return count >= min && count <= max;
  };

  const playerCountMessage = () => {
    if (!selectedGame) return '';
    const count = entries.filter(e => e.player_id || e.ghost_name).length;
    const min = selectedGame.min_players || 1;
    const max = selectedGame.max_players || 99;
    if (count < min) return `Mínimo de ${min} jogadores necessários`;
    if (count > max) return `Máximo de ${max} jogadores permitidos`;
    return '';
  };

  const calculateElo = (results: { player_id: string; position: number }[], mmrMap: Record<string, number>) => {
    const K = 50;
    const n = results.length;
    const changes: Record<string, number> = {};
    for (const r of results) changes[r.player_id] = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const rA = mmrMap[results[i].player_id] || 1000;
        const rB = mmrMap[results[j].player_id] || 1000;
        const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
        const eB = 1 / (1 + Math.pow(10, (rA - rB) / 400));
        let sA: number, sB: number;
        if (results[i].position < results[j].position) { sA = 1; sB = 0; }
        else if (results[i].position > results[j].position) { sA = 0; sB = 1; }
        else { sA = 0.5; sB = 0.5; }
        changes[results[i].player_id] += K * (sA - eA);
        changes[results[j].player_id] += K * (sB - eB);
      }
    }
    for (const r of results) {
      changes[r.player_id] += 5 * (n - r.position);
    }
    return Object.fromEntries(Object.entries(changes).map(([id, change]) => [id, parseFloat(change.toFixed(2))]));
  };

  const handleSubmit = async () => {
    if (!gameId || !playedDate || entries.some(e => !e.player_id && !e.ghost_name)) {
      return notify('error', 'Preencha Jogo, Data e todos os jogadores');
    }
    setSaving(true);
    try {
      // Create ghost players first
      const ghostMap: Record<string, string> = {}; // ghost_name -> ghost_player_id
      for (const e of entries) {
        if (e.ghost_name && !e.player_id) {
          const { data: ghost, error: gErr } = await supabase
            .from('ghost_players')
            .insert({ display_name: e.ghost_name })
            .select()
            .single();
          if (gErr) throw gErr;
          ghostMap[e.ghost_name] = ghost.id;
        }
      }
      // Build results with positions based on scores
      const sorted = [...playerScores].sort((a, b) => b.total - a.total);
      const positionMap: Record<string, number> = {};
      sorted.forEach((ps, i) => { positionMap[ps.player_id] = i + 1; });

      // If no scores, use seat order
      if (playerScores.length === 0) {
        entries.forEach((e, i) => { positionMap[e.player_id] = i + 1; });
      }

      const playerIds = entries.filter(e => e.player_id).map(e => e.player_id);

      // Only do MMR if season is selected
      let mmrMap: Record<string, number> = {};
      let gpMap: Record<string, number> = {};
      let winsMap: Record<string, number> = {};
      let eloChanges: Record<string, number> = {};

      if (seasonId) {
        const { data: mmrData } = await supabase
          .from('mmr_ratings')
          .select('player_id, current_mmr, games_played, wins, game_id')
          .eq('season_id', seasonId)
          .eq('game_id', gameId)
          .in('player_id', playerIds);

        for (const m of (mmrData || [])) {
          mmrMap[m.player_id] = m.current_mmr;
          gpMap[m.player_id] = m.games_played;
          winsMap[m.player_id] = m.wins;
        }

        for (const pid of playerIds) {
          if (!(pid in mmrMap)) {
            mmrMap[pid] = 1000; gpMap[pid] = 0; winsMap[pid] = 0;
            await supabase.from('mmr_ratings').insert({ player_id: pid, season_id: seasonId, game_id: gameId, current_mmr: 1000, games_played: 0, wins: 0 } as any);
          }
        }

        const results = entries.map(e => ({ player_id: e.player_id, position: positionMap[e.player_id] || 1 }));
        eloChanges = calculateElo(results, mmrMap);
      }

      let imageUrl: string | null = null;
      if (imageFile && seasonId) {
        const ext = imageFile.name.split('.').pop();
        const path = `${seasonId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('match-images').upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('match-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      } else if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `general/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('match-images').upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('match-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const playedAt = playedTime
        ? new Date(`${playedDate}T${playedTime}`).toISOString()
        : new Date(`${playedDate}T00:00:00`).toISOString();

      // Use a default season if not selected — find any active one or first one
      const effectiveSeasonId = seasonId || seasons[0]?.id;
      if (!effectiveSeasonId) {
        return notify('error', 'Nenhuma season disponível. Peça ao admin para criar uma.');
      }

      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .insert({
          season_id: effectiveSeasonId, game_id: gameId,
          duration_minutes: parseInt(duration) || null,
          played_at: playedAt,
          image_url: imageUrl, first_player_id: null,
        })
        .select().single();
      if (matchErr) throw matchErr;

      const matchResults = entries.map(e => {
        const entryId = e.player_id || `ghost_${e.ghost_name}`;
        const pos = positionMap[entryId] || positionMap[e.player_id] || 1;
        const ps = playerScores.find(p => p.player_id === entryId || p.player_id === e.player_id);
        return {
          match_id: match.id,
          player_id: e.player_id || null,
          ghost_player_id: e.ghost_name ? ghostMap[e.ghost_name] || null : null,
          position: pos, score: ps?.total || 0,
          mmr_before: mmrMap[e.player_id] || 1000,
          mmr_change: eloChanges[e.player_id] || 0,
          mmr_after: (mmrMap[e.player_id] || 1000) + (eloChanges[e.player_id] || 0),
          seat_position: e.seat_position, faction: e.faction || null,
          is_new_player: e.is_new_player,
        };
      });
      const { data: insertedResults, error: resErr } = await supabase.from('match_results').insert(matchResults).select();
      if (resErr) throw resErr;

      // Insert detailed scores if schema exists
      if (scoringSchema && playerScores.length > 0 && insertedResults) {
        const detailedScores: any[] = [];
        for (const ir of insertedResults) {
          const ps = playerScores.find(p => p.player_id === ir.player_id);
          if (ps?.scores) {
            for (const [key, value] of Object.entries(ps.scores)) {
              if (typeof value === 'number' && value !== 0) {
                detailedScores.push({
                  match_result_id: ir.id,
                  category_key: key,
                  value,
                });
              }
            }
          }
        }
        if (detailedScores.length > 0) {
          await supabase.from('match_result_scores').insert(detailedScores);
        }
      }

      // Update MMR only if season was selected
      if (seasonId) {
        for (const e of entries) {
          const pos = positionMap[e.player_id] || 1;
          const isWin = pos === 1;
          await supabase.from('mmr_ratings').update({
            current_mmr: mmrMap[e.player_id] + eloChanges[e.player_id],
            games_played: gpMap[e.player_id] + 1,
            wins: winsMap[e.player_id] + (isWin ? 1 : 0),
            updated_at: new Date().toISOString(),
          }).eq('player_id', e.player_id).eq('season_id', seasonId).eq('game_id', gameId);
        }
      }

      notify('success', 'Partida registrada com sucesso!');
      onComplete?.();
      // Reset
      setStep(1);
      setEntries([{ player_id: '', ghost_name: '', seat_position: 1, faction: '', is_new_player: false }]);
      setPlayerScores([]);
      setDuration(''); setPlayedDate(''); setPlayedTime(''); setImageFile(null);
      setSeasonId('');
    } catch (err: any) {
      notify('error', err.message || 'Erro ao registrar partida');
    } finally {
      setSaving(false);
    }
  };

  const gameName = games.find(g => g.id === gameId)?.name || '';

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Nova Partida</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-2 w-8 rounded-full ${s <= step ? 'bg-gold' : 'bg-secondary'}`} />
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* STEP 1: Header */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">1. Cabeçalho da Partida</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Jogo *</Label>
                <Select value={gameId} onValueChange={setGameId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Competitivo (opcional)</Label>
                <Select value={seasonId} onValueChange={setSeasonId}>
                  <SelectTrigger><SelectValue placeholder="Sem vínculo competitivo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={playedDate} onChange={e => setPlayedDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora (opcional)</Label>
                <Input type="time" value={playedTime} onChange={e => setPlayedTime(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="120" />
              </div>
              <div className="space-y-2">
                <Label>Foto (opcional)</Label>
                <label className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">{imageFile ? imageFile.name : 'Anexar imagem'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="gold" onClick={() => setStep(2)} disabled={!gameId || !playedDate}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Players */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">2. Jogadores</h3>
            {selectedGame && (
              <p className="text-sm text-muted-foreground">
                {selectedGame.name}: {selectedGame.min_players || '?'}–{selectedGame.max_players || '?'} jogadores
              </p>
            )}
            {entries.map((e, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap border border-border rounded-lg p-3">
                <div className="flex-1 min-w-[180px] space-y-1">
                  <Label className="text-xs">Jogador {!e.ghost_name && '*'}</Label>
                  <Select value={e.player_id} onValueChange={v => { updateEntry(i, 'player_id', v); updateEntry(i, 'ghost_name', ''); }}>
                    <SelectTrigger><SelectValue placeholder="Buscar jogador..." /></SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <Input
                          placeholder="Buscar por nome..."
                          value={playerSearch}
                          onChange={ev => setPlayerSearch(ev.target.value)}
                          className="h-8"
                          onClick={ev => ev.stopPropagation()}
                        />
                      </div>
                      {filteredPlayers.map(p => (
                        <SelectItem key={p.id} value={p.id} disabled={entries.some((ee, ii) => ii !== i && ee.player_id === p.id)}>
                          {p.nickname || p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!e.player_id && (
                  <div className="min-w-[140px] space-y-1">
                    <Label className="text-xs">👻 Fantasma</Label>
                    <Input value={e.ghost_name} onChange={ev => updateEntry(i, 'ghost_name', ev.target.value)} placeholder="Nome do jogador" className="h-10" />
                  </div>
                )}
                <div className="w-[80px] space-y-1">
                  <Label className="text-xs">Posição</Label>
                  <Input type="number" min={1} value={e.seat_position} onChange={ev => updateEntry(i, 'seat_position', parseInt(ev.target.value) || 1)} />
                </div>
                {gameFactions.length > 0 ? (
                  <div className="w-[120px] space-y-1">
                    <Label className="text-xs">Facção</Label>
                    <Select value={e.faction} onValueChange={v => updateEntry(i, 'faction', v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {gameFactions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="w-[120px] space-y-1">
                    <Label className="text-xs">Facção</Label>
                    <Input value={e.faction} onChange={ev => updateEntry(i, 'faction', ev.target.value)} placeholder="Opcional" />
                  </div>
                )}
                <div className="flex items-center gap-2 pt-5">
                  <Checkbox checked={e.is_new_player} onCheckedChange={c => updateEntry(i, 'is_new_player', !!c)} />
                  <span className="text-xs">Novo</span>
                </div>
                {entries.length > 1 && (
                  <Button variant="ghost" size="icon" className="mt-5" onClick={() => removeEntry(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addEntry}>
              <UserPlus className="h-4 w-4 mr-1" /> Adicionar Jogador
            </Button>
            {playerCountMessage() && (
              <p className="text-sm text-destructive">{playerCountMessage()}</p>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              <Button variant="gold" onClick={() => setStep(3)} disabled={entries.some(e => !e.player_id && !e.ghost_name) || !playerCountValid()}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Scoring */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">3. Pontuação — {gameName}</h3>
            <ScoringSheet
              schema={scoringSchema}
              players={scoringPlayers}
              onScoresChange={setPlayerScores}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              <Button variant="gold" onClick={() => setStep(4)}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirmation */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">4. Confirmação</h3>
            <div className="grid gap-2 text-sm">
              {seasonId && seasonId !== 'none' && <p><span className="text-muted-foreground">Competitivo:</span> {seasons.find(s => s.id === seasonId)?.name}</p>}
              <p><span className="text-muted-foreground">Jogo:</span> {gameName}</p>
              <p><span className="text-muted-foreground">Data:</span> {playedDate} {playedTime || ''}</p>
              {duration && <p><span className="text-muted-foreground">Duração:</span> {duration} min</p>}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Jogadores & Pontuação:</p>
              {(() => {
                const sorted = [...playerScores].sort((a, b) => b.total - a.total);
                return sorted.map((ps, i) => {
                  const entry = entries.find(e => e.player_id === ps.player_id);
                  return (
                    <div key={ps.player_id} className={`flex items-center justify-between p-2 rounded ${i === 0 && ps.total > 0 ? 'border border-gold/30 bg-gold/5' : 'border border-border'}`}>
                      <div className="flex items-center gap-2">
                        <Badge variant={i === 0 ? 'default' : 'secondary'} className={i === 0 ? 'bg-gold text-black' : ''}>
                          {i + 1}º
                        </Badge>
                        <span className="font-medium">{ps.player_name}</span>
                        {entry?.is_new_player && <Badge variant="outline" className="text-xs">Novo</Badge>}
                      </div>
                      <span className="font-bold text-gold">{ps.total} pts</span>
                    </div>
                  );
                });
              })()}
              {playerScores.length === 0 && entries.map((e, i) => {
                const p = allPlayers.find(p => p.id === e.player_id);
                return (
                  <div key={e.player_id} className="flex items-center gap-2 p-2 border border-border rounded">
                    <Badge variant="secondary">{i + 1}º</Badge>
                    <span>{p?.nickname || p?.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              <Button variant="gold" onClick={handleSubmit} disabled={saving}>
                <Check className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Registrar Partida'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NewMatchFlow;
