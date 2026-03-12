/**
 * AuthCallbackPage — handles Magic Link, Google OAuth, Email Confirm, Password Reset
 * Route: /auth/callback
 *
 * Supabase can pass tokens in:
 *   - URL hash:  #access_token=...&refresh_token=...&type=magiclink|recovery|signup
 *   - URL query: ?code=...  (PKCE flow, OAuth)
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error,  setError]  = useState('');
  const [status, setStatus] = useState('Verificando sesión...');

  useEffect(() => {
    (async () => {
      try {
        // ── Parse both hash and query params ──────────────────────
        const hash        = window.location.hash;
        const hashParams  = new URLSearchParams(hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(window.location.search);

        const type         = hashParams.get('type') ?? queryParams.get('type') ?? '';
        const code         = queryParams.get('code') ?? '';         // PKCE / OAuth
        const accessToken  = hashParams.get('access_token')  ?? '';
        const refreshToken = hashParams.get('refresh_token') ?? '';

        console.log('[callback] type:', type, '| code:', !!code, '| access_token:', !!accessToken);

        // ── 1. PKCE / OAuth code exchange ─────────────────────────
        if (code) {
          setStatus('Completando autenticación...');
          const { data, error: err } = await supabase.auth.exchangeCodeForSession(code);
          if (err) throw err;
          if (data.session) {
            if (type === 'recovery') {
              navigate('/reset-password', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
            return;
          }
        }

        // ── 2. Hash-based token (Magic Link, email confirm, recovery) ──
        if (accessToken && refreshToken) {
          setStatus('Iniciando sesión...');
          const { data, error: err } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });
          console.log('[callback] setSession user:', data.session?.user?.email ?? null, err?.message ?? null);

          if (err) throw err;

          if (data.session) {
            if (type === 'recovery') {
              setStatus('Preparando cambio de contraseña...');
              navigate('/reset-password', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
            return;
          }
        }

        // ── 3. Fallback: check if session already exists ───────────
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/dashboard', { replace: true });
          return;
        }

        // Nothing worked
        throw new Error('No se pudo verificar la sesión');

      } catch (e: any) {
        console.error('[callback] error:', e);
        const msg = e?.message ?? '';
        if (msg.includes('expired') || msg.includes('invalid')) {
          setError('El enlace ha expirado o ya fue usado. Solicita uno nuevo.');
        } else {
          setError('Error al verificar el enlace. Inténtalo de nuevo.');
        }
        setTimeout(() => navigate('/login', { replace: true }), 3500);
      }
    })();
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: '1rem',
      background: 'var(--bg)',
    }}>
      {error ? (
        <>
          <div style={{ fontSize: '2.5rem' }}>⚠️</div>
          <p style={{ color: 'var(--red)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6, fontSize: '0.9rem' }}>{error}</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Redirigiendo al login...</p>
        </>
      ) : (
        <>
          <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            <span style={{ color: '#c9a84c' }}>Xen</span>
            <span style={{ color: '#4d9fff' }}>tory</span>
          </div>
          <div style={{
            width: 36, height: 36, border: '3px solid var(--gold)',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{status}</p>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
