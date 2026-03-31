import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logo from '@/assets/azd-logo.png';
import { toast } from 'sonner';

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

const CompleteProfile = () => {
  const { user, setProfileCompleted } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.user_metadata?.name || '',
    phone: '',
    country_code: '+55',
    state: '',
    city: '',
    birth_date: '',
    gender: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!form.name || !form.phone || !form.state || !form.city || !form.birth_date || !form.gender) {
      return toast.error('Preencha todos os campos obrigatórios');
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name: form.name,
      phone: form.phone,
      country_code: form.country_code,
      state: form.state,
      city: form.city,
      birth_date: form.birth_date,
      gender: form.gender,
      email: user.email || '',
    }).eq('id', user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Perfil completo!');
    setProfileCompleted(true);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card border-border">
        <CardHeader className="text-center">
          <img src={logo} alt="AzD" className="h-16 w-16 mx-auto mb-4 invert" />
          <CardTitle className="text-2xl">Complete seu Perfil</CardTitle>
          <CardDescription>Preencha todos os dados para continuar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome completo" required />
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
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="11999999999" className="flex-1" required />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Estado *</Label>
              <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="SP" required />
            </div>
            <div className="space-y-2">
              <Label>Cidade *</Label>
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="São Paulo" required />
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
          <Button variant="gold" onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Completar Perfil'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
