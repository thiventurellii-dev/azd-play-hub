import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useNotification } from '@/components/NotificationDialog';
import { Upload, UserPlus, Trash2, ChevronLeft, ChevronRight, Check, ChevronsUpDown } from 'lucide-react';
import { DatePickerField } from '@/components/ui/date-picker-field';
import ScoringSheet from './ScoringSheet';
import NewMatchBotcFlow from './NewMatchBotcFlow';
import { Gamepad2, Skull, Sword } from 'lucide-react';

interface Season { id: string; name: string; }
interface Game { id: string; name: string; slug: string | null; min_players: number | null; max_players: number | null; }
interface Player { id: string; name: string; nickname?: string; }
interface PlayerEntry {
  player_id: string;
  seat_position: number;
  faction: string;
  is_new_player: boolean;
}

interface BloodScript { id: string; name: string; }

interface Props {
  prefilledGameId?: string;
  prefilledPlayers?: string[];
  prefilledDate?: string;
  onComplete?: (matchId?: string) => void;
}

const NewMatchFlow = ({ prefilledGameId, prefilledPlayers, prefilledDate, onComplete }: Props) => {
  const { notify } = useNotification();
  const [category, setCategory] = useState<'boardgame' | 'botc' | 'rpg' | ''>('');
  const [step, setStep] = useState(1);

  // Step 1
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [gameId, setGameId] = useState(prefilledGameId || '');
  const [playedDate, setPlayedDate] = useState(prefilledDate || '');
  const [playedTime, setPlayedTime] = useState('');
  const [duration, setDuration] = useState('');
  const [platform, setPlatform] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // BotC script
  const [bloodScripts, setBloodScripts] = useState<BloodScript[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState('');

  // Step 2
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [entries, setEntries] = useState<PlayerEntry[]>(
    prefilledPlayers?.map((pid, i) => ({
      player_id: pid, seat_position: i + 1, faction: '', is_new_player: false,
    })) || [{ player_id: '', seat_position: 1, faction: '', is_new_player: false }]
  );
  const [openPopovers, setOpenPopovers] = useState<Record<number, boolean>>({});

  // Step 3
  const [scoringSchema, setScoringSchema] = useState<any>(null);
  const [playerScores, setPlayerScores] = useState<any[]>([]);

  // Game factions
  const [gameFactions, setGameFactions] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  const selectedGame = games.find(g => g.id === gameId);
  const isBotC = selectedGame && (selectedGame.name.toLowerCase().includes('blood') || selectedGame.slug === 'blood-on-the-clocktower');

  useEffect(() => {
    const fetchBase = async () => {
      const [s, g, p] = await Promise.all([
        supabase.from('seasons').select('id, name, status').eq('type', 'boardgame' as any).neq('status', 'finished').neq('status', 'upcoming').order('start_date', { ascending: false }),
        supabase.from('games').select('id, name, slug, min_players, max_players').order('name'),
        supabase.from('profiles').select('id, name, nickname').order('name'),
      ]);
      setSeasons(s.data || []);
      setGames((g.data || []) as Game[]);
      setAllPlayers(p.data || []);
    };
    fetchBase();
  }, []);

  // Fetch scoring schema + factions + BotC scripts when game changes
  useEffect(() => {
    if (!gameId) { setScoringSchema(null); setGameFactions([]); setBloodScripts([]); setSelectedScriptId(''); return; }
    const fetchSchema = async () => {
      const [schemaRes, gameRes] = await Promise.all([
        supabase.from('game_scoring_schemas').select('schema').eq('game_id', gameId).maybeSingle(),
        supabase.from('games').select('factions, name, slug').eq('id', gameId).maybeSingle(),
      ]);
      setScoringSchema(schemaRes.data?.schema || null);
      try {
        const fData = (gameRes.data as any)?.factions;
        if (Array.isArray(fData)) {
          setGameFactions(fData.map((f: any) => typeof f === 'string' ? f : f.name || '').filter(Boolean));
        } else if (typeof fData === 'string') {
          const parsed = JSON.parse(fData);
          setGameFactions(Array.isArray(parsed) ? parsed.map((f: any) => typeof f === 'string' ? f : f.name || '').filter(Boolean) : []);
        } else {
          setGameFactions([]);
        }
      } catch {
        setGameFactions([]);
      }

      // Check BotC
      const gName = (gameRes.data as any)?.name?.toLowerCase() || '';
      const gSlug = (gameRes.data as any)?.slug || '';
      if (gName.includes('blood') || gSlug === 'blood-on-the-clocktower') {
        const { data: scripts } = await supabase.from('blood_scripts').select('id, name').order('name');
        setBloodScripts(scripts || []);
      } else {
        setBloodScripts([]);
        setSelectedScriptId('');
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

  // Memoize scoringPlayers so ScoringSheet doesn't reset
  const scoringPlayers = useMemo(() => {
    return entries.filter(e => e.player_id).map(e => {
      const p = allPlayers.find(p => p.id === e.player_id);
      return { id: e.player_id, name: p?.nickname || p?.name || '?' };
    });
  }, [entries.map(e => e.player_id).join(','), allPlayers]);

  const playerCountValid = () => {
    const count = entries.filter(e => e.player_id).length;
    if (!selectedGame) return count >= 1;
    const min = selectedGame.min_players || 1;
    const max = selectedGame.max_players || 99;
    return count >= min && count <= max;
  };

  const playerCountMessage = () => {
    if (!selectedGame) return '';
    const count = entries.filter(e => e.player_id).length;
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
    const filledEntries = entries.filter(e => e.player_id);
    if (!gameId || !playedDate || filledEntries.length === 0) {
      return notify('error', 'Preencha Jogo, Data e pelo menos um jogador');
    }
    setSaving(true);
    try {
      const sorted = [...playerScores].sort((a, b) => b.total - a.total);
      const positionMap: Record<string, number> = {};
      sorted.forEach((ps, i) => { positionMap[ps.player_id] = i + 1; });

      if (playerScores.length === 0) {
        filledEntries.forEach((e, i) => { positionMap[e.player_id] = i + 1; });
      }

      const playerIds = filledEntries.map(e => e.player_id);

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
            await supabase.rpc('upsert_mmr_for_match', { p_player_id: pid, p_season_id: seasonId, p_game_id: gameId, p_current_mmr: 1000, p_games_played: 0, p_wins: 0 });
          }
        }

        const results = filledEntries.map(e => ({ player_id: e.player_id, position: positionMap[e.player_id] || 1 }));
        eloChanges = calculateElo(results, mmrMap);
      }

      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const folder = seasonId || 'general';
        const path = `${folder}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('match-images').upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('match-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const playedAt = playedTime
        ? new Date(`${playedDate}T${playedTime}`).toISOString()
        : new Date(`${playedDate}T00:00:00`).toISOString();

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
          platform: platform || null,
        } as any)
        .select().single();
      if (matchErr) throw matchErr;

      const matchResults = filledEntries.map(e => {
        const pos = positionMap[e.player_id] || 1;
        const ps = playerScores.find(p => p.player_id === e.player_id);
        return {
          match_id: match.id,
          player_id: e.player_id,
          ghost_player_id: null,
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

      if (scoringSchema && playerScores.length > 0 && insertedResults) {
        const detailedScores: any[] = [];
        for (const ir of insertedResults) {
          const ps = playerScores.find(p => p.player_id === ir.player_id);
          if (ps?.scores) {
            for (const [key, value] of Object.entries(ps.scores)) {
              if (typeof value === 'number' && value !== 0) {
                detailedScores.push({ match_result_id: ir.id, category_key: key, value });
              }
            }
          }
        }
        if (detailedScores.length > 0) {
          await supabase.from('match_result_scores').insert(detailedScores);
        }
      }

      if (seasonId) {
        for (const e of filledEntries) {
          const pos = positionMap[e.player_id] || 1;
          const isWin = pos === 1;
          await supabase.rpc('upsert_mmr_for_match', {
            p_player_id: e.player_id,
            p_season_id: seasonId,
            p_game_id: gameId,
            p_current_mmr: mmrMap[e.player_id] + eloChanges[e.player_id],
            p_games_played: gpMap[e.player_id] + 1,
            p_wins: winsMap[e.player_id] + (isWin ? 1 : 0),
          });
        }
      }

      notify('success', 'Partida registrada com sucesso!');
      onComplete?.(match.id);
      setStep(1);
      setEntries([{ player_id: '', seat_position: 1, faction: '', is_new_player: false }]);
      setPlayerScores([]);
      setDuration(''); setPlayedDate(''); setPlayedTime(''); setImageFile(null);
      setSeasonId(''); setSelectedScriptId('');
    } catch (err: any) {
      notify('error', err.message || 'Erro ao registrar partida');
    } finally {
      setSaving(false);
    }
  };

  const gameName = games.find(g => g.id === gameId)?.name || '';

  // Category selector
  if (!category) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Escolha a categoria da partida:</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <button type="button" onClick={() => setCategory('boardgame')} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-border hover:border-gold/60 text-center transition-all group aspect-[3/4]">
            <Gamepad2 className="h-12 w-12 mb-3 text-gold group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-sm">Boardgame</p>
            <p className="text-xs text-muted-foreground mt-1">Jogos de tabuleiro</p>
          </button>
          <button type="button" onClick={() => setCategory('botc')} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-border hover:border-red-500/60 text-center transition-all group aspect-[3/4]">
            <Skull className="h-12 w-12 mb-3 text-red-400 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-sm">Blood on the Clocktower</p>
            <p className="text-xs text-muted-foreground mt-1">BotC</p>
          </button>
          <button type="button" onClick={() => setCategory('rpg')} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-border hover:border-purple-500/60 text-center transition-all group aspect-[3/4]">
            <Sword className="h-12 w-12 mb-3 text-purple-400 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-sm">RPG</p>
            <p className="text-xs text-muted-foreground mt-1">Em breve</p>
          </button>
        </div>
      </div>
    );
  }

  if (category === 'botc') {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setCategory('')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <NewMatchBotcFlow onComplete={onComplete} />
      </div>
    );
  }

  if (category === 'rpg') {
    return (
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>RPG</CardTitle></CardHeader>
        <CardContent className="text-center py-12">
          <Sword className="h-12 w-12 mx-auto mb-4 text-purple-400" />
          <p className="text-muted-foreground">Registro de sessões de RPG em breve!</p>
          <Button variant="outline" className="mt-4" onClick={() => setCategory('')}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={() => setCategory('')}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Nova Partida — Boardgame</span>
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
                    {games.filter(g => g.slug !== 'blood-on-the-clocktower').map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
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
              {isBotC && bloodScripts.length > 0 && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Script (BotC) *</Label>
                  <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar Script" /></SelectTrigger>
                    <SelectContent>
                      {bloodScripts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Data *</Label>
                <DatePickerField value={playedDate} onChange={setPlayedDate} placeholder="Selecione a data" />
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
                <Label>Local / Plataforma</Label>
                <Select value={platform || 'none'} onValueChange={v => setPlatform(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Onde foi jogado?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não especificado</SelectItem>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                    <SelectItem value="Tabletop Simulator">Tabletop Simulator</SelectItem>
                    <SelectItem value="BoardGame Arena">BoardGame Arena</SelectItem>
                    <SelectItem value="Discord">Discord</SelectItem>
                    <SelectItem value="Outro Online">Outro Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Foto (opcional)</Label>
                <label className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">{imageFile ? imageFile.name : 'Anexar imagem'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="gold" onClick={() => {
                // Pre-fill entries to max_players count
                const max = selectedGame?.max_players || 10;
                const currentCount = entries.length;
                if (currentCount < max) {
                  const newEntries = [...entries];
                  for (let i = currentCount; i < max; i++) {
                    newEntries.push({ player_id: '', seat_position: i + 1, faction: '', is_new_player: false });
                  }
                  setEntries(newEntries);
                }
                setStep(2);
              }} disabled={!gameId || !playedDate || (isBotC && bloodScripts.length > 0 && !selectedScriptId)}>
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
            {entries.map((e, i) => {
              const selectedPlayer = allPlayers.find(p => p.id === e.player_id);
              const usedIds = entries.filter((_, ii) => ii !== i).map(ee => ee.player_id).filter(Boolean);
              return (
                <div key={e.player_id || `entry-${i}`} className="flex items-center gap-2 flex-wrap border border-border rounded-lg p-3">
                  <div className="flex-1 min-w-[180px] space-y-1">
                    <Label className="text-xs">Jogador</Label>
                    <Popover open={openPopovers[i] || false} onOpenChange={(open) => setOpenPopovers(prev => ({ ...prev, [i]: open }))}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                          {selectedPlayer ? (selectedPlayer.nickname || selectedPlayer.name) : "Selecionar jogador..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar jogador..." />
                          <CommandList>
                            <CommandEmpty>Nenhum jogador encontrado.</CommandEmpty>
                            <CommandGroup>
                              {allPlayers.filter(p => !usedIds.includes(p.id)).map(p => (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.nickname || ''} ${p.name}`}
                                  onSelect={() => {
                                    updateEntry(i, 'player_id', p.id);
                                    setOpenPopovers(prev => ({ ...prev, [i]: false }));
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${e.player_id === p.id ? 'opacity-100' : 'opacity-0'}`} />
                                  {p.nickname || p.name}
                                  {p.nickname && <span className="ml-1 text-xs text-muted-foreground">({p.name})</span>}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="w-[80px] space-y-1">
                    <Label className="text-xs">Posição</Label>
                    <Input type="number" min={1} value={e.seat_position} onChange={ev => updateEntry(i, 'seat_position', parseInt(ev.target.value) || 1)} />
                  </div>
                  {gameFactions.length > 0 ? (
                    <div className="w-[120px] space-y-1">
                      <Label className="text-xs">Facção</Label>
                      <Select value={e.faction || "none"} onValueChange={v => updateEntry(i, 'faction', v === "none" ? "" : v)}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
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
              );
            })}
            <Button variant="outline" size="sm" onClick={addEntry}>
              <UserPlus className="h-4 w-4 mr-1" /> Adicionar Jogador
            </Button>
            {playerCountMessage() && (
              <p className="text-sm text-destructive">{playerCountMessage()}</p>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              <Button variant="gold" onClick={() => {
                // Filter out empty entries before proceeding
                const filledEntries = entries.filter(e => e.player_id);
                if (filledEntries.length > 0) setEntries(filledEntries);
                setStep(3);
              }} disabled={!playerCountValid()}>
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
              {isBotC && selectedScriptId && <p><span className="text-muted-foreground">Script:</span> {bloodScripts.find(s => s.id === selectedScriptId)?.name}</p>}
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
    </div>
  );
};

export default NewMatchFlow;
