import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseExternal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/azd-logo.png';
import { useNotification } from '@/components/NotificationDialog';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { notify } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      notify('error', error.message || 'Não foi possível enviar o e-mail de recuperação.');
      return;
    }

    setSent(true);
    notify('success', 'E-mail de recuperação enviado!');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <img src={logo} alt="AzD" className="h-20 w-20 mx-auto mb-4 drop-shadow-[0_0_20px_hsl(43,100%,50%,0.3)]" />
          <CardTitle className="text-2xl">Recuperar senha</CardTitle>
          <CardDescription>
            {sent ? 'Confira sua caixa de entrada para continuar.' : 'Digite seu e-mail para receber o link de redefinição.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Se existir uma conta para <strong>{email}</strong>, você receberá um link para redefinir sua senha.
              </p>
              <Link to="/login" className="inline-block text-sm text-gold hover:underline">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-gold hover:underline">Voltar para o login</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;