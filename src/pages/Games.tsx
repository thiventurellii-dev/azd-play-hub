import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExternalLink, Video, Users, Calendar, Plus, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Game {
  id: string;
  name: string;
  image_url: string | null;
  rules_url: string | null;
  video_url: string | null;
  min_players: number | null;
  max_players: number | null;
}

interface SeasonLink {
  season_id: string;
  season_name: string;
  status: string;
}

const statusLabels: Record<string, string> = { active: 'Ativa', upcoming: 'Em breve', finished: 'Finalizada' };
const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  finished: 'bg-muted text-muted-foreground border-border',
};

const emptyForm = { name: '', image_url: '', rules_url: '', video_url: '', min_players: '', max_players: '' };

const Games = () => {
  const { isAdmin } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [gameSeasons, setGameSeasons] = useState<Record<string, SeasonLink[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    const [gamesRes, sgRes] = await Promise.all([
      supabase.from('games').select('*').order('name'),
      supabase.from('season_games').select('game_id, season_id'),
    ]);
    const games = gamesRes.data || [];
    const sgData = sgRes.data || [];
    setGames(games);

    if (sgData.length > 0) {
      const seasonIds = [...new Set(sgData.map(sg => sg.season_id))];
      const { data: seasons } = await supabase.from('seasons').select('id, name, status').in('id', seasonIds);
      const seasonMap: Record<string, { name: string; status: string }> = {};
      for (const s of (seasons || [])) seasonMap[s.id] = { name: s.name, status: s.status };
      const map: Record<string, SeasonLink[]> = {};
      for (const sg of sgData) {
        const s = seasonMap[sg.season_id];
        if (!s) continue;
        if (!map[sg.game_id]) map[sg.game_id] = [];
        map[sg.game_id].push({ season_id: sg.season_id, season_name: s.name, status: s.status });
      }
      setGameSeasons(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingGame(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (g: Game, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGame(g);
    setForm({
      name: g.name,
      image_url: g.image_url || '',
      rules_url: g.rules_url || '',
      video_url: g.video_url || '',
      min_players: g.min_players?.toString() || '',
      max_players: g.max_players?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Nome obrigatório');
    const payload = {
      name: form.name,
      image_url: form.image_url || null,
      rules_url: form.rules_url || null,
      video_url: form.video_url || null,
      min_players: form.min_players ? parseInt(form.min_players) : null,
      max_players: form.max_players ? parseInt(form.max_players) : null,
    };

    if (editingGame) {
      const { error } = await supabase.from('games').update(payload).eq('id', editingGame.id);
      if (error) return toast.error(error.message);
      toast.success('Jogo atualizado!');
    } else {
      const { error } = await supabase.from('games').insert(payload);
      if (error) return toast.error(error.message);
      toast.success('Jogo criado!');
    }
    setDialogOpen(false);
    fetchData();
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Jogos</h1>
        {isAdmin && (
          <Button variant="gold" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Novo Jogo
          </Button>
        )}
      </div>
      <p className="text-muted-foreground mb-8">Biblioteca de jogos da comunidade AzD</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : games.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum jogo cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {games.map((g, i) => {
            const seasons = gameSeasons[g.id] || [];
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card border-border hover:border-gold/20 transition-colors h-full relative">
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="absolute top-3 right-3 z-10" onClick={(e) => openEdit(g, e)}>
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                  <CardContent className="py-5 space-y-4">
                    <div className="flex items-start gap-4">
                      {g.image_url ? (
                        <img src={g.image_url} alt={g.name} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center text-gold font-bold text-2xl flex-shrink-0">
                          {g.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold">{g.name}</h3>
                        {(g.min_players || g.max_players) && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Users className="h-4 w-4" /> {g.min_players || '?'}–{g.max_players || '?'} jogadores
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {g.rules_url && (
                        <a href={g.rules_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1.5 py-1">
                            <ExternalLink className="h-3.5 w-3.5" /> Regras
                          </Badge>
                        </a>
                      )}
                      {g.video_url && (
                        <a href={g.video_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="cursor-pointer hover:border-gold/50 gap-1.5 py-1">
                            <Video className="h-3.5 w-3.5" /> Vídeo Explicativo
                          </Badge>
                        </a>
                      )}
                    </div>
                    {seasons.length > 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Seasons
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {seasons.map(s => (
                            <Link key={s.season_id} to={`/seasons/${s.season_id}`}>
                              <Badge className={`${statusColors[s.status] || 'bg-muted text-muted-foreground border-border'} cursor-pointer text-xs`}>
                                {s.season_name} — {statusLabels[s.status] || s.status}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {seasons.length === 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground italic">Não vinculado a nenhuma season.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGame ? 'Editar Jogo' : 'Novo Jogo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Brass Birmingham" />
              </div>
              <div className="space-y-2">
                <Label>URL da Imagem</Label>
                <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Link das Regras</Label>
                <Input value={form.rules_url} onChange={e => setForm({ ...form, rules_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Vídeo Explicativo</Label>
                <Input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/..." />
              </div>
              <div className="space-y-2">
                <Label>Mín. Jogadores</Label>
                <Input type="number" min={1} value={form.min_players} onChange={e => setForm({ ...form, min_players: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Máx. Jogadores</Label>
                <Input type="number" min={1} value={form.max_players} onChange={e => setForm({ ...form, max_players: e.target.value })} />
              </div>
            </div>
            <Button variant="gold" onClick={handleSave} className="w-full">
              {editingGame ? 'Salvar Alterações' : 'Criar Jogo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Games;
