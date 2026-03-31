import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  country_code: string;
  city: string;
  state: string;
  birth_date: string;
  gender: string;
  avatar_url: string | null;
  created_at: string;
}

const emptyForm = { name: '', nickname: '', email: '', phone: '', country_code: '+55', city: '', state: '', birth_date: '', gender: '', password: '' };

const Players = () => {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchPlayers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('name');
    setPlayers((data || []).map(p => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname || '',
      email: p.email || '',
      phone: p.phone || '',
      country_code: p.country_code || '+55',
      city: p.city || '',
      state: p.state || '',
      birth_date: p.birth_date || '',
      gender: p.gender || '',
      avatar_url: p.avatar_url,
      created_at: p.created_at,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchPlayers(); }, []);

  const openCreate = () => {
    setEditingPlayer(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Player) => {
    setEditingPlayer(p);
    setForm({
      name: p.name,
      nickname: p.nickname,
      email: p.email,
      phone: p.phone,
      country_code: p.country_code,
      city: p.city,
      state: p.state,
      birth_date: p.birth_date,
      gender: p.gender,
      password: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingPlayer) {
      // Update profile
      const { error } = await supabase.from('profiles').update({
        name: form.name,
        nickname: form.nickname,
        email: form.email,
        phone: form.phone,
        country_code: form.country_code,
        city: form.city,
        state: form.state,
        birth_date: form.birth_date || null,
        gender: form.gender,
      }).eq('id', editingPlayer.id);
      if (error) return toast.error(error.message);
      toast.success('Jogador atualizado!');
    } else {
      // Create new player via edge function
      if (!form.email || !form.nickname || !form.password) {
        return toast.error('E-mail, nick e senha são obrigatórios');
      }
      if (form.password.length < 8) return toast.error('Senha deve ter no mínimo 8 caracteres');

      const { data, error } = await supabase.functions.invoke('bulk-create-users', {
        body: { users: [{ nick: form.nickname, email: form.email, password: form.password }] },
      });
      if (error) return toast.error(error.message);

      const result = data?.[0];
      if (result?.error) return toast.error(result.error);

      // Update profile with additional fields
      if (result?.id) {
        await supabase.from('profiles').update({
          name: form.name || form.nickname,
          phone: form.phone,
          country_code: form.country_code,
          city: form.city,
          state: form.state,
          birth_date: form.birth_date || null,
          gender: form.gender,
        }).eq('id', result.id);
      }
      toast.success('Jogador criado!');
    }
    setDialogOpen(false);
    fetchPlayers();
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Jogadores</h1>
        {isAdmin && (
          <Button variant="gold" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Novo Jogador
          </Button>
        )}
      </div>
      <p className="text-muted-foreground mb-8">Membros da comunidade AzD</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card border-border hover:border-gold/20 transition-colors relative group">
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-gold font-bold text-lg">
                    {(p.nickname || p.name)?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    {p.nickname && <p className="text-xs text-gold">@{p.nickname}</p>}
                    {(p.city || p.state) && <p className="text-xs text-muted-foreground">{[p.city, p.state].filter(Boolean).join(', ')}</p>}
                    <p className="text-xs text-muted-foreground">Desde {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlayer ? 'Editar Jogador' : 'Novo Jogador'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {!editingPlayer && (
              <>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jogador@azd.com.br" />
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
                </div>
              </>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>{editingPlayer ? 'Nickname' : 'Nickname *'}</Label>
                <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="Apelido" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <div className="flex gap-2">
                  <Input className="w-20" value={form.country_code} onChange={e => setForm({ ...form, country_code: e.target.value })} placeholder="+55" />
                  <Input className="flex-1" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="SP" />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="São Paulo" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Gênero</Label>
              <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="nao_binario">Não-binário</SelectItem>
                  <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingPlayer && (
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jogador@azd.com.br" />
              </div>
            )}
            <Button variant="gold" onClick={handleSave} className="w-full">
              {editingPlayer ? 'Salvar Alterações' : 'Criar Jogador'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Players;
