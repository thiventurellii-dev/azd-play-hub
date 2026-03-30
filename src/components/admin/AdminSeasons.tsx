import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2, Gamepad2, ChevronDown, ChevronUp } from 'lucide-react';

interface Season {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Game {
  id: string;
  name: string;
}

const statusLabels: Record<string, string> = {
  upcoming: 'Em breve',
  active: 'Ativa',
  finished: 'Finalizada',
};

const AdminSeasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [seasonGamesMap, setSeasonGamesMap] = useState<Record<string, string[]>>({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);

  const fetchData = async () => {
    const [seasonsRes, gamesRes, sgRes] = await Promise.all([
      supabase.from('seasons').select('*').order('start_date', { ascending: false }),
      supabase.from('games').select('id, name').order('name'),
      supabase.from('season_games').select('season_id, game_id'),
    ]);
    setSeasons(seasonsRes.data || []);
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
    if (!name || !startDate || !endDate) return toast.error('Preencha todos os campos');
    const { data, error } = await supabase
      .from('seasons')
      .insert({ name, description, start_date: startDate, end_date: endDate, status })
      .select()
      .single();
    if (error) return toast.error(error.message);

    if (selectedGames.length > 0) {
      const sgInserts = selectedGames.map(gid => ({ season_id: data.id, game_id: gid }));
      await supabase.from('season_games').insert(sgInserts);
    }

    toast.success('Season criada!');
    setName(''); setDescription(''); setStartDate(''); setEndDate(''); setSelectedGames([]);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('season_games').delete().eq('season_id', id);
    const { error } = await supabase.from('seasons').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Season removida');
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
    setSelectedGames(prev =>
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  const getGameName = (id: string) => games.find(g => g.id === id)?.name || id;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Nova Season</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Season 1" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
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
              <Label>Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição da season" />
          </div>

          <div className="space-y-2">
            <Label>Jogos desta Season</Label>
            {games.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum jogo cadastrado. Adicione jogos na aba "Jogos" primeiro.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {games.map(g => (
                  <label key={g.id} className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <Checkbox
                      checked={selectedGames.includes(g.id)}
                      onCheckedChange={() => toggleNewGameSelection(g.id)}
                    />
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
          return (
            <Card key={s.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{s.name}</p>
                      <Badge variant="secondary" className="text-xs">{statusLabels[s.status] || s.status}</Badge>
                      <Badge variant="outline" className="text-xs">
                        <Gamepad2 className="h-3 w-3 mr-1" />{sgames.length} jogos
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.start_date} — {s.end_date}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setExpandedSeason(isExpanded ? null : s.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Label className="text-sm mb-2 block">Jogos vinculados à season:</Label>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {games.map(g => {
                        const isLinked = sgames.includes(g.id);
                        return (
                          <label key={g.id} className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                            <Checkbox
                              checked={isLinked}
                              onCheckedChange={() => toggleGameInSeason(s.id, g.id, isLinked)}
                            />
                            <span className="text-sm">{g.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSeasons;
