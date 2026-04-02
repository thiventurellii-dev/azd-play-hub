import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNotification } from '@/components/NotificationDialog';
import { Plus, Trash2, Gamepad2, ChevronDown, ChevronUp, Trophy, Pencil } from 'lucide-react';

interface Season {
  id: string; name: string; description: string; start_date: string; end_date: string; status: string;
  prize_1st: number; prize_2nd: number; prize_3rd: number; prize_4th_6th: number; prize_7th_10th: number;
  type: 'boardgame' | 'blood';
}
interface Game { id: string; name: string; }
interface BloodScript { id: string; name: string; }

const statusLabels: Record<string, string> = { upcoming: 'Em breve', active: 'Ativa', finished: 'Finalizada' };

const AdminSeasons = () => {
  const { notify } = useNotification();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [seasonGamesMap, setSeasonGamesMap] = useState<Record<string, string[]>>({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prize1st, setPrize1st] = useState('');
  const [prize2nd, setPrize2nd] = useState('');
  const [prize3rd, setPrize3rd] = useState('');
  const [prize4th6th, setPrize4th6th] = useState('');
  const [prize7th10th, setPrize7th10th] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [seasonType, setSeasonType] = useState<'boardgame' | 'blood'>('boardgame');
  const [bloodScripts, setBloodScripts] = useState<BloodScript[]>([]);
  const [selectedScripts, setSelectedScripts] = useState<string[]>([]);
  const [seasonBloodScriptsMap, setSeasonBloodScriptsMap] = useState<Record<string, string[]>>({});

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', prize_1st: '', prize_2nd: '', prize_3rd: '', prize_4th_6th: '', prize_7th_10th: '', start_date: '', end_date: '', status: '' });
  const [editGamesOpen, setEditGamesOpen] = useState(false);

  const fetchData = async () => {
    const [seasonsRes, gamesRes, sgRes, bsRes, sbsRes] = await Promise.all([
      supabase.from('seasons').select('*').order('start_date', { ascending: false }),
      supabase.from('games').select('id, name').order('name'),
      supabase.from('season_games').select('season_id, game_id'),
      supabase.from('blood_scripts').select('id, name'),
      supabase.from('season_blood_scripts').select('season_id, script_id'),
    ]);
    setSeasons((seasonsRes.data || []).map(s => ({
      ...s,
      prize_1st: s.prize_1st || 0,
      prize_2nd: s.prize_2nd || 0,
      prize_3rd: s.prize_3rd || 0,
      prize_4th_6th: (s as any).prize_4th_6th || 0,
      prize_7th_10th: (s as any).prize_7th_10th || 0,
      type: (s as any).type || 'boardgame',
    })));
    setGames(gamesRes.data || []);
    setBloodScripts((bsRes.data || []) as BloodScript[]);
    const map: Record<string, string[]> = {};
    for (const sg of (sgRes.data || [])) {
      if (!map[sg.season_id]) map[sg.season_id] = [];
      map[sg.season_id].push(sg.game_id);
    }
    setSeasonGamesMap(map);
    const bsMap: Record<string, string[]> = {};
    for (const sbs of ((sbsRes.data || []) as any[])) {
      if (!bsMap[sbs.season_id]) bsMap[sbs.season_id] = [];
      bsMap[sbs.season_id].push(sbs.script_id);
    }
    setSeasonBloodScriptsMap(bsMap);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!name || !startDate || !endDate) return notify('error', 'Preencha todos os campos obrigatórios');
    const { data, error } = await supabase
      .from('seasons')
      .insert({
        name, description, start_date: startDate, end_date: endDate, status,
        prize_1st: parseInt(prize1st) || 0,
        prize_2nd: parseInt(prize2nd) || 0,
        prize_3rd: parseInt(prize3rd) || 0,
        prize_4th_6th: parseInt(prize4th6th) || 0,
        prize_7th_10th: parseInt(prize7th10th) || 0,
        type: seasonType,
      } as any)
      .select().single();
    if (error) return notify('error', error.message);
    if (seasonType === 'boardgame' && selectedGames.length > 0) {
      await supabase.from('season_games').insert(selectedGames.map(gid => ({ season_id: data.id, game_id: gid })));
    }
    if (seasonType === 'blood' && selectedScripts.length > 0) {
      await supabase.from('season_blood_scripts').insert(selectedScripts.map(sid => ({ season_id: data.id, script_id: sid })) as any);
    }
    notify('success', 'Season criada!');
    setName(''); setDescription(''); setPrize1st(''); setPrize2nd(''); setPrize3rd(''); setPrize4th6th(''); setPrize7th10th('');
    setStartDate(''); setEndDate(''); setSelectedGames([]); setSelectedScripts([]);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('season_games').delete().eq('season_id', id);
    const { error } = await supabase.from('seasons').delete().eq('id', id);
    if (error) return notify('error', error.message);
    notify('success', 'Season removida');
    fetchData();
  };

  const openEdit = (s: Season) => {
    setEditingSeason(s);
    setEditForm({
      name: s.name,
      description: s.description || '',
      prize_1st: String(s.prize_1st || 0),
      prize_2nd: String(s.prize_2nd || 0),
      prize_3rd: String(s.prize_3rd || 0),
      prize_4th_6th: String(s.prize_4th_6th || 0),
      prize_7th_10th: String(s.prize_7th_10th || 0),
      start_date: s.start_date,
      end_date: s.end_date,
      status: s.status,
    });
    setEditGamesOpen(false);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingSeason) return;
    const { error } = await supabase.from('seasons').update({
      name: editForm.name,
      description: editForm.description,
      prize_1st: parseInt(editForm.prize_1st) || 0,
      prize_2nd: parseInt(editForm.prize_2nd) || 0,
      prize_3rd: parseInt(editForm.prize_3rd) || 0,
      prize_4th_6th: parseInt(editForm.prize_4th_6th) || 0,
      prize_7th_10th: parseInt(editForm.prize_7th_10th) || 0,
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      status: editForm.status,
    } as any).eq('id', editingSeason.id);
    if (error) return notify('error', error.message);
    notify('success', 'Season atualizada!');
    setEditDialogOpen(false);
    fetchData();
  };

  const toggleGameInSeason = async (seasonId: string, gameId: string, isCurrently: boolean) => {
    if (isCurrently) {
      const { count } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .eq('season_id', seasonId)
        .eq('game_id', gameId);
      if (count && count > 0) {
        return notify('error', `Não é possível remover: existem ${count} partida(s) registrada(s) para este jogo nesta season.`);
      }
      await supabase.from('season_games').delete().eq('season_id', seasonId).eq('game_id', gameId);
    } else {
      await supabase.from('season_games').insert({ season_id: seasonId, game_id: gameId });
    }
    fetchData();
  };

  const toggleScriptInSeason = async (seasonId: string, scriptId: string, isCurrently: boolean) => {
    if (isCurrently) {
      const { count } = await supabase
        .from('blood_matches')
        .select('id', { count: 'exact', head: true })
        .eq('season_id', seasonId)
        .eq('script_id', scriptId);
      if (count && count > 0) {
        return notify('error', `Não é possível remover: existem ${count} partida(s) registrada(s) para este script nesta season.`);
      }
      await supabase.from('season_blood_scripts').delete().eq('season_id', seasonId).eq('script_id', scriptId);
    } else {
      await supabase.from('season_blood_scripts').insert({ season_id: seasonId, script_id: scriptId } as any);
    }
    fetchData();
  };

  const toggleNewGameSelection = (gameId: string) => {
    setSelectedGames(prev => prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]);
  };

  const totalPrize = (s: Season) => (s.prize_1st || 0) + (s.prize_2nd || 0) + (s.prize_3rd || 0) + (s.prize_4th_6th || 0) + (s.prize_7th_10th || 0);

  const isBloodType = (s: Season) => s.type === 'blood';

  const renderPrizeFields = (isBlood: boolean, values: { p1: string; p2: string; p3: string; p4: string; p5: string }, onChange: (field: string, val: string) => void) => {
    if (isBlood) {
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-gold">🥇 1º a 3º Lugar</Label>
            <Input type="number" value={values.p1} onChange={e => onChange('p1', e.target.value)} placeholder="300" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">🥈 4º a 6º Lugar</Label>
            <Input type="number" value={values.p4} onChange={e => onChange('p4', e.target.value)} placeholder="200" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">🥉 7º a 10º Lugar</Label>
            <Input type="number" value={values.p5} onChange={e => onChange('p5', e.target.value)} placeholder="100" />
          </div>
        </div>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs text-gold">🥇 1º Lugar</Label>
          <Input type="number" value={values.p1} onChange={e => onChange('p1', e.target.value)} placeholder="300" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">🥈 2º Lugar</Label>
          <Input type="number" value={values.p2} onChange={e => onChange('p2', e.target.value)} placeholder="200" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">🥉 3º Lugar</Label>
          <Input type="number" value={values.p3} onChange={e => onChange('p3', e.target.value)} placeholder="100" />
        </div>
      </div>
    );
  };

  const renderPrizeDisplay = (s: Season) => {
    const total = totalPrize(s);
    if (total <= 0) return null;
    if (isBloodType(s)) {
      return (
        <div>
          <Label className="text-sm text-muted-foreground">Premiação:</Label>
          <div className="flex gap-4 mt-1 text-sm flex-wrap">
            {s.prize_1st > 0 && <span>🥇 1º-3º: <strong className="text-gold">R$ {s.prize_1st}</strong></span>}
            {s.prize_4th_6th > 0 && <span>🥈 4º-6º: <strong>R$ {s.prize_4th_6th}</strong></span>}
            {s.prize_7th_10th > 0 && <span>🥉 7º-10º: <strong>R$ {s.prize_7th_10th}</strong></span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Total: R$ {total}</p>
        </div>
      );
    }
    return (
      <div>
        <Label className="text-sm text-muted-foreground">Premiação:</Label>
        <div className="flex gap-4 mt-1 text-sm flex-wrap">
          {s.prize_1st > 0 && <span>🥇 1º: <strong className="text-gold">R$ {s.prize_1st}</strong></span>}
          {s.prize_2nd > 0 && <span>🥈 2º: <strong>R$ {s.prize_2nd}</strong></span>}
          {s.prize_3rd > 0 && <span>🥉 3º: <strong>R$ {s.prize_3rd}</strong></span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Total: R$ {total}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Nova Season</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Season 1" />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={seasonType} onValueChange={v => setSeasonType(v as 'boardgame' | 'blood')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boardgame">🎲 Boardgame</SelectItem>
                  <SelectItem value="blood">🩸 Blood on the Clocktower</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Em breve</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="finished">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Início *</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim *</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição da season" />
          </div>

          <div className="space-y-2">
            <Label>Premiação por Colocação (R$)</Label>
            {renderPrizeFields(
              seasonType === 'blood',
              { p1: prize1st, p2: prize2nd, p3: prize3rd, p4: prize4th6th, p5: prize7th10th },
              (field, val) => {
                if (field === 'p1') setPrize1st(val);
                if (field === 'p2') setPrize2nd(val);
                if (field === 'p3') setPrize3rd(val);
                if (field === 'p4') setPrize4th6th(val);
                if (field === 'p5') setPrize7th10th(val);
              }
            )}
          </div>

          {seasonType === 'boardgame' && (
            <Collapsible open={gamesOpen} onOpenChange={setGamesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  Jogos desta Season ({selectedGames.length})
                  {gamesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                {games.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum jogo cadastrado.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {games.map(g => (
                      <label key={g.id} className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                        <Checkbox checked={selectedGames.includes(g.id)} onCheckedChange={() => toggleNewGameSelection(g.id)} />
                        <span className="text-sm">{g.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {seasonType === 'blood' && (
            <div className="space-y-2">
              <Label>Scripts Ativos *</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {bloodScripts.map(bs => (
                  <label key={bs.id} className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <Checkbox
                      checked={selectedScripts.includes(bs.id)}
                      onCheckedChange={() => setSelectedScripts(prev => prev.includes(bs.id) ? prev.filter(id => id !== bs.id) : [...prev, bs.id])}
                    />
                    <span className="text-sm">{bs.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button variant="gold" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> Criar Season</Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {seasons.map(s => {
          const isExpanded = expandedSeason === s.id;
          const sgames = seasonGamesMap[s.id] || [];
          const sscripts = seasonBloodScriptsMap[s.id] || [];
          const total = totalPrize(s);
          return (
            <Card key={s.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{s.name}</p>
                      <Badge variant="outline" className="text-xs">{s.type === 'blood' ? '🩸 Blood' : '🎲 Boardgame'}</Badge>
                      <Badge variant="secondary" className="text-xs">{statusLabels[s.status] || s.status}</Badge>
                      {s.type === 'boardgame' && <Badge variant="outline" className="text-xs"><Gamepad2 className="h-3 w-3 mr-1" />{sgames.length} jogos</Badge>}
                      {s.type === 'blood' && <Badge variant="outline" className="text-xs">{sscripts.length} scripts</Badge>}
                      {total > 0 && <Badge variant="outline" className="text-xs border-gold/50 text-gold"><Trophy className="h-3 w-3 mr-1" />R$ {total}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.start_date} — {s.end_date}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setExpandedSeason(isExpanded ? null : s.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4">
                    {renderPrizeDisplay(s)}
                    {s.type === 'boardgame' && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Gamepad2 className="h-4 w-4" />
                            Jogos vinculados ({sgames.length})
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {games.map(g => {
                              const isLinked = sgames.includes(g.id);
                              return (
                                <label key={g.id} className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                                  <Checkbox checked={isLinked} onCheckedChange={() => toggleGameInSeason(s.id, g.id, isLinked)} />
                                  <span className="text-sm">{g.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    {s.type === 'blood' && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            🩸 Scripts vinculados ({sscripts.length})
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {bloodScripts.map(bs => {
                              const isLinked = sscripts.includes(bs.id);
                              return (
                                <label key={bs.id} className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                                  <Checkbox checked={isLinked} onCheckedChange={() => toggleScriptInSeason(s.id, bs.id, isLinked)} />
                                  <span className="text-sm">{bs.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Season</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Em breve</SelectItem>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="finished">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Premiação por Colocação (R$)</Label>
              {renderPrizeFields(
                editingSeason?.type === 'blood',
                { p1: editForm.prize_1st, p2: editForm.prize_2nd, p3: editForm.prize_3rd, p4: editForm.prize_4th_6th, p5: editForm.prize_7th_10th },
                (field, val) => {
                  if (field === 'p1') setEditForm({ ...editForm, prize_1st: val });
                  if (field === 'p2') setEditForm({ ...editForm, prize_2nd: val });
                  if (field === 'p3') setEditForm({ ...editForm, prize_3rd: val });
                  if (field === 'p4') setEditForm({ ...editForm, prize_4th_6th: val });
                  if (field === 'p5') setEditForm({ ...editForm, prize_7th_10th: val });
                }
              )}
            </div>
            {editingSeason?.type === 'boardgame' && (
              <div className="space-y-2">
                <Collapsible open={editGamesOpen} onOpenChange={setEditGamesOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4" />
                        Jogos vinculados ({editingSeason ? (seasonGamesMap[editingSeason.id] || []).length : 0})
                      </span>
                      {editGamesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {games.map(g => {
                        const isLinked = editingSeason ? (seasonGamesMap[editingSeason.id] || []).includes(g.id) : false;
                        return (
                          <label key={g.id} className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                            <Checkbox checked={isLinked} onCheckedChange={() => editingSeason && toggleGameInSeason(editingSeason.id, g.id, isLinked)} />
                            <span className="text-sm">{g.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
            <Button variant="gold" onClick={handleEditSave} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSeasons;
