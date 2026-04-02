import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/azd-logo.png';
import { toast } from 'sonner';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const Register = () => {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname || !email || !password) return toast.error('Preencha todos os campos');
    if (!passwordRegex.test(password)) {
      return toast.error('A senha deve ter mínimo 8 caracteres, uma maiúscula, uma minúscula e um caractere especial');
    }
    setLoading(true);
    try {
      await signUp(email, password, nickname);
      toast.success('Conta criada! Verifique seu email para confirmar.');
      navigate('/login');
    } catch (err: any) {
      // Generic error for duplicate email - don't reveal who owns it
      if (err.message?.includes('already registered') || err.message?.includes('already been registered') || err.status === 422) {
        toast.error('Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.');
      } else {
        toast.error(err.message || 'Erro ao criar conta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <img src={logo} alt="AzD" className="h-16 w-16 mx-auto mb-4 invert" />
          <CardTitle className="text-2xl">Junte-se à AzD</CardTitle>
          <CardDescription>Crie sua conta e entre no ranking</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname *</Label>
              <Input id="nickname" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Seu apelido" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mín. 8 caracteres" required />
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 especial</p>
            </div>
            <Button type="submit" variant="gold" className="w-full" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="text-gold hover:underline">Faça login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
