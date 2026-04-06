import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNotification } from '@/components/NotificationDialog';
import { Plus, Trash2, UserPlus, ChevronDown, ChevronUp, Search, Skull, Shield, Pencil } from 'lucide-react';
import { recalculateSeasonRatings, submitBloodMatch } from '@/lib/bloodRatings';

interface Season { id: string; name: string; }
interface BloodScript { id: string; name: string; }
interface BloodCharacter { id: string; script_id: string; name: string; name_en: string; role_type: string; team: string; }
interface Player { id: string; name: string; nickname?: string; }
interface BloodPlayerEntry { player_id: string; character_id: string; team: 'good' | 'evil'; }

const AdminBloodMatches = () => {
  const { notify } = useNotification();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [scripts, setScripts] = useState<BloodScript[]>([]);
  const [characters, setCharacters] = useState<BloodCharacter[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [seasonId, setSeasonId] = useState('');
  const [scriptId, setScriptId] = useState('');
  const [playedDate, setPlayedDate] = useState('');
  const [playedTime, setPlayedTime] = useState('');
  const [duration, setDuration] = useState('');
  const [storytellerId, setStorytellerId] = useState('');
  const [winningTeam, setWinningTeam] = useState<'good' | 'evil'>('good');
  const [evilPlayers, setEvilPlayers] = useState<BloodPlayerEntry[]>([{ player_id: '', character_id: '', team: 'evil' }]);
  const [goodPlayers, setGoodPlayers] = useState<BloodPlayerEntry[]>([{ player_id: '', character_id: '', team: 'good' }]);
  const [saving, setSaving] = useState(false);

  const [matches, setMatches] = useState<any[]>([]);
  const [filterSeason, setFilterSeason] = useState('all');
  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({});

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [editSeasonId, setEditSeasonId] = useState('');
  const [editScriptId, setEditScriptId] = useState('');
  const [editPlayedDate, setEditPlayedDate] = useState('');
  const [editPlayedTime, setEditPlayedTime] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editStorytellerId, setEditStorytellerId] = useState('');
  const [editWinningTeam, setEditWinningTeam] = useState<'good' | 'evil'>('good');
  const [editEvilPlayers, setEditEvilPlayers] = useState<BloodPlayerEntry[]>([]);
  const [editGoodPlayers, setEditGoodPlayers] = useState<BloodPlayerEntry[]>([]);
  const [editVictoryConditions, setEditVictoryConditions] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      const [s, sc, ch, p] = await Promise.all([
        supabase.from('seasons').select('id, name').eq('type', 'blood' as any).neq('status', 'finished').neq('status', 'upcoming').order('start_date', { ascending: false }),
        supabase.from('blood_scripts').select('id, name'),
        supabase.from('blood_characters').select('id, script_id, name, name_en, role_type, team'),
        supabase.from('profiles').select('id, name, nickname').order('name'),
      ]);
      setSeasons((s.data || []) as Season[]);
      setScripts((sc.data || []) as BloodScript[]);
      setCharacters((ch.data || []) as BloodCharacter[]);
      setPlayers((p.data || []) as Player[]);
    };
    fetchBase();
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const { data: matchData } = await supabase
      .from('blood_matches')
      .select('*')
      .order('played_at', { ascending: false })
      .limit(100);
    if (!matchData || matchData.length === 0) { setMatches([]); return; }

    const seasonIds = [...new Set((matchData as any[]).map(m => m.season_id))];
    const scriptIds = [...new Set((matchData as any[]).map(m => m.script_id))];
    const matchIds = (matchData as any[]).map(m => m.id);

    const [seasonsRes, scriptsRes, playersRes] = await Promise.all([
      supabase.from('seasons').select('id, name').in('id', seasonIds),
      supabase.from('blood_scripts').select('id, name').in('id', scriptIds),
      supabase.from('blood_match_players').select('*').in('match_id', matchIds),
    ]);

    const seasonMap: Record<string, string> = {};
    for (const s of (seasonsRes.data || [])) seasonMap[s.id] = s.name;
    const scriptMap: Record<string, string> = {};
    for (const s of (scriptsRes.data || [])) scriptMap[s.id] = s.name;

    const playerIds = [...new Set([
      ...(matchData as any[]).map(m => m.storyteller_player_id),
      ...((playersRes.data || []) as any[]).map(p => p.player_id),
    ])];
    const { data: profilesData } = await supabase.from('profiles').select('id, name, nickname').in('id', playerIds);
    const profileMap: Record<string, string> = {};
    for (const p of (profilesData || [])) profileMap[p.id] = (p as any).nickname || p.name;

    const charIds = [...new Set(((playersRes.data || []) as any[]).map(p => p.character_id))];
    const { data: charsData } = charIds.length > 0
      ? await supabase.from('blood_characters').select('id, name').in('id', charIds)
      : { data: [] };
    const charMap: Record<string, string> = {};
    for (const c of (charsData || [])) charMap[(c as any).id] = (c as any).name;

    setMatches((matchData as any[]).map(m => ({
      ...m,
      season_name: seasonMap[m.season_id] || '?',
      script_name: scriptMap[m.script_id] || '?',
      storyteller_name: profileMap[m.storyteller_player_id] || '?',
      players: ((playersRes.data || []) as any[])
        .filter(p => p.match_id === m.id)
        .map(p => ({
          ...p,
          player_name: profileMap[p.player_id] || '?',
          character_name: charMap[p.character_id] || '?',
        })),
    })));
  };

  const scriptCharacters = characters.filter(c => c.script_id === scriptId);
  const evilChars = scriptCharacters.filter(c => c.team === 'evil');
  const goodChars = scriptCharacters.filter(c => c.team === 'good');

  const editScriptCharacters = characters.filter(c => c.script_id === editScriptId);
  const editEvilChars = editScriptCharacters.filter(c => c.team === 'evil');
  const editGoodChars = editScriptCharacters.filter(c => c.team === 'good');

  const allSelectedPlayerIds = [
    storytellerId,
    ...evilPlayers.map(p => p.player_id),
    ...goodPlayers.map(p => p.player_id),
  ].filter(Boolean);

  const editAllSelectedPlayerIds = [
    editStorytellerId,
    ...editEvilPlayers.map(p => p.player_id),
    ...editGoodPlayers.map(p => p.player_id),
  ].filter(Boolean);

  const addPlayer = (team: 'good' | 'evil') => {
    if (team === 'evil') setEvilPlayers([...evilPlayers, { player_id: '', character_id: '', team: 'evil' }]);
    else setGoodPlayers([...goodPlayers, { player_id: '', character_id: '', team: 'good' }]);
  };
  const removePlayer = (team: 'good' | 'evil', idx: number) => {
    if (team === 'evil') setEvilPlayers(evilPlayers.filter((_, i) => i !== idx));
    else setGoodPlayers(goodPlayers.filter((_, i) => i !== idx));
  };
  const updatePlayer = (team: 'good' | 'evil', idx: number, field: string, value: string) => {
    if (team === 'evil') {
      const updated = [...evilPlayers];
      (updated[idx] as any)[field] = value;
      setEvilPlayers(updated);
    } else {
      const updated = [...goodPlayers];
      (updated[idx] as any)[field] = value;
      setGoodPlayers(updated);
    }
  };

  const addEditPlayer = (team: 'good' | 'evil') => {
    if (team === 'evil') setEditEvilPlayers([...editEvilPlayers, { player_id: '', character_id: '', team: 'evil' }]);
    else setEditGoodPlayers([...editGoodPlayers, { player_id: '', character_id: '', team: 'good' }]);
  };
  const removeEditPlayer = (team: 'good' | 'evil', idx: number) => {
    if (team === 'evil') setEditEvilPlayers(editEvilPlayers.filter((_, i) => i !== idx));
    else setEditGoodPlayers(editGoodPlayers.filter((_, i) => i !== idx));
  };
  const updateEditPlayer = (team: 'good' | 'evil', idx: number, field: string, value: string) => {
    if (team === 'evil') {
      const updated = [...editEvilPlayers];
      (updated[idx] as any)[field] = value;
      setEditEvilPlayers(updated);
    } else {
      const updated = [...editGoodPlayers];
      (updated[idx] as any)[field] = value;
      setEditGoodPlayers(updated);
    }
  };

  const handleSubmit = async () => {
    if (!seasonId || !scriptId || !playedDate || !playedTime || !storytellerId || !winningTeam) {
      return notify('error', 'Preencha todos os campos obrigatórios');
    }
    const allPlayers = [...evilPlayers, ...goodPlayers];
    if (allPlayers.some(p => !p.player_id || !p.character_id)) {
      return notify('error', 'Preencha jogador e personagem para todos os participantes');
    }

    setSaving(true);
    try {
      await submitBloodMatch({
        seasonId,
        scriptId,
        playedAt: new Date(`${playedDate}T${playedTime}`).toISOString(),
        durationMinutes: parseInt(duration) || null,
        storytellerId,
        winningTeam,
        players: allPlayers,
      });

      notify('success', 'Partida de Blood registrada!');
      setEvilPlayers([{ player_id: '', character_id: '', team: 'evil' }]);
      setGoodPlayers([{ player_id: '', character_id: '', team: 'good' }]);
      setDuration(''); setPlayedDate(''); setPlayedTime(''); setStorytellerId('');
      fetchMatches();
    } catch (err: any) {
      notify('error', err.message || 'Erro ao registrar partida');
    } finally {
      setSaving(false);
    }
  };

  // recalculateSeasonRatings and submitBloodMatch are now imported from @/lib/bloodRatings

  const openEditMatch = (m: any) => {
    setEditingMatch(m);
    setEditSeasonId(m.season_id);
    setEditScriptId(m.script_id);
    const d = new Date(m.played_at);
    setEditPlayedDate(d.toISOString().split('T')[0]);
    setEditPlayedTime(d.toTimeString().slice(0, 5));
    setEditDuration(m.duration_minutes ? String(m.duration_minutes) : '');
    setEditStorytellerId(m.storyteller_player_id);
    setEditWinningTeam(m.winning_team);
    setEditEvilPlayers(
      m.players.filter((p: any) => p.team === 'evil').map((p: any) => ({ player_id: p.player_id, character_id: p.character_id, team: 'evil' as const }))
    );
    setEditGoodPlayers(
      m.players.filter((p: any) => p.team === 'good').map((p: any) => ({ player_id: p.player_id, character_id: p.character_id, team: 'good' as const }))
    );
    setEditVictoryConditions(Array.isArray(m.victory_conditions) ? [...m.victory_conditions] : []);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingMatch) return;
    if (!editSeasonId || !editScriptId || !editPlayedDate || !editPlayedTime || !editStorytellerId) {
      return notify('error', 'Preencha todos os campos obrigatórios');
    }
    const allPlayers = [...editEvilPlayers, ...editGoodPlayers];
    if (allPlayers.some(p => !p.player_id || !p.character_id)) {
      return notify('error', 'Preencha jogador e personagem para todos os participantes');
    }

    setEditSaving(true);
    try {
      const { error: matchErr } = await supabase.from('blood_matches').update({
        season_id: editSeasonId,
        script_id: editScriptId,
        played_at: new Date(`${editPlayedDate}T${editPlayedTime}`).toISOString(),
        duration_minutes: parseInt(editDuration) || null,
        storyteller_player_id: editStorytellerId,
        winning_team: editWinningTeam,
        victory_conditions: editVictoryConditions,
      } as any).eq('id', editingMatch.id);
      if (matchErr) throw matchErr;

      // Delete old players and insert new
      await supabase.from('blood_match_players').delete().eq('match_id', editingMatch.id);
      const matchPlayers = allPlayers.map(p => ({
        match_id: editingMatch.id,
        player_id: p.player_id,
        character_id: p.character_id,
        team: p.team,
      }));
      await supabase.from('blood_match_players').insert(matchPlayers as any);

      // Recalculate ratings for the season
      await recalculateSeasonRatings(editSeasonId);

      notify('success', 'Partida atualizada!');
      setEditDialogOpen(false);
      fetchMatches();
    } catch (err: any) {
      notify('error', err.message || 'Erro ao atualizar partida');
    } finally {
      setEditSaving(false);
    }
  };

  const filteredMatches = filterSeason === 'all' ? matches : matches.filter(m => m.season_id === filterSeason);
  const groupedMatches: Record<string, any[]> = {};
  for (const m of filteredMatches) {
    const key = m.season_name;
    if (!groupedMatches[key]) groupedMatches[key] = [];
    groupedMatches[key].push(m);
  }

  const renderPlayerSelectors = (
    team: 'evil' | 'good',
    playersList: BloodPlayerEntry[],
    chars: BloodCharacter[],
    allSelected: string[],
    onAdd: (t: 'evil' | 'good') => void,
    onRemove: (t: 'evil' | 'good', i: number) => void,
    onUpdate: (t: 'evil' | 'good', i: number, f: string, v: string) => void,
  ) => {
    const isEvil = team === 'evil';
    return (
      <div className={`space-y-3 p-4 rounded-lg border ${isEvil ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
        <div className="flex items-center gap-2">
          {isEvil ? <Skull className="h-5 w-5 text-red-400" /> : <Shield className="h-5 w-5 text-blue-400" />}
          <Label className={`${isEvil ? 'text-red-400' : 'text-blue-400'} font-semibold`}>{isEvil ? 'Time Maligno' : 'Time Benigno'}</Label>
        </div>
        {playersList.map((ep, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
            <Select value={ep.player_id} onValueChange={v => onUpdate(team, i, 'player_id', v)}>
              <SelectTrigger><SelectValue placeholder="Jogador" /></SelectTrigger>
              <SelectContent>
                {players.map(p => (
                  <SelectItem key={p.id} value={p.id} disabled={allSelected.includes(p.id) && p.id !== ep.player_id}>
                    {p.nickname || p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ep.character_id} onValueChange={v => onUpdate(team, i, 'character_id', v)}>
              <SelectTrigger><SelectValue placeholder="Personagem" /></SelectTrigger>
              <SelectContent>
                {chars.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.role_type})</SelectItem>)}
              </SelectContent>
            </Select>
            {playersList.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => onRemove(team, i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onAdd(team)}>
          <UserPlus className="h-4 w-4 mr-1" /> Adicionar Jogador {isEvil ? 'Maligno' : 'Benigno'}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Registrar Partida de Blood on the Clocktower</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Season *</Label>
              <Select value={seasonId} onValueChange={setSeasonId}>
                <SelectTrigger><SelectValue placeholder="Selecione a season" /></SelectTrigger>
                <SelectContent>
                  {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Script *</Label>
              <Select value={scriptId} onValueChange={v => { setScriptId(v); setEvilPlayers([{ player_id: '', character_id: '', team: 'evil' }]); setGoodPlayers([{ player_id: '', character_id: '', team: 'good' }]); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o script" /></SelectTrigger>
                <SelectContent>
                  {scripts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Storyteller *</Label>
              <Select value={storytellerId} onValueChange={setStorytellerId}>
                <SelectTrigger><SelectValue placeholder="Quem narrou?" /></SelectTrigger>
                <SelectContent>
                  {players.map(p => (
                    <SelectItem key={p.id} value={p.id} disabled={allSelectedPlayerIds.includes(p.id) && p.id !== storytellerId}>
                      {p.nickname || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={playedDate} onChange={e => setPlayedDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora *</Label>
              <Input type="time" value={playedTime} onChange={e => setPlayedTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="90" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Time Vencedor *</Label>
            <Select value={winningTeam} onValueChange={v => setWinningTeam(v as 'good' | 'evil')}>
              <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="good">🛡️ Time Benigno (Bom)</SelectItem>
                <SelectItem value="evil">💀 Time Maligno (Mal)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderPlayerSelectors('evil', evilPlayers, evilChars, allSelectedPlayerIds, addPlayer, removePlayer, updatePlayer)}
          {renderPlayerSelectors('good', goodPlayers, goodChars, allSelectedPlayerIds, addPlayer, removePlayer, updatePlayer)}

          <Button variant="gold" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar Partida de Blood'}
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
          </div>
        </CardContent>
      </Card>

      {/* Grouped matches */}
      {Object.entries(groupedMatches).map(([seasonName, seasonMatches]) => {
        const isOpen = expandedSeasons[seasonName] || false;
        return (
          <Card key={seasonName} className="bg-card border-border">
            <CardHeader className="cursor-pointer" onClick={() => setExpandedSeasons(prev => ({ ...prev, [seasonName]: !prev[seasonName] }))}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{seasonName} ({seasonMatches.length} partidas)</CardTitle>
                {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </CardHeader>
            {isOpen && (
              <CardContent className="space-y-4">
                {seasonMatches.map((m: any) => (
                  <div key={m.id} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{m.script_name}</Badge>
                        <Badge className={m.winning_team === 'evil' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}>
                          {m.winning_team === 'evil' ? '💀 Mal venceu' : '🛡️ Bem venceu'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Narrador: {m.storyteller_name}</span>
                        {m.duration_minutes && <span className="text-xs text-muted-foreground">{m.duration_minutes} min</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(m.played_at).toLocaleDateString('pt-BR')}</span>
                        <Button variant="ghost" size="icon" onClick={() => openEditMatch(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {m.players.length > 0 && (
                      <div className="grid gap-1">
                        {m.players.map((p: any, i: number) => (
                          <div key={i} className={`flex items-center gap-2 text-sm p-1.5 rounded ${p.team === 'evil' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                            <span className={p.team === 'evil' ? 'text-red-400' : 'text-blue-400'}>
                              {p.team === 'evil' ? '💀' : '🛡️'}
                            </span>
                            <span className="font-medium">{p.player_name}</span>
                            <span className="text-muted-foreground">— {p.character_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Edit Match Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Partida de Blood</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Season *</Label>
                <Select value={editSeasonId} onValueChange={setEditSeasonId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Script *</Label>
                <Select value={editScriptId} onValueChange={setEditScriptId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {scripts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Storyteller *</Label>
                <Select value={editStorytellerId} onValueChange={setEditStorytellerId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {players.map(p => (
                      <SelectItem key={p.id} value={p.id} disabled={editAllSelectedPlayerIds.includes(p.id) && p.id !== editStorytellerId}>
                        {p.nickname || p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={editPlayedDate} onChange={e => setEditPlayedDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input type="time" value={editPlayedTime} onChange={e => setEditPlayedTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Time Vencedor *</Label>
              <Select value={editWinningTeam} onValueChange={v => setEditWinningTeam(v as 'good' | 'evil')}>
                <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">🛡️ Time Benigno (Bom)</SelectItem>
                  <SelectItem value="evil">💀 Time Maligno (Mal)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderPlayerSelectors('evil', editEvilPlayers, editEvilChars, editAllSelectedPlayerIds, addEditPlayer, removeEditPlayer, updateEditPlayer)}
            {renderPlayerSelectors('good', editGoodPlayers, editGoodChars, editAllSelectedPlayerIds, addEditPlayer, removeEditPlayer, updateEditPlayer)}

            <Button variant="gold" onClick={handleEditSave} disabled={editSaving} className="w-full">
              {editSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBloodMatches;
