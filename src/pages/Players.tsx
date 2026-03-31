import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Pencil, Lock } from 'lucide-react';
import { brazilianStates, citiesByState, pronounsOptions, countryCodes, formatPhone, unformatPhone } from '@/lib/brazil-data';

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
  pronouns: string;
  avatar_url: string | null;
  created_at: string;
}

const emptyForm = { name: '', nickname: '', email: '', phone: '', country_code: '+55', city: '', state: '', birth_date: '', gender: '', pronouns: '', password: '' };

const Players = () => {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Password reset state
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPlayerId, setResetPlayerId] = useState<string>('');
  const [resetPlayerName, setResetPlayerName] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const cities = useMemo(() => citiesByState[form.state] || [], [form.state]);

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
      pronouns: (p as any).pronouns || '',
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
      phone: formatPhone(p.phone),
      country_code: p.country_code,
      city: p.city,
      state: p.state,
      birth_date: p.birth_date,
      gender: p.gender,
      pronouns: p.pronouns,
      password: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingPlayer) {
      const { error } = await supabase.from('profiles').update({
        name: form.name,
        nickname: form.nickname,
        email: form.email,
        phone: unformatPhone(form.phone),
        country_code: form.country_code,
        city: form.city,
        state: form.state,
        birth_date: form.birth_date || null,
        gender: form.gender,
        pronouns: form.pronouns,
      } as any).eq('id', editingPlayer.id);
      if (error) return toast.error(error.message);
      toast.success('Jogador atualizado!');
    } else {
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

      if (result?.id) {
        await supabase.from('profiles').update({
          name: form.name || form.nickname,
          phone: unformatPhone(form.phone),
          country_code: form.country_code,
          city: form.city,
          state: form.state,
          birth_date: form.birth_date || null,
          gender: form.gender,
          pronouns: form.pronouns,
        } as any).eq('id', result.id);
      }
      toast.success('Jogador criado!');
    }
    setDialogOpen(false);
    fetchPlayers();
  };

  const openResetPassword = (p: Player) => {
    setResetPlayerId(p.id);
    setResetPlayerName(p.nickname || p.name);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordOpen(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) return toast.error('Preencha ambos os campos');
    if (newPassword !== confirmPassword) return toast.error('As senhas não coincidem');
    if (newPassword.length < 8) return toast.error('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(newPassword)) return toast.error('Inclua ao menos uma letra maiúscula');
    if (!/[a-z]/.test(newPassword)) return toast.error('Inclua ao menos uma letra minúscula');
    if (!/[^A-Za-z0-9]/.test(newPassword)) return toast.error('Inclua ao menos um caractere especial');

    setResetting(true);
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { user_id: resetPlayerId, new_password: newPassword },
    });
    setResetting(false);

    if (error || data?.error) return toast.error(data?.error || error?.message || 'Erro ao resetar senha');
    toast.success(`Senha de ${resetPlayerName} resetada!`);
    setResetPasswordOpen(false);
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

      {/* Edit/Create Dialog */}
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
                <Label>{editingPlayer ? 'Nickname' : 'Nickname *'}</Label>
                <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="Apelido" />
              </div>
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
              </div>
            </div>

            {editingPlayer && (
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jogador@azd.com.br" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Telefone</Label>
              <div className="flex gap-2">
                <Select value={form.country_code} onValueChange={v => setForm({ ...form, country_code: v })}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.state} onValueChange={v => setForm({ ...form, state: v, city: '' })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map(s => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Select value={form.city} onValueChange={v => setForm({ ...form, city: v })} disabled={!form.state}>
                  <SelectTrigger><SelectValue placeholder={form.state ? 'Selecione' : 'Selecione o estado'} /></SelectTrigger>
                  <SelectContent>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Gênero</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="nao_binario">Não-binário</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Como devo me referir a você?</Label>
              <Select value={form.pronouns} onValueChange={v => setForm({ ...form, pronouns: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione pronomes" /></SelectTrigger>
                <SelectContent>
                  {pronounsOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button variant="gold" onClick={handleSave} className="w-full">
              {editingPlayer ? 'Salvar Alterações' : 'Criar Jogador'}
            </Button>

            {editingPlayer && (
              <>
                <Separator />
                <Button variant="outline" className="w-full" onClick={() => { setDialogOpen(false); openResetPassword(editingPlayer); }}>
                  <Lock className="h-4 w-4 mr-1" /> Resetar Senha
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resetar Senha — {resetPlayerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 especial" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Digite novamente" />
            </div>
            <Button variant="gold" onClick={handleResetPassword} disabled={resetting} className="w-full">
              {resetting ? 'Resetando...' : 'Resetar Senha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Players;
