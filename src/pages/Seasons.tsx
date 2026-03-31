import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, ChevronRight, Plus, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Season {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  prize: string | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  finished: 'bg-muted text-muted-foreground border-border',
};
const statusLabels: Record<string, string> = { active: 'Ativa', upcoming: 'Em breve', finished: 'Finalizada' };

const emptyForm = { name: '', description: '', start_date: '', end_date: '', status: 'upcoming', prize: '' };

const Seasons = () => {
  const { isAdmin } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchSeasons = async () => {
    const { data } = await supabase.from('seasons').select('*').order('start_date', { ascending: false });
    setSeasons(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSeasons(); }, []);

  const openCreate = () => {
    setEditingSeason(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Season, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingSeason(s);
    setForm({
      name: s.name,
      description: s.description || '',
      start_date: s.start_date,
      end_date: s.end_date,
      status: s.status,
      prize: s.prize || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.start_date || !form.end_date) return toast.error('Preencha nome e datas');
    const payload = {
      name: form.name,
      description: form.description || null,
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
      prize: form.prize || null,
    };

    if (editingSeason) {
      const { error } = await supabase.from('seasons').update(payload).eq('id', editingSeason.id);
      if (error) return toast.error(error.message);
      toast.success('Season atualizada!');
    } else {
      const { error } = await supabase.from('seasons').insert(payload);
      if (error) return toast.error(error.message);
      toast.success('Season criada!');
    }
    setDialogOpen(false);
    fetchSeasons();
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Seasons</h1>
        {isAdmin && (
          <Button variant="gold" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nova Season
          </Button>
        )}
      </div>
      <p className="text-muted-foreground mb-8">Temporadas de competição da comunidade</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : seasons.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma season criada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {seasons.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Link to={`/seasons/${s.id}`}>
                <Card className="bg-card border-border hover:border-gold/20 transition-colors cursor-pointer group relative">
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="absolute top-3 right-3 z-10" onClick={(e) => openEdit(s, e)}>
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between pr-8">
                      <CardTitle className="text-xl">{s.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {s.description && <p className="text-sm text-muted-foreground mb-4">{s.description}</p>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(s.start_date).toLocaleDateString('pt-BR')} — {new Date(s.end_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSeason ? 'Editar Season' : 'Nova Season'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Season 1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Em breve</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="finished">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição da season..." />
            </div>
            <div className="space-y-2">
              <Label>Premiação</Label>
              <Input value={form.prize} onChange={e => setForm({ ...form, prize: e.target.value })} placeholder="Descrição do prêmio" />
            </div>
            <Button variant="gold" onClick={handleSave} className="w-full">
              {editingSeason ? 'Salvar Alterações' : 'Criar Season'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Seasons;
