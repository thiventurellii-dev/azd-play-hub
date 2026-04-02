import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Gamepad2, ChevronDown, ChevronUp, Trophy, Pencil } from 'lucide-react';

interface Season {
  id: string; name: string; description: string; start_date: string; end_date: string; status: string; prize: string;
  prize_1st: number; prize_2nd: number; prize_3rd: number;
}
interface Game { id: string; name: string; }

const statusLabels: Record<string, string> = { upcoming: 'Em breve', active: 'Ativa', finished: 'Finalizada' };

const AdminSeasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [seasonGamesMap, setSeasonGamesMap] = useState<Record<string, string[]>>({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prize, setPrize] = useState('');
  const [prize1st, setPrize1st] = useState('');
  const [prize2nd, setPrize2nd] = useState('');
  const [prize3rd, setPrize3rd] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', prize: '', prize_1st: '', prize_2nd: '', prize_3rd: '', start_date: '', end_date: '', status: '' });

  const fetchData = async () => {
    const [seasonsRes, gamesRes, sgRes] = await Promise.all([
      supabase.from('seasons').select('*').order('start_date', { ascending: false }),
      supabase.from('games').select('id, name').order('name'),
      supabase.from('season_games').select('season_id, game_id'),
    ]);
    setSeasons((seasonsRes.data || []).map(s => ({
      ...s,
      prize: (s as any).prize || '',
      prize_1st: (s as any).prize_1st || 0,
      prize_2nd: (s as any).prize_2nd || 0,
      prize_3rd: (s as any).prize_3rd || 0,
    })));
    setGames(gamesRes.data || []);
    const map: Record<string, string[]> = {};
    for (const sg of (sgRes.data || [])) {
      if (!map[sg.season_id]) map[sg.season_id] = [];
      map[sg.season_id].push(sg.game_id);
    }
    setSeasonGamesMap(map);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!name || !startDate || !endDate) return toast.error('Preencha todos os campos obrigatórios');
    const { data, error } = await supabase
      .from('seasons')
      .insert({
        name, description, start_date: startDate, end_date: endDate, status, prize,
        prize_1st: parseInt(prize1st) || 0,
        prize_2nd: parseInt(prize2nd) || 0,
        prize_3rd: parseInt(prize3rd) || 0,
      } as any)
      .select().single();
    if (error) return toast.error(error.message);
    if (selectedGames.length > 0) {
      await supabase.from('season_games').insert(selectedGames.map(gid => ({ season_id: data.id, game_id: gid })));
    }
    toast.success('Season criada!');
    setName(''); setDescription(''); setPrize(''); setPrize1st(''); setPrize2nd(''); setPrize3rd(''); setStartDate(''); setEndDate(''); setSelectedGames([]);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('season_games').delete().eq('season_id', id);
    const { error } = await supabase.from('seasons').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Season removida');
    fetchData();
  };

  const openEdit = (s: Season) => {
    setEditingSeason(s);
    setEditForm({
      name: s.name,
      description: s.description || '',
      prize: s.prize || '',
      prize_1st: String(s.prize_1st || 0),
      prize_2nd: String(s.prize_2nd || 0),
      prize_3rd: String(s.prize_3rd || 0),
      start_date: s.start_date,
      end_date: s.end_date,
      status: s.status,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingSeason) return;
    const { error } = await supabase.from('seasons').update({
      name: editForm.name,
      description: editForm.description,
      prize: editForm.prize,
      prize_1st: parseInt(editForm.prize_1st) || 0,
      prize_2nd: parseInt(editForm.prize_2nd) || 0,
      prize_3rd: parseInt(editForm.prize_3rd) || 0,
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      status: editForm.status,
    } as any).eq('id', editingSeason.id);
    if (error) return toast.error(error.message);
    toast.success('Season atualizada!');
    setEditDialogOpen(false);
    fetchData();
  };

  const toggleGameInSeason = async (seasonId: string, gameId: string, isCurrently: boolean) => {
    if (isCurrently) {
      await supabase.from('season_games').delete().eq('season_id', seasonId).eq('game_id', gameId);
    } else {
      await supabase.from('season_games').insert({ season_id: seasonId, game_id: gameId });
    }
    fetchData();
  };

  const toggleNewGameSelection = (gameId: string) => {
    setSelectedGames(prev => prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]);
  };

  const totalPrize = (s: Season) => (s.prize_1st || 0) + (s.prize_2nd || 0) + (s.prize_3rd || 0);

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Nova Season</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Season 1" />
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
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs text-gold">🥇 1º Lugar</Label>
                <Input type="number" value={prize1st} onChange={e => setPrize1st(e.target.value)} placeholder="300" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">🥈 2º Lugar</Label>
                <Input type="number" value={prize2nd} onChange={e => setPrize2nd(e.target.value)} placeholder="200" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">🥉 3º Lugar</Label>
                <Input type="number" value={prize3rd} onChange={e => setPrize3rd(e.target.value)} placeholder="100" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição da Premiação (opcional)</Label>
            <Textarea value={prize} onChange={e => setPrize(e.target.value)} placeholder="Detalhes extras sobre a premiação" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Jogos desta Season</Label>
            {games.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum jogo cadastrado. Adicione jogos na aba "Jogos" primeiro.</p>
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
          </div>

          <Button variant="gold" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> Criar Season</Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {seasons.map(s => {
          const isExpanded = expandedSeason === s.id;
          const sgames = seasonGamesMap[s.id] || [];
          const total = totalPrize(s);
          return (
            <Card key={s.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{s.name}</p>
                      <Badge variant="secondary" className="text-xs">{statusLabels[s.status] || s.status}</Badge>
                      <Badge variant="outline" className="text-xs"><Gamepad2 className="h-3 w-3 mr-1" />{sgames.length} jogos</Badge>
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
                    {total > 0 && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Premiação:</Label>
                        <div className="flex gap-4 mt-1 text-sm">
                          {s.prize_1st > 0 && <span>🥇 1º: <strong className="text-gold">R$ {s.prize_1st}</strong></span>}
                          {s.prize_2nd > 0 && <span>🥈 2º: <strong>R$ {s.prize_2nd}</strong></span>}
                          {s.prize_3rd > 0 && <span>🥉 3º: <strong>R$ {s.prize_3rd}</strong></span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Total: R$ {total}</p>
                      </div>
                    )}
                    {s.prize && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Detalhes:</Label>
                        <p className="text-sm mt-1">{s.prize}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm mb-2 block">Jogos vinculados:</Label>
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
                    </div>
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
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gold">🥇 1º Lugar</Label>
                  <Input type="number" value={editForm.prize_1st} onChange={e => setEditForm({ ...editForm, prize_1st: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">🥈 2º Lugar</Label>
                  <Input type="number" value={editForm.prize_2nd} onChange={e => setEditForm({ ...editForm, prize_2nd: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">🥉 3º Lugar</Label>
                  <Input type="number" value={editForm.prize_3rd} onChange={e => setEditForm({ ...editForm, prize_3rd: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Detalhes da Premiação</Label>
              <Textarea value={editForm.prize} onChange={e => setEditForm({ ...editForm, prize: e.target.value })} rows={2} />
            </div>
            <Button variant="gold" onClick={handleEditSave} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSeasons;
