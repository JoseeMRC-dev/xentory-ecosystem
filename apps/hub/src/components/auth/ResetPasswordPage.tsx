/**
 * ResetPasswordPage — secure password reset after email link
 * Route: /reset-password
 * Security: requires active Supabase recovery session, rate-limited,
 * validates strength, logs out all other sessions after change.
 */
import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    {open
      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    }
  </svg>
);

function pwStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (pw.length >= 12)          score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: '',           color: 'transparent' },
    { label: 'Muy débil',  color: 'var(--red)' },
    { label: 'Débil',      color: '#f97316' },
    { label: 'Regular',    color: '#eab308' },
    { label: 'Fuerte',     color: 'var(--green)' },
    { label: 'Muy fuerte', color: 'var(--cyan)' },
  ];
  return { score, ...levels[score] };
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password,  setPw]       = useState('');
  const [confirm,   setConfirm]  = useState('');
  const [showPw,    setShowPw]   = useState(false);
  const [showPw2,   setShowPw2]  = useState(false);
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState('');
  const [success,   setSuccess]  = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checkingSession, setChecking] = useState(true);

  // Verify we have a valid recovery session
  useEffect(() => {
    (async () => {
      const sb = await getSupabase();
      if (!sb) { navigate('/login'); return; }
      const { data } = await sb.auth.getSession();
      if (data.session) {
        setHasSession(true);
      } else {
        // No valid session — link expired or already used
        navigate('/login?error=expired');
      }
      setChecking(false);
    })();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    const strength = pwStrength(password);
    if (strength.score < 2) {
      setError('La contraseña es demasiado débil. Añade números o mayúsculas.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const sb = await getSupabase();
      if (!sb) throw new Error('No se pudo conectar');

      const { error: updateError } = await sb.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Sign out all other sessions for security
      await sb.auth.signOut({ scope: 'others' });

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('same password')) {
        setError('La nueva contraseña debe ser diferente a la actual.');
      } else if (msg.includes('expired') || msg.includes('invalid')) {
        setError('El enlace ha expirado. Solicita un nuevo enlace de recuperación.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError('No se pudo actualizar la contraseña. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = pwStrength(password);

  if (checkingSession) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'radial-gradient(ellipse at 30% 50%,rgba(201,168,76,0.05),transparent 55%)' }}>
      <div className="glass animate-fadeUp" style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: '2.5rem' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
              <span className="text-gradient-gold">Xen</span>
              <span style={{ color: '#4d9fff' }}>tory</span>
            </div>
          </Link>
        </div>

        {success ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.8rem' }}>
              Contraseña actualizada
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '0.5rem' }}>
              Tu contraseña ha sido cambiada correctamente. Las demás sesiones han sido cerradas por seguridad.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Redirigiendo al login...</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>🔐</div>
              <h2 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.4rem' }}>
                Nueva contraseña
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                Elige una contraseña segura para tu cuenta.
              </p>
            </div>

            {/* Security badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.9rem', borderRadius: 8, background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.15)', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem' }}>🔒</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text2)', lineHeight: 1.5 }}>
                Enlace verificado · Sesión cifrada · Las otras sesiones se cerrarán al cambiar
              </span>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* New password */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Nueva contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPw(e.target.value)}
                    autoComplete="new-password"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                    <EyeIcon open={showPw} />
                  </button>
                </div>
                {/* Strength bar */}
                {password.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.25rem' }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength.score ? strength.color : 'var(--border2)', transition: 'background 0.2s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Confirmar contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPw2 ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    style={{ paddingRight: '2.5rem', borderColor: confirm && confirm !== password ? 'var(--red)' : undefined }}
                  />
                  <button type="button" onClick={() => setShowPw2(v => !v)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                    <EyeIcon open={showPw2} />
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--red)', marginTop: '0.25rem', display: 'block' }}>Las contraseñas no coinciden</span>
                )}
              </div>

              {error && (
                <div style={{ padding: '0.7rem 0.9rem', background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-gold btn-lg"
                style={{ justifyContent: 'center', marginTop: '0.3rem', opacity: loading ? 0.7 : 1 }}>
                {loading ? (
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : 'Cambiar contraseña →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.2rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
              ¿Recordaste tu contraseña? <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Inicia sesión</Link>
            </p>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
