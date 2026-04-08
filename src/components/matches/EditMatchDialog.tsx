import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseExternal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLog';
import { recalculateSeasonGameMmr } from '@/lib/mmrRecalculation';
import { CalendarIcon } from 'lucide-react';
import { EntitySheet } from '@/components/shared/EntitySheet';

interface MatchData {
  id: string;
  played_at: string;
  duration_minutes: number | null;
  season_id: string;
  game_id: string;
  first_player_id?: string | null;
  image_url?: string | null;
  results: {
    id?: string;
    player_id: string;
    player_name: string;
    position: number;
    score: number;
    mmr_before?: number;
    mmr_change?: number;
    mmr_after?: number;
    is_first?: boolean;
  }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchData | null;
  onSaved: () => void;
}

interface Season { id: string; name: string; }
interface Game { id: string; name: string; }

const EditMatchDialog = ({ open, onOpenChange, match, onSaved }: Props) => {
  const { user, isAdmin } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [saving, setSaving] = useState(false);

  const [playedDate, setPlayedDate] = useState('');
  const [playedTime, setPlayedTime] = useState('');
  const [duration, setDuration] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [gameId, setGameId] = useState('');
  const [results, setResults] = useState<{
    id?: string;
    player_id: string;
    player_name: string;
    position: number;
    score: number;
    is_first: boolean;
  }[]>([]);

  useEffect(() => {
    if (!open) return;
    const fetchBase = async () => {
      const [s, g] = await Promise.all([
        supabase.from('seasons').select('id, name').neq('status', 'finished').neq('status', 'upcoming').order('start_date', { ascending: false }),
        supabase.from('games').select('id, name').order('name'),
      ]);
      setSeasons(s.data || []);
      setGames(g.data || []);
    };
    fetchBase();
  }, [open]);

  useEffect(() => {
    if (!match || !open) return;
    const d = new Date(match.played_at);
    setPlayedDate(d.toISOString().split('T')[0]);
    setPlayedTime(d.toTimeString().slice(0, 5));
    setDuration(match.duration_minutes ? String(match.duration_minutes) : '');
    setSeasonId(match.season_id);
    setGameId(match.game_id);
    setResults(match.results.map(r => ({
      id: r.id,
      player_id: r.player_id,
      player_name: r.player_name,
      position: r.position,
      score: r.score || 0,
      is_first: r.is_first || false,
    })));
  }, [match, open]);

  const handleSave = async () => {
    if (!match || !user) return;
    setSaving(true);

    const updatedData = {
      played_at: new Date(`${playedDate}T${playedTime || '00:00'}`).toISOString(),
      duration_minutes: parseInt(duration) || null,
      season_id: seasonId,
      game_id: gameId,
      results: results.map(r => ({
        player_id: r.player_id,
        position: r.position,
        score: r.score,
        is_first: r.is_first,
      })),
    };

    try {
      if (isAdmin) {
        const { error } = await supabase.from('matches').update({
          season_id: seasonId,
          game_id: gameId,
          duration_minutes: parseInt(duration) || null,
          played_at: updatedData.played_at,
          first_player_id: results.find(r => r.is_first)?.player_id || null,
        }).eq('id', match.id);
        if (error) throw error;

        for (const r of results) {
          if (r.id) {
            await supabase.from('match_results').update({
              position: r.position,
              score: r.score,
            }).eq('id', r.id);
          } else {
            await supabase.from('match_results').update({
              position: r.position,
              score: r.score,
            }).eq('match_id', match.id).eq('player_id', r.player_id);
          }
        }

        const oldSeasonId = match.season_id;
        const oldGameId = match.game_id;
        const recalcPairs: { sid: string; gid: string }[] = [];
        recalcPairs.push({ sid: seasonId, gid: gameId });
        if (oldSeasonId !== seasonId || oldGameId !== gameId) {
          recalcPairs.push({ sid: oldSeasonId, gid: oldGameId });
        }
        for (const pair of recalcPairs) {
          await recalculateSeasonGameMmr(pair.sid, pair.gid);
        }

        await logActivity(user.id, 'update', 'match', match.id, {
          played_at: match.played_at,
          duration_minutes: match.duration_minutes,
        }, {
          played_at: updatedData.played_at,
          duration_minutes: updatedData.duration_minutes,
        });

        toast.success('Partida atualizada e MMR recalculado!');
      } else {
        const { error } = await supabase.from('match_edit_proposals').insert({
          match_id: match.id,
          proposed_by: user.id,
          proposed_data: updatedData as any,
          status: 'pending',
        });
        if (error) throw error;
        toast.success('Proposta de edição enviada para aprovação!');
      }

      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!match || !user || !confirm('Tem certeza que deseja excluir esta partida? Esta ação não pode ser desfeita.')) return;
    try {
      const sId = match.season_id;
      const gId = match.game_id;
      const { data: resultIds } = await supabase.from('match_results').select('id').eq('match_id', match.id);
      if (resultIds && resultIds.length > 0) {
        await supabase.from('match_result_scores').delete().in('match_result_id', resultIds.map(r => r.id));
      }
      await supabase.from('match_results').delete().eq('match_id', match.id);
      await supabase.from('matches').delete().eq('id', match.id);
      await recalculateSeasonGameMmr(sId, gId);
      await logActivity(user.id, 'delete', 'match', match.id, { played_at: match.played_at }, null);
      toast.success('Partida excluída e MMR recalculado');
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    }
  };

  return (
    <EntitySheet
      open={open}
      onOpenChange={onOpenChange}
      title={isAdmin ? 'Editar Partida' : 'Propor Edição'}
      description={!isAdmin ? 'Suas alterações serão enviadas como proposta para aprovação de um administrador.' : undefined}
    >
      {match && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {isAdmin && (
              <>
                <div className="space-y-2">
                  <Label>Season</Label>
                  <Select value={seasonId} onValueChange={setSeasonId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jogo</Label>
                  <Select value={gameId} onValueChange={setGameId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Data</Label>
              <div className="relative">
                <Input type="date" value={playedDate} onChange={e => setPlayedDate(e.target.value)} className="pr-10" />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input type="time" value={playedTime} onChange={e => setPlayedTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Duração (min)</Label>
            <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>

          <Label>Resultados</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jogador</TableHead>
                <TableHead className="w-[80px]">Posição</TableHead>
                <TableHead className="w-[80px]">Pontuação</TableHead>
                {isAdmin && <TableHead className="w-[70px]">1º</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={r.player_id}>
                  <TableCell className="text-sm truncate">{r.player_name}</TableCell>
                  <TableCell>
                    <Input type="number" min={1} value={r.position} onChange={e => {
                      const updated = [...results];
                      updated[i] = { ...updated[i], position: parseInt(e.target.value) || 1 };
                      setResults(updated);
                    }} className="w-[70px]" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={r.score} onChange={e => {
                      const updated = [...results];
                      updated[i] = { ...updated[i], score: parseInt(e.target.value) || 0 };
                      setResults(updated);
                    }} className="w-[80px]" />
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Checkbox checked={r.is_first} onCheckedChange={(checked) => {
                        const updated = results.map((rr, idx) => ({ ...rr, is_first: idx === i && !!checked }));
                        setResults(updated);
                      }} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button variant="gold" onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : isAdmin ? 'Salvar Alterações' : 'Enviar Proposta'}
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleDelete}
            >
              Excluir Partida
            </Button>
          )}
        </>
      )}
    </EntitySheet>
  );
};

export default EditMatchDialog;
