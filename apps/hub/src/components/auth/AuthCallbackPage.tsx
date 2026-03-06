/**
 * AuthCallbackPage — handles Google OAuth, Magic Link AND Password Reset
 * Route: /auth/callback
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error,   setError]  = useState('');
  const [status,  setStatus] = useState('Verificando sesión...');

  useEffect(() => {
    (async () => {
      const sb = await getSupabase();
      if (!sb) { navigate('/dashboard'); return; }

      // Check if this is a password reset callback
      const hash   = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', '?'));
      const type   = params.get('type') ?? new URLSearchParams(window.location.search).get('type');

      if (type === 'recovery') {
        setStatus('Preparando cambio de contraseña...');
        // Supabase sets the session from the URL hash automatically
        const { data, error: err } = await sb.auth.getSession();
        if (data.session) {
          navigate('/reset-password', { replace: true });
        } else {
          setError('El enlace de recuperación ha expirado. Solicita uno nuevo.');
          setTimeout(() => navigate('/login'), 3000);
        }
        return;
      }

      // Normal callback (email confirmation, magic link, OAuth)
      const { data, error: err } = await sb.auth.getSession();

      if (err) {
        setError('El enlace ha expirado o no es válido. Solicita uno nuevo.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (data.session) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      {error ? (
        <>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <p style={{ color: 'var(--red)', textAlign: 'center', maxWidth: 340 }}>{error}</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Redirigiendo al login...</p>
        </>
      ) : (
        <>
          <div style={{ width: 36, height: 36, border: '3px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{status}</p>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
