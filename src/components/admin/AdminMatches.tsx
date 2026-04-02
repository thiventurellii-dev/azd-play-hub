import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNotification } from '@/components/NotificationDialog';
import { Plus, Trash2, UserPlus, Upload, Image, Pencil, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface Season { id: string; name: string; }
interface Game { id: string; name: string; }
interface Player { id: string; name: string; nickname?: string; }
interface MatchResult { player_id: string; position: number; score: number; is_first_player: boolean; }
interface MatchRecord {
  id: string;
  played_at: string;
  duration_minutes: number | null;
  image_url: string | null;
  first_player_id: string | null;
  season_id: string;
  game_id: string;
  season: { name: string };
  game: { name: string };
  results: { player_id: string; player_name: string; position: number; score: number; mmr_before: number; mmr_change: number; mmr_after: number; is_first: boolean }[];
}

const AdminMatches = () => {
  const { notify } = useNotification();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [seasonGames, setSeasonGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [gameId, setGameId] = useState('');
  const [duration, setDuration] = useState('');
  const [playedDate, setPlayedDate] = useState('');
  const [playedTime, setPlayedTime] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [results, setResults] = useState<MatchResult[]>([{ player_id: '', position: 1, score: 0, is_first_player: false }]);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<MatchRecord[]>([]);

  const [filterSeason, setFilterSeason] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchRecord | null>(null);
  const [editForm, setEditForm] = useState({ played_date: '', played_time: '', duration: '', season_id: '', game_id: '' });
  const [editResults, setEditResults] = useState<MatchResult[]>([]);

  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchBase = async () => {
      const [s, g, p] = await Promise.all([
        supabase.from('seasons').select('id, name').order('start_date', { ascending: false }),
        supabase.from('games').select('id, name').order('name'),
        supabase.from('profiles').select('id, name, nickname').order('name'),
      ]);
      setSeasons(s.data || []);
      setGames(g.data || []);
      setPlayers(p.data || []);
    };
    fetchBase();
    fetchMatches();
  }, []);

  useEffect(() => {
    if (!seasonId) { setSeasonGames([]); return; }
    const fetchSeasonGames = async () => {
      const { data } = await supabase.from('season_games').select('game_id').eq('season_id', seasonId);
      const gameIds = (data || []).map(sg => sg.game_id);
      setSeasonGames(gameIds.length === 0 ? games : games.filter(g => gameIds.includes(g.id)));
    };
    fetchSeasonGames();
  }, [seasonId, games]);

  const fetchMatches = async () => {
    const { data: matchData } = await supabase
      .from('matches')
      .select('id, played_at, duration_minutes, image_url, first_player_id, season_id, game_id')
      .order('played_at', { ascending: false })
      .limit(100);

    if (!matchData || matchData.length === 0) { setMatches([]); return; }

    const seasonIds = [...new Set(matchData.map(m => m.season_id))];
    const gameIds = [...new Set(matchData.map(m => m.game_id))];
    const matchIds = matchData.map(m => m.id);

    const [seasonsRes, gamesRes, resultsRes] = await Promise.all([
      supabase.from('seasons').select('id, name').in('id', seasonIds),
      supabase.from('games').select('id, name').in('id', gameIds),
      supabase.from('match_results').select('match_id, player_id, position, score, mmr_before, mmr_change, mmr_after').in('match_id', matchIds),
    ]);

    const seasonMap: Record<string, string> = {};
    for (const s of (seasonsRes.data || [])) seasonMap[s.id] = s.name;
    const gameMap: Record<string, string> = {};
    for (const g of (gamesRes.data || [])) gameMap[g.id] = g.name;

    const playerIds = [...new Set((resultsRes.data || []).map(r => r.player_id))];
    const { data: profilesData } = await supabase.from('profiles').select('id, name, nickname').in('id', playerIds);
    const playerMap: Record<string, string> = {};
    for (const p of (profilesData || [])) playerMap[p.id] = p.nickname || p.name;

    setMatches(matchData.map(m => ({
      id: m.id,
      played_at: m.played_at,
      duration_minutes: m.duration_minutes,
      image_url: m.image_url,
      first_player_id: m.first_player_id || null,
      season_id: m.season_id,
      game_id: m.game_id,
      season: { name: seasonMap[m.season_id] || '?' },
      game: { name: gameMap[m.game_id] || '?' },
      results: (resultsRes.data || [])
        .filter(r => r.match_id === m.id)
        .sort((a, b) => a.position - b.position)
        .map(r => ({
          player_id: r.player_id,
          player_name: playerMap[r.player_id] || '?',
          position: r.position,
          score: r.score || 0,
          mmr_before: r.mmr_before || 1000,
          mmr_change: r.mmr_change || 0,
          mmr_after: r.mmr_after || 1000,
          is_first: r.player_id === m.first_player_id,
        })),
    })));
  };

  const addResult = () => setResults([...results, { player_id: '', position: results.length + 1, score: 0, is_first_player: false }]);
  const updateResult = (i: number, field: keyof MatchResult, value: any) => {
    const updated = [...results];
    if (field === 'is_first_player' && value === true) {
      updated.forEach((r, idx) => { r.is_first_player = idx === i; });
    } else {
      (updated[i] as any)[field] = value;
    }
    setResults(updated);
  };
  const removeResult = (i: number) => setResults(results.filter((_, idx) => idx !== i));

  const calculateElo = (results: MatchResult[], mmrMap: Record<string, number>) => {
    const K = 50;
    const n = results.length;
    const changes: Record<string, number> = {};
    for (const r of results) changes[r.player_id] = 0;

    // Passo 1: ELO pairwise com K=50
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

    // Passo 2: Bônus fixo por posição — bonus = 5 * (N - posição)
    for (const r of results) {
      const bonus = 5 * (n - r.position);
      changes[r.player_id] += bonus;
    }

    return Object.fromEntries(Object.entries(changes).map(([id, change]) => [id, parseFloat(change.toFixed(2))]));
  };

  const handleSubmit = async () => {
    if (!seasonId || !gameId || !playedDate || !playedTime || results.some(r => !r.player_id)) {
      return notify('error', 'Preencha Season, Jogo, Data/Hora e todos os jogadores');
    }
    setSaving(true);
    try {
      const playerIds = results.map(r => r.player_id);
      const firstPlayerId = results.find(r => r.is_first_player)?.player_id || null;

      const { data: mmrData } = await supabase
        .from('mmr_ratings')
        .select('player_id, current_mmr, games_played, wins, game_id')
        .eq('season_id', seasonId)
        .eq('game_id', gameId)
        .in('player_id', playerIds);

      const mmrMap: Record<string, number> = {};
      const gpMap: Record<string, number> = {};
      const winsMap: Record<string, number> = {};
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

      const eloChanges = calculateElo(results, mmrMap);

      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `${seasonId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('match-images').upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('match-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .insert({
          season_id: seasonId, game_id: gameId,
          duration_minutes: parseInt(duration) || null,
          played_at: new Date(`${playedDate}T${playedTime}`).toISOString(),
          image_url: imageUrl, first_player_id: firstPlayerId,
        })
        .select().single();
      if (matchErr) throw matchErr;

      const matchResults = results.map(r => ({
        match_id: match.id, player_id: r.player_id, position: r.position, score: r.score,
        mmr_before: mmrMap[r.player_id], mmr_change: eloChanges[r.player_id],
        mmr_after: mmrMap[r.player_id] + eloChanges[r.player_id],
      }));
      const { error: resErr } = await supabase.from('match_results').insert(matchResults);
      if (resErr) throw resErr;

      for (const r of results) {
        const isWin = r.position === 1;
        await supabase.from('mmr_ratings').update({
          current_mmr: mmrMap[r.player_id] + eloChanges[r.player_id],
          games_played: gpMap[r.player_id] + 1,
          wins: winsMap[r.player_id] + (isWin ? 1 : 0),
          updated_at: new Date().toISOString(),
        }).eq('player_id', r.player_id).eq('season_id', seasonId).eq('game_id', gameId);
      }

      notify('success', 'Partida registrada com sucesso!');
      setResults([{ player_id: '', position: 1, score: 0, is_first_player: false }]);
      setDuration(''); setPlayedDate(''); setPlayedTime(''); setImageFile(null);
      fetchMatches();
    } catch (err: any) {
      notify('error', err.message || 'Erro ao registrar partida');
    } finally {
      setSaving(false);
    }
  };

  const openEditMatch = (m: MatchRecord) => {
    setEditingMatch(m);
    const d = new Date(m.played_at);
    setEditForm({
      played_date: d.toISOString().split('T')[0],
      played_time: d.toTimeString().slice(0, 5),
      duration: m.duration_minutes ? String(m.duration_minutes) : '',
      season_id: m.season_id,
      game_id: m.game_id,
    });
    setEditResults(m.results.map(r => ({
      player_id: r.player_id, position: r.position, score: r.score, is_first_player: r.is_first,
    })));
    setEditDialogOpen(true);
  };

  const handleEditMatchSave = async () => {
    if (!editingMatch) return;
    const { error } = await supabase.from('matches').update({
      season_id: editForm.season_id,
      game_id: editForm.game_id,
      duration_minutes: parseInt(editForm.duration) || null,
      played_at: new Date(`${editForm.played_date}T${editForm.played_time}`).toISOString(),
    }).eq('id', editingMatch.id);
    if (error) return notify('error', error.message);

    for (const r of editResults) {
      await supabase.from('match_results').update({
        position: r.position, score: r.score,
      }).eq('match_id', editingMatch.id).eq('player_id', r.player_id);
    }

    const firstPlayer = editResults.find(r => r.is_first_player);
    if (firstPlayer) {
      await supabase.from('matches').update({ first_player_id: firstPlayer.player_id }).eq('id', editingMatch.id);
    }

    notify('success', 'Partida atualizada!');
    setEditDialogOpen(false);
    fetchMatches();
  };

  const filteredMatches = matches.filter(m => {
    if (filterSeason !== 'all' && m.season_id !== filterSeason) return false;
    if (filterDate && !m.played_at.startsWith(filterDate)) return false;
    return true;
  });

  const groupedMatches: Record<string, MatchRecord[]> = {};
  for (const m of filteredMatches) {
    const key = m.season.name;
    if (!groupedMatches[key]) groupedMatches[key] = [];
    groupedMatches[key].push(m);
  }

  const toggleSeasonExpanded = (name: string) => {
    setExpandedSeasons(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Registrar Partida</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Season *</Label>
              <Select value={seasonId} onValueChange={v => { setSeasonId(v); setGameId(''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a season" /></SelectTrigger>
                <SelectContent>
                  {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jogo *</Label>
              <Select value={gameId} onValueChange={setGameId} disabled={!seasonId}>
                <SelectTrigger><SelectValue placeholder={seasonId ? 'Selecione o jogo' : 'Selecione a season primeiro'} /></SelectTrigger>
                <SelectContent>
                  {seasonGames.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data da Partida *</Label>
              <Input type="date" value={playedDate} onChange={e => setPlayedDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Hora da Partida *</Label>
              <Input type="time" value={playedTime} onChange={e => setPlayedTime(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Duração (min)</Label>
            <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="120" className="max-w-[200px]" />
          </div>

          <div className="space-y-2">
            <Label>Foto da Partida (opcional)</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{imageFile ? imageFile.name : 'Anexar imagem'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
              </label>
              {imageFile && <Button variant="ghost" size="sm" onClick={() => setImageFile(null)}>Remover</Button>}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Resultados dos Jogadores *</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Jogador</TableHead>
                  <TableHead className="w-[15%]">Posição</TableHead>
                  <TableHead className="w-[15%]">Pontuação</TableHead>
                  <TableHead className="w-[20%]">Primeiro a Jogar</TableHead>
                  <TableHead className="w-[20%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Select value={r.player_id} onValueChange={v => updateResult(i, 'player_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Jogador" /></SelectTrigger>
                        <SelectContent>
                          {players.map(p => (
                            <SelectItem key={p.id} value={p.id} disabled={results.some((rr, ii) => ii !== i && rr.player_id === p.id)}>
                              {p.nickname || p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={1} value={r.position} onChange={e => updateResult(i, 'position', parseInt(e.target.value) || 1)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={r.score} onChange={e => updateResult(i, 'score', parseInt(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={r.is_first_player} onCheckedChange={(checked) => updateResult(i, 'is_first_player', !!checked)} />
                        <span className="text-xs text-muted-foreground">1º a jogar</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {results.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeResult(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" onClick={addResult}>
              <UserPlus className="h-4 w-4 mr-1" /> Adicionar Jogador
            </Button>
          </div>

          <Button variant="gold" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar Partida'}
          </Button>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <Select value={filterSeason} onValueChange={setFilterSeason}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por Season" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Seasons</SelectItem>
                {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-[180px]" placeholder="Filtrar por data" />
            {(filterSeason !== 'all' || filterDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterSeason('all'); setFilterDate(''); }}>Limpar</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grouped matches - collapsible, default collapsed */}
      {Object.entries(groupedMatches).map(([seasonName, seasonMatches]) => {
        const isOpen = expandedSeasons[seasonName] || false;
        return (
          <Card key={seasonName} className="bg-card border-border">
            <CardHeader className="cursor-pointer" onClick={() => toggleSeasonExpanded(seasonName)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{seasonName} ({seasonMatches.length} partidas)</CardTitle>
                {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </CardHeader>
            {isOpen && (
              <CardContent className="space-y-4">
                {seasonMatches.map(m => (
                  <div key={m.id} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{m.game.name}</Badge>
                        {m.duration_minutes && <span className="text-xs text-muted-foreground">{m.duration_minutes} min</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditMatch(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {m.image_url && (
                          <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <Image className="h-4 w-4" />
                          </a>
                        )}
                        <span className="text-xs text-muted-foreground">{new Date(m.played_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pos.</TableHead>
                          <TableHead>Jogador</TableHead>
                          <TableHead>Pontos</TableHead>
                          <TableHead>MMR Antes</TableHead>
                          <TableHead>Variação</TableHead>
                          <TableHead>MMR Depois</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {m.results.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Badge variant={r.position === 1 ? 'default' : 'secondary'} className={r.position === 1 ? 'bg-gold text-black' : ''}>
                                {r.position}º
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {r.player_name}
                              {r.is_first && <Badge variant="outline" className="ml-2 text-xs border-gold/50 text-gold">First</Badge>}
                            </TableCell>
                            <TableCell>{r.score}</TableCell>
                            <TableCell>{r.mmr_before}</TableCell>
                            <TableCell>
                              <span className={r.mmr_change >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {r.mmr_change >= 0 ? '+' : ''}{r.mmr_change}
                              </span>
                            </TableCell>
                            <TableCell className="font-semibold">{r.mmr_after}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {filteredMatches.length === 0 && matches.length > 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhuma partida encontrada com os filtros selecionados.</p>
      )}

      {/* Edit Match Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Partida</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Season</Label>
                <Select value={editForm.season_id} onValueChange={v => setEditForm({ ...editForm, season_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jogo</Label>
                <Select value={editForm.game_id} onValueChange={v => setEditForm({ ...editForm, game_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={editForm.played_date} onChange={e => setEditForm({ ...editForm, played_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={editForm.played_time} onChange={e => setEditForm({ ...editForm, played_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" value={editForm.duration} onChange={e => setEditForm({ ...editForm, duration: e.target.value })} />
            </div>

            <Label>Resultados</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jogador</TableHead>
                  <TableHead className="w-[80px]">Posição</TableHead>
                  <TableHead className="w-[80px]">Pontuação</TableHead>
                  <TableHead className="w-[100px]">Primeiro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editResults.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm truncate">
                      {players.find(p => p.id === r.player_id)?.nickname || players.find(p => p.id === r.player_id)?.name || '?'}
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={1} value={r.position} onChange={e => {
                        const updated = [...editResults];
                        updated[i].position = parseInt(e.target.value) || 1;
                        setEditResults(updated);
                      }} className="w-[70px]" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={r.score} onChange={e => {
                        const updated = [...editResults];
                        updated[i].score = parseInt(e.target.value) || 0;
                        setEditResults(updated);
                      }} className="w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Checkbox checked={r.is_first_player} onCheckedChange={(checked) => {
                          const updated = [...editResults];
                          updated.forEach((rr, idx) => { rr.is_first_player = idx === i && !!checked; });
                          setEditResults(updated);
                        }} />
                        <span className="text-xs">1º</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button variant="gold" onClick={handleEditMatchSave} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMatches;
