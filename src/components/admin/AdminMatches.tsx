import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/components/NotificationDialog';
import { Trash2, Image, Pencil, Search, ChevronDown, ChevronUp, CalendarIcon } from 'lucide-react';
import NewMatchFlow from '@/components/matches/NewMatchFlow';
import EditMatchDialog from '@/components/matches/EditMatchDialog';
import { recalculateSeasonGameMmr } from '@/lib/mmrRecalculation';

interface Season { id: string; name: string; }
interface MatchResultRow {
  id: string;
  player_id: string | null;
  ghost_player_id: string | null;
  player_name: string;
  is_guest: boolean;
  position: number;
  score: number;
  mmr_before: number;
  mmr_change: number;
  mmr_after: number;
  is_first: boolean;
}
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
  results: MatchResultRow[];
}

const AdminMatches = () => {
  const { notify } = useNotification();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);

  const [filterSeason, setFilterSeason] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchSeasons = async () => {
      const { data } = await supabase
        .from('seasons').select('id, name').eq('type', 'boardgame' as any)
        .order('start_date', { ascending: false });
      setSeasons(data || []);
    };
    fetchSeasons();
    fetchMatches();
  }, []);

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
      supabase
        .from('match_results')
        .select('id, match_id, player_id, ghost_player_id, position, score, mmr_before, mmr_change, mmr_after')
        .in('match_id', matchIds),
    ]);

    const seasonMap: Record<string, string> = {};
    for (const s of (seasonsRes.data || [])) seasonMap[s.id] = s.name;
    const gameMap: Record<string, string> = {};
    for (const g of (gamesRes.data || [])) gameMap[g.id] = g.name;

    const profileIds = [...new Set((resultsRes.data || []).map((r: any) => r.player_id).filter(Boolean))];
    const ghostIds = [...new Set((resultsRes.data || []).map((r: any) => r.ghost_player_id).filter(Boolean))];

    const [profilesRes, ghostsRes] = await Promise.all([
      profileIds.length > 0
        ? supabase.from('profiles').select('id, name, nickname').in('id', profileIds)
        : Promise.resolve({ data: [] as any[] }),
      ghostIds.length > 0
        ? supabase.from('ghost_players').select('id, display_name').in('id', ghostIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const playerMap: Record<string, string> = {};
    for (const p of (profilesRes.data || [])) playerMap[(p as any).id] = (p as any).nickname || (p as any).name;
    const ghostMap: Record<string, string> = {};
    for (const g of (ghostsRes.data || [])) ghostMap[(g as any).id] = (g as any).display_name;

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
      results: ((resultsRes.data || []) as any[])
        .filter(r => r.match_id === m.id)
        .sort((a, b) => a.position - b.position)
        .map(r => {
          const isGuest = !!r.ghost_player_id;
          const name = isGuest
            ? (ghostMap[r.ghost_player_id] || 'Convidado')
            : (playerMap[r.player_id] || '?');
          return {
            id: r.id,
            player_id: r.player_id,
            ghost_player_id: r.ghost_player_id,
            player_name: name,
            is_guest: isGuest,
            position: r.position,
            score: r.score || 0,
            mmr_before: r.mmr_before || 1000,
            mmr_change: r.mmr_change || 0,
            mmr_after: r.mmr_after || 1000,
            is_first: !isGuest && r.player_id === m.first_player_id,
          };
        }),
    })));
  };

  const openEditMatch = (m: MatchRecord) => {
    setEditingMatch(m);
    setEditDialogOpen(true);
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
      <NewMatchFlow onComplete={fetchMatches} />

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
            <div className="relative w-[180px]">
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="pr-10" placeholder="Filtrar por data" />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {(filterSeason !== 'all' || filterDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterSeason('all'); setFilterDate(''); }}>Limpar</Button>
            )}
          </div>
        </CardContent>
      </Card>

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
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={async () => {
                          if (!confirm('Tem certeza que deseja excluir esta partida? Esta ação não pode ser desfeita.')) return;
                          const sid = m.season_id;
                          const gid = m.game_id;
                          await supabase.from('match_result_scores').delete().in('match_result_id',
                            (await supabase.from('match_results').select('id').eq('match_id', m.id)).data?.map(r => r.id) || []
                          );
                          await supabase.from('match_results').delete().eq('match_id', m.id);
                          await supabase.from('matches').delete().eq('id', m.id);
                          await recalculateSeasonGameMmr(sid, gid);
                          notify('success', 'Partida excluída e MMR recalculado');
                          fetchMatches();
                        }}>
                          <Trash2 className="h-4 w-4" />
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
                        {m.results.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Badge variant={r.position === 1 ? 'default' : 'secondary'} className={r.position === 1 ? 'bg-gold text-black' : ''}>
                                {r.position}º
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {r.player_name}
                              {r.is_guest && <Badge variant="outline" className="ml-2 text-xs border-amber-500/50 text-amber-400">convidado</Badge>}
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

      <EditMatchDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        match={editingMatch}
        onSaved={fetchMatches}
      />
    </div>
  );
};

export default AdminMatches;
