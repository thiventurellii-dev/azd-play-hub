import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

const countryCodes = [
  { code: '+55', label: '🇧🇷 +55' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+351', label: '🇵🇹 +351' },
  { code: '+34', label: '🇪🇸 +34' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+49', label: '🇩🇪 +49' },
  { code: '+33', label: '🇫🇷 +33' },
  { code: '+39', label: '🇮🇹 +39' },
  { code: '+81', label: '🇯🇵 +81' },
  { code: '+82', label: '🇰🇷 +82' },
  { code: '+86', label: '🇨🇳 +86' },
  { code: '+54', label: '🇦🇷 +54' },
  { code: '+56', label: '🇨🇱 +56' },
  { code: '+57', label: '🇨🇴 +57' },
  { code: '+52', label: '🇲🇽 +52' },
];

const Profile = () => {
  const { user, role } = useAuth();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: '', nickname: '', phone: '', country_code: '+55', state: '', city: '', birth_date: '', gender: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setProfile(data);
        setForm({
          name: data.name || '',
          nickname: (data as any).nickname || '',
          phone: (data as any).phone || '',
          country_code: (data as any).country_code || '+55',
          state: (data as any).state || '',
          city: (data as any).city || '',
          birth_date: (data as any).birth_date || '',
          gender: (data as any).gender || '',
          email: (data as any).email || user.email || '',
        });
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.name || !form.nickname || !form.phone || !form.state || !form.city || !form.birth_date || !form.gender) {
      return toast.error('Preencha todos os campos obrigatórios');
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: form.name,
      nickname: form.nickname,
      phone: form.phone,
      country_code: form.country_code,
      state: form.state,
      city: form.city,
      birth_date: form.birth_date,
      gender: form.gender,
      email: form.email,
    } as any).eq('id', user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Perfil atualizado!');
    setEditing(false);
    setProfile({ ...profile, ...form });
  };

  const genderLabels: Record<string, string> = {
    masculino: 'Masculino', feminino: 'Feminino', 'nao-binario': 'Não-binário', outro: 'Outro', 'prefiro-nao-dizer': 'Prefiro não dizer',
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
                  <Label>Nome Completo *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Nickname *</Label>
                  <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} required />
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
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} className="flex-1" required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data de Nascimento *</Label>
                  <Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Gênero *</Label>
                  <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="nao-binario">Não-binário</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                      <SelectItem value="prefiro-nao-dizer">Prefiro não dizer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="gold" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{profile?.email || user?.email}</span></div>
              <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium">{profile?.country_code} {profile?.phone || '—'}</span></div>
              <div><span className="text-muted-foreground">Estado:</span> <span className="font-medium">{profile?.state || '—'}</span></div>
              <div><span className="text-muted-foreground">Cidade:</span> <span className="font-medium">{profile?.city || '—'}</span></div>
              <div><span className="text-muted-foreground">Nascimento:</span> <span className="font-medium">{profile?.birth_date ? new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span></div>
              <div><span className="text-muted-foreground">Gênero:</span> <span className="font-medium">{genderLabels[profile?.gender] || '—'}</span></div>
              <div><span className="text-muted-foreground">Membro desde:</span> <span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}</span></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
