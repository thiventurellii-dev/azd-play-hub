import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNotification } from '@/components/NotificationDialog';
import { Plus, Trash2, ExternalLink, Video, Users, Pencil } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  image_url: string | null;
  rules_url: string | null;
  video_url: string | null;
  min_players: number | null;
  max_players: number | null;
  slug: string | null;
  factions: any;
}

const AdminGames = () => {
  const { notify } = useNotification();
  const [games, setGames] = useState<Game[]>([]);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [rulesUrl, setRulesUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [minPlayers, setMinPlayers] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [slug, setSlug] = useState('');

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editForm, setEditForm] = useState({ name: '', image_url: '', rules_url: '', video_url: '', min_players: '', max_players: '', slug: '', factions: '' });

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('name');
    setGames(data || []);
  };

  useEffect(() => { fetchGames(); }, []);

  const handleCreate = async () => {
    if (!name) return notify('error', 'Nome obrigatório');
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { error } = await supabase.from('games').insert({
      name,
      slug: generatedSlug,
      image_url: imageUrl || null,
      rules_url: rulesUrl || null,
      video_url: videoUrl || null,
      min_players: minPlayers ? parseInt(minPlayers) : null,
      max_players: maxPlayers ? parseInt(maxPlayers) : null,
    });
    if (error) return notify('error', error.message);
    notify('success', 'Jogo adicionado!');
    setName(''); setImageUrl(''); setRulesUrl(''); setVideoUrl(''); setMinPlayers(''); setMaxPlayers(''); setSlug('');
    fetchGames();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (error) return notify('error', error.message);
    notify('success', 'Jogo removido');
    fetchGames();
  };

  const openEdit = (g: Game) => {
    setEditingGame(g);
    setEditForm({
      name: g.name,
      image_url: g.image_url || '',
      rules_url: g.rules_url || '',
      video_url: g.video_url || '',
      min_players: g.min_players ? String(g.min_players) : '',
      max_players: g.max_players ? String(g.max_players) : '',
      slug: g.slug || '',
      factions: g.factions ? JSON.stringify(g.factions, null, 2) : '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingGame) return;
    let factions = null;
    if (editForm.factions.trim()) {
      try {
        factions = JSON.parse(editForm.factions);
      } catch {
        return notify('error', 'JSON de facções inválido');
      }
    }
    const { error } = await supabase.from('games').update({
      name: editForm.name,
      slug: editForm.slug || null,
      image_url: editForm.image_url || null,
      rules_url: editForm.rules_url || null,
      video_url: editForm.video_url || null,
      min_players: editForm.min_players ? parseInt(editForm.min_players) : null,
      max_players: editForm.max_players ? parseInt(editForm.max_players) : null,
      factions,
    }).eq('id', editingGame.id);
    if (error) return notify('error', error.message);
    notify('success', 'Jogo atualizado!');
    setEditDialogOpen(false);
    fetchGames();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle>Novo Jogo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Brass Birmingham" />
            </div>
            <div className="space-y-2">
              <Label>URL da Imagem (opcional)</Label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Link das Regras (opcional)</Label>
              <Input value={rulesUrl} onChange={e => setRulesUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Vídeo Explicativo (opcional)</Label>
              <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Mín. Jogadores</Label>
              <Input type="number" min={1} value={minPlayers} onChange={e => setMinPlayers(e.target.value)} placeholder="2" />
            </div>
            <div className="space-y-2">
              <Label>Máx. Jogadores</Label>
              <Input type="number" min={1} value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} placeholder="5" />
            </div>
          </div>
          <Button variant="gold" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> Adicionar Jogo</Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map(g => (
          <Card key={g.id} className="bg-card border-border">
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {g.image_url && <img src={g.image_url} alt={g.name} className="h-10 w-10 rounded object-cover" />}
                  <p className="font-semibold">{g.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(g)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {(g.min_players || g.max_players) && (
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{g.min_players || '?'}–{g.max_players || '?'} jogadores</span>
                )}
                {g.rules_url && (
                  <a href={g.rules_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gold hover:underline">
                    <ExternalLink className="h-3 w-3" /> Regras
                  </a>
                )}
                {g.video_url && (
                  <a href={g.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gold hover:underline">
                    <Video className="h-3 w-3" /> Vídeo
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Jogo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>URL da Imagem</Label>
                <Input value={editForm.image_url} onChange={e => setEditForm({ ...editForm, image_url: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Link das Regras</Label>
                <Input value={editForm.rules_url} onChange={e => setEditForm({ ...editForm, rules_url: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Vídeo Explicativo</Label>
                <Input value={editForm.video_url} onChange={e => setEditForm({ ...editForm, video_url: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mín. Jogadores</Label>
                <Input type="number" value={editForm.min_players} onChange={e => setEditForm({ ...editForm, min_players: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Máx. Jogadores</Label>
                <Input type="number" value={editForm.max_players} onChange={e => setEditForm({ ...editForm, max_players: e.target.value })} />
              </div>
            </div>
            <Button variant="gold" onClick={handleEditSave} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGames;
