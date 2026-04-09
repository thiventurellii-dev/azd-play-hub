import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseExternal';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const code = params.get('code');
      const type = params.get('type') || hashParams.get('type');

      // If type=recovery is explicitly in URL, handle it immediately
      if (type === 'recovery') {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setError(error.message);
            setTimeout(() => navigate('/login'), 3000);
            return;
          }
        }
        navigate('/reset-password?recovery=true', { replace: true });
        return;
      }

      if (code) {
        // Set up listener BEFORE exchanging code
        let recoveryDetected = false;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            recoveryDetected = true;
          }
        });

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          subscription.unsubscribe();
          setError(error.message);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Wait for auth state change event to fire
        // Use longer wait with polling for reliability
        for (let i = 0; i < 10; i++) {
          if (recoveryDetected) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        subscription.unsubscribe();

        if (recoveryDetected) {
          navigate('/reset-password?recovery=true', { replace: true });
          return;
        }
      }

      // Default: go to home
      navigate('/', { replace: true });
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );
};

export default AuthCallback;
