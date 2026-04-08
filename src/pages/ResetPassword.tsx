import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseExternal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/azd-logo.png';
import { useNotification } from '@/components/NotificationDialog';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useNotification();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingLink, setCheckingLink] = useState(true);
  const [validRecoveryLink, setValidRecoveryLink] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initializeRecovery = async () => {
      try {
        // Check if we arrived via AuthCallback with ?recovery=true (PKCE flow)
        const isRecoveryParam = searchParams.get('recovery') === 'true';

        // Also check legacy hash-based flow
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hashType = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (isRecoveryParam) {
          // PKCE flow: session was already set by AuthCallback's exchangeCodeForSession
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setValidRecoveryLink(true);
          } else {
            notify('error', 'Link de recuperação inválido ou expirado.');
            setValidRecoveryLink(false);
          }
          return;
        }

        // Legacy hash-based flow
        if (hashType === 'recovery' && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            notify('error', error.message || 'Link de recuperação inválido ou expirado.');
            setValidRecoveryLink(false);
            return;
          }

          setValidRecoveryLink(true);
          return;
        }

        // No valid recovery params found
        setValidRecoveryLink(false);
      } finally {
        setCheckingLink(false);
      }
    };

    initializeRecovery();
  }, [notify, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) return notify('error', 'Preencha ambos os campos de senha');
    if (password !== confirmPassword) return notify('error', 'As senhas não coincidem');
    if (password.length < 8) return notify('error', 'Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) return notify('error', 'Inclua ao menos uma letra maiúscula');
    if (!/[a-z]/.test(password)) return notify('error', 'Inclua ao menos uma letra minúscula');
    if (!/[^A-Za-z0-9]/.test(password)) return notify('error', 'Inclua ao menos um caractere especial');

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) return notify('error', error.message || 'Não foi possível redefinir sua senha.');

    await supabase.auth.signOut();
    notify('success', 'Senha redefinida com sucesso! Faça login com a nova senha.');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <img src={logo} alt="AzD" className="h-20 w-20 mx-auto mb-4 drop-shadow-[0_0_20px_hsl(43,100%,50%,0.3)]" />
          <CardTitle className="text-2xl">Definir nova senha</CardTitle>
          <CardDescription>
            {checkingLink ? 'Validando link...' : validRecoveryLink ? 'Crie uma nova senha para sua conta.' : 'Esse link é inválido ou expirou.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkingLink ? (
            <p className="text-center text-sm text-muted-foreground">Aguarde um instante...</p>
          ) : validRecoveryLink ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <Link to="/forgot-password" className="inline-block text-sm text-gold hover:underline">
                Solicitar novo link
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
