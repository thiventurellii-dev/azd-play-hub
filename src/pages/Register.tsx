import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseExternal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logo from '@/assets/azd-logo.png';
import { useNotification } from '@/components/NotificationDialog';
import { brazilianStates, citiesByState, pronounsOptions, countryCodes, formatPhone, unformatPhone } from '@/lib/brazil-data';
import { CheckCircle, Mail } from 'lucide-react';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const Register = () => {
  const [form, setForm] = useState({
    nickname: '', name: '', email: '', password: '', confirmPassword: '',
    phone: '', country_code: '+55', state: '', city: '', birth_date: '', gender: '', pronouns: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { notify } = useNotification();

  const cities = useMemo(() => citiesByState[form.state] || [], [form.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nickname, name, email, password, phone, state, city, birth_date, gender, pronouns } = form;

    if (!nickname || !name || !email || !password || !phone || !state || !city || !birth_date || !gender || !pronouns) {
      return notify('error', 'Preencha todos os campos obrigatórios');
    }
    if (!passwordRegex.test(password)) {
      return notify('error', 'A senha deve ter mínimo 8 caracteres, uma maiúscula, uma minúscula e um caractere especial');
    }
    if (password !== form.confirmPassword) {
      return notify('error', 'As senhas não coincidem');
    }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: name, nickname, phone: unformatPhone(phone), country_code: form.country_code, state, city, birth_date, gender, pronouns },
          emailRedirectTo: window.location.origin,
        },
      });
      if (signUpError) throw signUpError;
      setSubmitted(true);
    } catch (err: any) {
      if (err.message?.includes('already registered') || err.message?.includes('already been registered') || err.status === 422) {
        notify('error', 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.');
      } else {
        notify('error', err.message || 'Erro ao criar conta');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    if (field === 'state') setForm(f => ({ ...f, state: value, city: '' }));
    else setForm(f => ({ ...f, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border text-center">
          <CardContent className="pt-10 pb-8 space-y-6">
            <Mail className="h-16 w-16 mx-auto text-gold" />
            <h2 className="text-2xl font-bold">Verifique seu e-mail! 📧</h2>
            <p className="text-muted-foreground">
              Enviamos um link de confirmação para <strong>{form.email}</strong>. 
              Abra seu e-mail e clique no link para ativar sua conta antes de fazer login.
            </p>
            <p className="text-sm text-muted-foreground">
              Não recebeu? Verifique a pasta de spam ou lixo eletrônico.
            </p>
            <Button variant="gold" className="w-full" onClick={() => navigate('/login')}>
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card border-border">
        <CardHeader className="text-center">
          <img src={logo} alt="AzD" className="h-16 w-16 mx-auto mb-4" />
          <CardTitle className="text-2xl">Faça parte da comunidade</CardTitle>
          <CardDescription>Preencha todos os dados para se cadastrar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nickname *</Label>
                <Input value={form.nickname} onChange={e => updateField('nickname', e.target.value)} placeholder="Seu apelido na comunidade" required />
              </div>
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Seu nome completo" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input type="password" value={form.password} onChange={e => updateField('password', e.target.value)} placeholder="Mín. 8 caracteres" required />
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 especial</p>
            </div>
            <div className="space-y-2">
              <Label>Confirmar Senha *</Label>
              <Input type="password" value={form.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} placeholder="Digite a senha novamente" required />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <div className="flex gap-2">
                <Select value={form.country_code} onValueChange={v => updateField('country_code', v)}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={form.phone} onChange={e => updateField('phone', formatPhone(e.target.value))} placeholder="(11) 99999-9999" className="flex-1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado *</Label>
                <Select value={form.state} onValueChange={v => updateField('state', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{brazilianStates.map(s => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Select value={form.city} onValueChange={v => updateField('city', v)} disabled={!form.state}>
                  <SelectTrigger><SelectValue placeholder={form.state ? 'Selecione' : 'Selecione o estado'} /></SelectTrigger>
                  <SelectContent>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de Nascimento *</Label>
                <Input type="date" value={form.birth_date} onChange={e => updateField('birth_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Gênero *</Label>
                <Select value={form.gender} onValueChange={v => updateField('gender', v)}>
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
              <Select value={form.pronouns} onValueChange={v => updateField('pronouns', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione seus pronomes" /></SelectTrigger>
                <SelectContent>{pronounsOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="gold" className="w-full" disabled={loading}>
              {loading ? 'Criando conta...' : 'Faça parte da comunidade'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}<Link to="/login" className="text-gold hover:underline">Faça login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
