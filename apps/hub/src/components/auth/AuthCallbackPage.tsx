/**
 * AuthCallbackPage — maneja el redirect de Google OAuth y Magic Link
 * Ruta: /auth/callback
 *
 * Supabase redirige aquí con el token en el hash/query.
 * El SDK lo procesa automáticamente y onAuthStateChange lo detecta.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const sb = await getSupabase();
      if (!sb) { navigate('/dashboard'); return; }

      // Supabase detecta automáticamente el token en la URL
      const { data, error: err } = await sb.auth.getSession();

      if (err) {
        setError('El enlace ha expirado o no es válido. Solicita uno nuevo.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (data.session) {
        navigate('/dashboard', { replace: true });
      } else {
        // Token procesado pero sin sesión — raro, redirigir a login
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: '1rem',
    }}>
      {error ? (
        <>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <p style={{ color: 'var(--red)', textAlign: 'center', maxWidth: 340 }}>{error}</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Redirigiendo...</p>
        </>
      ) : (
        <>
          <div style={{
            width: 36, height: 36, border: '3px solid var(--gold)',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Verificando sesión...</p>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
