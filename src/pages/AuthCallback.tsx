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

      // PKCE code exchange
      const code = params.get('code');
      const type = params.get('type') || hashParams.get('type');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
      }

      // Redirect based on type
      if (type === 'recovery') {
        navigate('/reset-password' + window.location.hash, { replace: true });
      } else if (type === 'signup' || type === 'email_change') {
        navigate('/', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
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
