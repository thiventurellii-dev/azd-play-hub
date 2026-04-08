import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseExternal';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let recoveryDetected = false;

    // Listen for PASSWORD_RECOVERY event which fires during code exchange for recovery flows
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryDetected = true;
      }
    });

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const code = params.get('code');
      const type = params.get('type') || hashParams.get('type');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          setTimeout(() => navigate('/login'), 3000);
          subscription.unsubscribe();
          return;
        }

        // Wait a tick for onAuthStateChange to fire with PASSWORD_RECOVERY
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      subscription.unsubscribe();

      // Redirect based on recovery detection or explicit type param
      if (recoveryDetected || type === 'recovery') {
        navigate('/reset-password?recovery=true', { replace: true });
      } else if (type === 'signup' || type === 'email_change') {
        navigate('/', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    };

    handleCallback();

    return () => {
      subscription.unsubscribe();
    };
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
