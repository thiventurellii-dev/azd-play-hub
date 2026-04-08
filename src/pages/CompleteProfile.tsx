import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseExternal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import logo from '@/assets/azd-logo.png';
import { useNotification } from '@/components/NotificationDialog';
import { brazilianStates, citiesByState, pronounsOptions, countryCodes, formatPhone, unformatPhone } from '@/lib/brazil-data';

const CompleteProfile = () => {
  const { user, setProfileCompleted } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.user_metadata?.name || '',
    nickname: user?.user_metadata?.name || '',
    phone: '',
    country_code: '+55',
    state: '',
    city: '',
    birth_date: '',
    gender: '',
    pronouns: '',
  });
  const [saving, setSaving] = useState(false);

  const cities = useMemo(() => citiesByState[form.state] || [], [form.state]);

  const [currentStatus, setCurrentStatus] = useState<string>('pending');

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('status').eq('id', user.id).single().then(({ data }) => {
        if (data) setCurrentStatus((data as any).status || 'pending');
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.name || !form.nickname || !form.phone || !form.state || !form.city || !form.birth_date || !form.gender || !form.pronouns) {
      return notify('error', 'Preencha todos os campos obrigatórios');
    }
    setSaving(true);

    const newStatus = 'active';

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
      email: user.email || '',
      status: newStatus,
    } as any).eq('id', user.id);
    setSaving(false);
    if (error) return notify('error', error.message);
    
    setProfileCompleted(true);
    
    const isDirectActive = currentStatus === 'pending';
    const message = isDirectActive
      ? 'Cadastro completo! Seu perfil foi completado com sucesso. Você já pode acessar a plataforma!'
      : 'Cadastro enviado! Seu perfil foi completado. Um administrador irá analisar e aprovar seu cadastro em breve.';
    
    notify('success', message, undefined, { autoClose: 2500, onClose: () => navigate('/') });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg bg-card border-border">
        <CardHeader className="text-center">
          <img src={logo} alt="AzD" className="h-20 mx-auto mb-4 invert object-contain" />
          <CardTitle className="text-2xl">Complete seu Perfil</CardTitle>
          <CardDescription>Preencha todos os dados para continuar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nickname *</Label>
              <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="Seu apelido na comunidade" />
            </div>
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome completo" />
            </div>
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
              <div className="relative">
                <Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} className="pr-10" />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
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

          <Button variant="gold" onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Completar Perfil'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;