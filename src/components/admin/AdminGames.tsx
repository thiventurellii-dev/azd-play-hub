import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, ExternalLink, Video, Users } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  image_url: string | null;
  rules_url: string | null;
  video_url: string | null;
  min_players: number | null;
  max_players: number | null;
}

const AdminGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [rulesUrl, setRulesUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [minPlayers, setMinPlayers] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('name');
    setGames(data || []);
  };

  useEffect(() => { fetchGames(); }, []);

  const handleCreate = async () => {
    if (!name) return toast.error('Nome obrigatório');
    const { error } = await supabase.from('games').insert({
      name,
      image_url: imageUrl || null,
      rules_url: rulesUrl || null,
      video_url: videoUrl || null,
      min_players: minPlayers ? parseInt(minPlayers) : null,
      max_players: maxPlayers ? parseInt(maxPlayers) : null,
    });
    if (error) return toast.error(error.message);
    toast.success('Jogo adicionado!');
    setName(''); setImageUrl(''); setRulesUrl(''); setVideoUrl(''); setMinPlayers(''); setMaxPlayers('');
    fetchGames();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Jogo removido');
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
                <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
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
    </div>
  );
};

export default AdminGames;
