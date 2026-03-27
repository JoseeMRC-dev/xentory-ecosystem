import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLoginProtection } from '../../hooks/useLoginProtection';
import { TurnstileWidget, useCaptcha } from './TurnstileWidget';

type Tab = 'login' | 'register' | 'magic';

const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    {open
      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    }
  </svg>
);

// Password strength checker
function pwStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: '', color: 'transparent' },
    { label: 'Muy débil',  color: 'var(--red)'   },
    { label: 'Débil',      color: '#f97316'       },
    { label: 'Regular',    color: '#eab308'       },
    { label: 'Fuerte',     color: 'var(--green)'  },
    { label: 'Muy fuerte', color: 'var(--cyan)'   },
  ];
  return { score, ...levels[score] };
}

export function AuthPage({ defaultTab = 'login' }: { defaultTab?: Tab }) {
  const [tab, setTab]             = useState<Tab>(defaultTab);
  const [email, setEmail]         = useState('');
  const [password, setPw]         = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [name, setName]           = useState('');
  const [dob, setDob]             = useState('');
  const [ageConsent, setAgeConsent] = useState(false);
  const [terms, setTerms]         = useState(false);
  const [magicSent, setMagicSent]    = useState(false);
  const [showForgot, setShowForgot]  = useState(false);
  const [forgotEmail, setForgotEmail]= useState('');
  const [forgotSent,  setForgotSent] = useState(false);
  const [forgotLoading, setForgotL]  = useState(false);
  const [forgotError, setForgotErr]  = useState('');
  const [confirmEmail, setConfirm]= useState(false);
  const [error, setError]         = useState('');
  const [googleLoading, setGl]    = useState(false);

  const { login, loginWithGoogle, register, sendMagicLink, resetPassword, isLoading } = useAuth();
  const { checkLock, recordFailure, recordSuccess } = useLoginProtection();
  const [lockInfo, setLockInfo] = useState<{ locked: boolean; remainingSec: number }>({ locked: false, remainingSec: 0 });
  const captcha = useCaptcha();

  // Countdown timer for lockout display
  useEffect(() => {
    if (!lockInfo.locked) return;
    const interval = setInterval(() => {
      const check = checkLock(email);
      if (!check.locked) {
        setLockInfo({ locked: false, remainingSec: 0 });
        clearInterval(interval);
      } else {
        setLockInfo({ locked: true, remainingSec: check.remainingSec });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockInfo.locked, email]);
  const navigate   = useNavigate();

  const strength = tab === 'register' ? pwStrength(password) : null;

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');

    if (!email.trim()) { setError('El email es obligatorio.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Introduce un email válido.'); return; }

    try {
      if (tab === 'login') {
        if (!password) { setError('La contraseña es obligatoria.'); return; }

        // Check CAPTCHA
        if (!captcha.isVerified) {
          setError('Por favor, completa la verificación CAPTCHA.');
          return;
        }

        // Check brute-force lock
        const lock = checkLock(email);
        if (lock.locked) {
          setError(`Demasiados intentos fallidos. Espera ${lock.remainingSec}s e inténtalo de nuevo.`);
          setLockInfo({ locked: true, remainingSec: lock.remainingSec });
          return;
        }

        try {
          await login(email, password);
          recordSuccess(email); // Clear failure counter on success
          navigate('/dashboard');
        } catch (loginErr: any) {
          captcha.reset(); // Force re-verification after each failed attempt
          const result = recordFailure(email);
          if (result.locked) {
            setError(`Demasiados intentos. Cuenta bloqueada por ${Math.ceil(result.remainingMs / 1000)}s.`);
            setLockInfo({ locked: true, remainingSec: Math.ceil(result.remainingMs / 1000) });
          } else if (result.attemptsLeft > 0) {
            setError(`Credenciales incorrectas. ${result.attemptsLeft} intento${result.attemptsLeft !== 1 ? 's' : ''} restante${result.attemptsLeft !== 1 ? 's' : ''} antes del bloqueo temporal.`);
          } else {
            setError(loginErr?.message || 'Error al iniciar sesión.');
          }
          return;
        }

      } else if (tab === 'register') {
        // Check CAPTCHA
        if (!captcha.isVerified) {
          setError('Por favor, completa la verificación CAPTCHA.');
          return;
        }

        if (!name.trim())   { setError('El nombre es obligatorio.'); return; }
        if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }

        // Verificación de edad +18 (obligatorio legal)
        if (!dob) { setError('La fecha de nacimiento es obligatoria.'); return; }
        const birthDate = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear() -
          (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
        if (age < 18) {
          setError('Debes ser mayor de 18 años para registrarte. El acceso a contenido de apuestas está prohibido para menores.');
          return;
        }
        if (!ageConsent) { setError('Debes confirmar que eres mayor de 18 años.'); return; }
        if (!terms)         { setError('Debes aceptar los Términos de Uso para registrarte.'); return; }
        await register(email, password, name.trim(), dob);
        navigate('/dashboard');

      } else {
        await sendMagicLink(email);
        setMagicSent(true);
      }
    } catch (err: any) {
      if (err?.message === 'CONFIRM_EMAIL') {
        setConfirm(true);
      } else {
        const msg = err?.message ?? '';
        if (msg.includes('Invalid login credentials')) setError('Email o contraseña incorrectos.');
        else if (msg.includes('Email already registered') || msg.includes('already been registered')) setError('Este email ya está registrado. Inicia sesión.');
        else if (msg.includes('Password should be')) setError('La contraseña debe tener al menos 6 caracteres.');
        else if (msg.includes('rate limit')) setError('Demasiados intentos. Espera un momento.');
        else setError('Ha ocurrido un error. Inténtalo de nuevo.');
      }
    }
  };

  const handleGoogle = async () => {
    setGl(true);
    setError('');
    try {
      await loginWithGoogle();
      // If mock mode (no redirect), navigate manually
      navigate('/dashboard');
    } catch (err: any) {
      setError('Error al conectar con Google. Inténtalo de nuevo.');
    } finally {
      setGl(false);
    }
  };

  const changeTab = (t: Tab) => {
    captcha.reset();
    if (t === 'register') { navigate('/register'); return; }
    if (t === 'login')    { navigate('/login');    return; }
    setTab(t); setError(''); setMagicSent(false); setConfirm(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setForgotErr('El email es obligatorio.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) { setForgotErr('Email no válido.'); return; }
    setForgotL(true);
    setForgotErr('');
    try {
      await resetPassword(forgotEmail);
      setForgotSent(true);
    } catch {
      setForgotErr('No se pudo enviar el correo. Inténtalo de nuevo.');
    } finally {
      setForgotL(false);
    }
  };

  // ── Confirm email screen ─────────────────────────────────────────────
  if (confirmEmail) return (
    <PageWrapper onClose={() => navigate('/')}>
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.8rem' }}>Confirma tu email</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Hemos enviado un enlace de confirmación a<br />
          <strong style={{ color: 'var(--text)' }}>{email}</strong>.<br />
          Haz clic en el enlace para activar tu cuenta.
        </p>
        <button onClick={() => { setConfirm(false); changeTab('login'); }} className="btn btn-outline" style={{ justifyContent: 'center', width: '100%' }}>
          Ya confirmé → Iniciar sesión
        </button>
      </div>
    </PageWrapper>
  );

  // ── Magic link sent screen ────────────────────────────────────────────
  if (magicSent) return (
    <PageWrapper onClose={() => navigate('/')}>
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.8rem' }}>Revisa tu email</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.75, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Hemos enviado un enlace mágico a<br />
          <strong style={{ color: 'var(--text)' }}>{email}</strong>
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          El enlace es de un solo uso y expira en 1 hora.<br />
          Si no lo ves, revisa la carpeta de spam.
        </p>
        <button onClick={() => setMagicSent(false)} className="btn btn-ghost btn-sm" style={{ justifyContent: 'center', width: '100%' }}>
          ← Cambiar email
        </button>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper onClose={() => navigate('/')}>
      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 10, padding: '0.2rem', marginBottom: '0.85rem', gap: '0.1rem' }}>
        {(['login', 'register', 'magic'] as Tab[]).map(t => { const label = t === 'login' ? 'Iniciar sesión' : t === 'register' ? 'Registrarse' : '✉ Enlace mágico'; return (
          <button key={t} onClick={() => changeTab(t)} style={{
            flex: 1, padding: '0.4rem 0.3rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 500, transition: 'all 0.2s',
            background: tab === t ? 'var(--card)' : 'transparent',
            color: tab === t ? 'var(--text)' : 'var(--muted)',
            borderBottom: tab === t ? '1px solid var(--gold)' : '1px solid transparent',
          }}>{label}</button>
        ); })}
      </div>

      {/* Google OAuth */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="btn btn-outline"
        style={{ width: '100%', justifyContent: 'center', marginBottom: '0.7rem', opacity: googleLoading ? 0.7 : 1 }}
      >
        {googleLoading
          ? <Spinner /> : <><GoogleIcon /> Continuar con Google</>
        }
      </button>

      <Divider />

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {tab === 'register' && (
          <Field label="Nombre completo">
            <input className="input" placeholder="Alex Martínez" value={name}
              onChange={e => setName(e.target.value)} autoComplete="name" />
          </Field>
        )}

        {tab === 'register' && (
          <Field label="Fecha de nacimiento">
            <input
              className="input"
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              autoComplete="bday"
            />
          </Field>
        )}

        <Field label="Email">
          <input className="input" type="email" placeholder="your@email.com"
            value={email} onChange={e => setEmail(e.target.value)}
            autoComplete={tab === 'register' ? 'email' : 'username'} />
        </Field>

        {tab !== 'magic' && (
          <Field label={<>
            Contraseña
            {tab === 'login' && (
              <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotSent(false); setForgotErr(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.75rem', padding: 0 }}>
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </>}>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={e => setPw(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
                autoComplete={tab === 'register' ? 'new-password' : 'current-password'} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                <EyeIcon open={showPw} />
              </button>
            </div>
            {/* Password strength bar */}
            {tab === 'register' && password.length > 0 && strength && (
              <div style={{ marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.2rem' }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength.score ? strength.color : 'var(--border2)', transition: 'background 0.2s' }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.7rem', color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </Field>
        )}

        {/* Age consent checkbox — register only */}
        {tab === 'register' && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 0.65rem', borderRadius: 8, background: 'rgba(255,68,85,0.04)', border: `1px solid ${ageConsent ? 'rgba(201,168,76,0.3)' : 'rgba(255,68,85,0.2)'}`, transition: 'border-color 0.2s' }}>
            <div
              onClick={() => setAgeConsent(v => !v)}
              style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                border: `2px solid ${ageConsent ? 'var(--gold)' : 'var(--red)'}`,
                background: ageConsent ? 'var(--gold)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s', cursor: 'pointer',
              }}
            >
              {ageConsent && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text2)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--red)' }}>⚠️</strong>{' '}
              Confirmo que tengo <strong>18 años o más</strong> y entiendo que el juego puede crear adicción. Ayuda: <a href="https://www.jugarbien.es" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--gold)', textDecoration: 'none' }}>jugarbien.es</a>
            </span>
          </label>
        )}

        {/* Terms checkbox — register only */}
        {tab === 'register' && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 0.65rem', borderRadius: 8, background: 'var(--card2)', border: `1px solid ${terms ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`, transition: 'border-color 0.2s' }}>
            <div
              onClick={() => setTerms(v => !v)}
              style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                border: `2px solid ${terms ? 'var(--gold)' : 'var(--border2)'}`,
                background: terms ? 'var(--gold)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s', cursor: 'pointer',
              }}
            >
              {terms && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text2)', lineHeight: 1.45 }}>
              He leído y acepto los <Link to="/terminos" target="_blank" onClick={e => e.stopPropagation()} style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>Términos de Uso</Link>, incluyendo los riesgos asociados a inversiones y apuestas.
            </span>
          </label>
        )}

        {/* Magic link disclaimer */}
        {tab === 'magic' && (
          <div style={{ padding: '0.7rem 0.9rem', borderRadius: 8, background: 'var(--cyan-dim)', border: '1px solid rgba(0,212,255,0.15)', fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.65 }}>
            Te enviaremos un enlace de acceso directo. Es de un solo uso, expira en 1 hora y no necesitas recordar ninguna contraseña.
          </div>
        )}



        {lockInfo.locked && (
        <div style={{
          background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.25)',
          borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🔒</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--red)' }}>Cuenta bloqueada temporalmente</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
              Demasiados intentos fallidos. Inténtalo en <strong style={{ color: 'var(--text)' }}>{lockInfo.remainingSec}s</strong>.
            </div>
          </div>
        </div>
      )}

      {error && (
          <div style={{ padding: '0.7rem 0.9rem', background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: '0.82rem', lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        {/* CAPTCHA — shown for login and register */}
        {(tab === 'login' || tab === 'register') && (
          <TurnstileWidget
            key={captcha.resetKey}
            onVerify={captcha.onVerify}
            onExpire={captcha.onExpire}
            onError={captcha.onError}
            theme="dark"
          />
        )}

        <button type="submit" disabled={isLoading} className="btn btn-gold btn-lg"
          style={{ justifyContent: 'center', marginTop: '0.2rem', opacity: isLoading ? 0.7 : 1 }}>
          {isLoading ? <Spinner /> : (
            tab === 'login'    ? 'Entrar al ecosistema →' :
            tab === 'register' ? 'Crear cuenta →' :
                                 'Enviar enlace →'
          )}
        </button>
      </form>

      {/* Footer links */}
      <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
        {tab === 'login'
          ? <>¿No tienes cuenta? <Link to="/register" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Regístrate gratis →</Link></>
          : tab === 'register'
          ? <>¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Iniciar sesión</Link></>
          : <>Recuerda: el enlace solo funciona una vez · <button onClick={() => changeTab('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.75rem', padding: 0 }}>Volver al login</button></>
        }
      </p>

      {/* ── Forgot password modal ─────────────────────────────── */}
      {showForgot && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(5,8,16,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={() => setShowForgot(false)}>
          <div
            className="glass"
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 400, borderRadius: 18, padding: '2rem', position: 'relative', animation: 'fadeUp 0.2s ease' }}
          >
            {/* Close */}
            <button onClick={() => setShowForgot(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem', lineHeight: 1, padding: '0.2rem 0.4rem', borderRadius: 6, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
              ✕
            </button>

            {forgotSent ? (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>📬</div>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.6rem' }}>
                  Revisa tu email
                </h3>
                <p style={{ color: 'var(--text2)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '0.5rem' }}>
                  Hemos enviado un enlace de recuperación a<br />
                  <strong style={{ color: 'var(--text)' }}>{forgotEmail}</strong>
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.75rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  El enlace expira en 1 hora y es de un solo uso.
                </p>
                <button onClick={() => { setShowForgot(false); }} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                  Entendido
                </button>
                <button onClick={() => { setShowForgot(false); changeTab('login'); }} style={{ marginTop: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.78rem', width: '100%', padding: '0.4rem' }}>
                  Ir al login →
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🔐</div>
                  <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.4rem' }}>
                    Recuperar contraseña
                  </h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                    Te enviaremos un enlace seguro de un solo uso. Expira en 1 hora.
                  </p>
                </div>
                <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Email</label>
                    <input className="input" type="email" placeholder="your@email.com"
                      value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      autoComplete="email" />
                  </div>
                  {forgotError && (
                    <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: '0.8rem' }}>
                      {forgotError}
                    </div>
                  )}
                  <button type="submit" disabled={forgotLoading} className="btn btn-gold btn-lg" style={{ justifyContent: 'center', opacity: forgotLoading ? 0.7 : 1 }}>
                    {forgotLoading
                      ? <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      : 'Enviar enlace →'}
                  </button>
                  <button type="button" onClick={() => setShowForgot(false)} className="btn btn-ghost" style={{ justifyContent: 'center' }}>
                    Iniciar sesión
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI disclaimer at bottom */}
      <p style={{ marginTop: '0.6rem', fontSize: '0.68rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
        ⚠️ Herramienta informativa. No garantiza rentabilidad. <Link to="/terminos" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Términos de Uso</Link>
      </p>
    </PageWrapper>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PageWrapper({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div style={{
      minHeight: '100svh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      paddingTop: 'calc(var(--bar-h) + 0.5rem)',
      paddingBottom: '0.5rem',
      paddingLeft: 'clamp(0.5rem,3vw,1rem)',
      paddingRight: 'clamp(0.5rem,3vw,1rem)',
      background: 'radial-gradient(ellipse at 30% 50%,rgba(201,168,76,0.05) 0%,transparent 55%),radial-gradient(ellipse at 75% 20%,rgba(0,212,255,0.04) 0%,transparent 50%)',
    }}>
      <div className="glass animate-fadeUp" style={{
        width: '100%', maxWidth: 440, borderRadius: 20,
        padding: 'clamp(1rem,3vw,1.5rem)',
        maxHeight: 'calc(100svh - var(--bar-h) - 1rem)',
        overflowY: 'auto', overflowX: 'hidden', position: 'relative',
      }}>
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', fontSize: '0.85rem', lineHeight: 1, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, transition: 'all 0.2s', zIndex: 1 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text2)'; }}
          >✕</button>
        )}
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '0.9rem' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.45rem', letterSpacing: '-0.02em' }}>
              <span className="text-gradient-gold">Xen</span>
              <span style={{ color: 'var(--cyan)' }}>tory</span>
            </div>
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
            {['📈 Market', '⚽ Bet'].map(p => <span key={p} style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{p}</span>)}
            <span style={{ color: 'var(--green)', fontSize: '0.65rem', padding: '0.05rem 0.35rem', background: 'rgba(0,255,136,0.08)', borderRadius: 4, border: '1px solid rgba(0,255,136,0.15)' }}>SSO ✓</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <label style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{label}</label>
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.7rem' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>o</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid var(--bg-hard)80', borderTopColor: 'var(--bg-hard)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
