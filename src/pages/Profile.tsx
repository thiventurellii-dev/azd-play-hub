import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Pencil, Lock } from 'lucide-react';
import { brazilianStates, citiesByState, pronounsOptions, countryCodes, formatPhone, unformatPhone } from '@/lib/brazil-data';

const Profile = () => {
  const { user, role } = useAuth();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: '', nickname: '', phone: '', country_code: '+55', state: '', city: '', birth_date: '', gender: '', pronouns: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const cities = citiesByState[form.state] || [];

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setProfile(data);
        setForm({
          name: data.name || '',
          nickname: (data as any).nickname || '',
          phone: formatPhone((data as any).phone || ''),
          country_code: (data as any).country_code || '+55',
          state: (data as any).state || '',
          city: (data as any).city || '',
          birth_date: (data as any).birth_date || '',
          gender: (data as any).gender || '',
          pronouns: (data as any).pronouns || '',
          email: (data as any).email || user.email || '',
        });
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.name || !form.nickname || !form.phone || !form.state || !form.city || !form.birth_date || !form.gender || !form.pronouns) {
      return toast.error('Preencha todos os campos obrigatórios');
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: form.name,
      nickname: form.nickname,
      phone: unformatPhone(form.phone),
      country_code: form.country_code,
      state: form.state,
      city: form.city,
      birth_date: form.birth_date,
      gender: form.gender,
      pronouns: form.pronouns,
      email: form.email,
    } as any).eq('id', user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Perfil atualizado!');
    setEditing(false);
    setProfile({ ...profile, ...form, phone: unformatPhone(form.phone) });
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) return toast.error('Preencha ambos os campos de senha');
    if (newPassword !== confirmPassword) return toast.error('As senhas não coincidem');
    if (newPassword.length < 8) return toast.error('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(newPassword)) return toast.error('Inclua ao menos uma letra maiúscula');
    if (!/[a-z]/.test(newPassword)) return toast.error('Inclua ao menos uma letra minúscula');
    if (!/[^A-Za-z0-9]/.test(newPassword)) return toast.error('Inclua ao menos um caractere especial');

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return toast.error(error.message);
    toast.success('Senha alterada com sucesso!');
    setChangingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  const genderLabels: Record<string, string> = {
    masculino: 'Masculino', feminino: 'Feminino', nao_binario: 'Não-binário', 'nao-binario': 'Não-binário', outro: 'Outro', prefiro_nao_dizer: 'Prefiro não dizer', 'prefiro-nao-dizer': 'Prefiro não dizer',
  };

  const pronounsLabels: Record<string, string> = {
    'ele/dele': 'Ele/Dele', 'ela/dela': 'Ela/Dela', 'elu/delu': 'Elu/Delu', prefiro_nao_dizer: 'Prefiro não dizer',
  };

  return (
    <div className="container py-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Meu Perfil</h1>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-gold font-bold text-2xl">
                {(profile?.nickname || profile?.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle>{profile?.name || 'Sem nome'}</CardTitle>
                {profile?.nickname && <p className="text-sm text-muted-foreground">@{profile.nickname}</p>}
                <Badge className="mt-1" variant={role === 'admin' ? 'default' : 'secondary'}>
                  {role === 'admin' ? 'Admin' : 'Player'}
                </Badge>
              </div>
            </div>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nickname *</Label>
                  <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={form.email} disabled className="opacity-60" />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <div className="flex gap-2">
                  <Select value={form.country_code} onValueChange={v => setForm({ ...form, country_code: v })}>
                    <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })}
                    placeholder="(11) 99999-9999"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select value={form.state} onValueChange={v => setForm({ ...form, state: v, city: '' })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {brazilianStates.map(s => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cidade *</Label>
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
                  <Label>Data de Nascimento *</Label>
                  <Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Gênero *</Label>
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
                <Label>Como devo me referir a você? *</Label>
                <Select value={form.pronouns} onValueChange={v => setForm({ ...form, pronouns: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione seus pronomes" /></SelectTrigger>
                  <SelectContent>
                    {pronounsOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="gold" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{profile?.email || user?.email}</span></div>
              <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium">{profile?.country_code} {profile?.phone ? formatPhone(profile.phone) : '—'}</span></div>
              <div><span className="text-muted-foreground">Estado:</span> <span className="font-medium">{brazilianStates.find(s => s.uf === profile?.state)?.name || profile?.state || '—'}</span></div>
              <div><span className="text-muted-foreground">Cidade:</span> <span className="font-medium">{profile?.city || '—'}</span></div>
              <div><span className="text-muted-foreground">Nascimento:</span> <span className="font-medium">{profile?.birth_date ? new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
              <div><span className="text-muted-foreground">Gênero:</span> <span className="font-medium">{genderLabels[profile?.gender] || '—'}</span></div>
              <div><span className="text-muted-foreground">Pronomes:</span> <span className="font-medium">{pronounsLabels[profile?.pronouns] || '—'}</span></div>
              <div><span className="text-muted-foreground">Membro desde:</span> <span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}</span></div>
            </div>
          )}

          <Separator className="my-6" />

          <div>
            {changingPassword ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Alterar Senha</h3>
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 especial" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Digite a senha novamente" />
                </div>
                <div className="flex gap-2">
                  <Button variant="gold" onClick={handleChangePassword} disabled={savingPassword}>
                    {savingPassword ? 'Salvando...' : 'Alterar Senha'}
                  </Button>
                  <Button variant="outline" onClick={() => { setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setChangingPassword(true)}>
                <Lock className="h-4 w-4 mr-1" /> Alterar Senha
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
