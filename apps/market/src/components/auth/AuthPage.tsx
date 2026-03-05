import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

type Tab = 'login' | 'register' | 'magic';

export function AuthPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithGoogle, register, sendMagicLink, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError('');
    try {
      if (tab === 'login') {
        await login(email, password);
        navigate('/dashboard');
      } else if (tab === 'register') {
        await register(email, password, name);
        navigate('/dashboard');
      } else {
        await sendMagicLink(email);
        setMagicSent(true);
      }
    } catch {
      setError('Ha ocurrido un error. Inténtalo de nuevo.');
    }
  };

  const handleGoogle = async () => {
    await loginWithGoogle();
    navigate('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
    }}>
      {/* BG */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 30% 50%, rgba(201,168,76,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(0,212,255,0.05) 0%, transparent 50%)',
      }} />

      <div className="glass animate-fadeUp" style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 440,
        borderRadius: 20,
        padding: '2.5rem',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '0.3rem' }}>
            <span className="text-gradient-gold">Xen</span>
            <span style={{ color: 'var(--gold)' }}> Market</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Terminal de análisis institucional</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--card2)',
          borderRadius: 10,
          padding: '0.25rem',
          marginBottom: '1.8rem',
          gap: '0.15rem',
        }}>
          {(['login', 'register', 'magic'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setMagicSent(false); }}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: 8,
                border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans', fontSize: '0.82rem', fontWeight: 500,
                background: tab === t ? 'var(--card)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--muted)',
                borderBottom: tab === t ? '1px solid var(--gold)' : '1px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {t === 'login' ? 'Iniciar sesión' : t === 'register' ? 'Registrarse' : '✉ Magic Link'}
            </button>
          ))}
        </div>

        {/* Google Button */}
        <button onClick={handleGoogle} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginBottom: '1.2rem', gap: '0.6rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continuar con Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>o</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Form */}
        {magicSent ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✉️</div>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Revisa tu email</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Hemos enviado un Magic Link a <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              Haz clic en el enlace para acceder.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {tab === 'register' && (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Nombre completo</label>
                <input className="input" placeholder="Alex Martínez" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Email</label>
              <input className="input" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {tab !== 'magic' && (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Contraseña</label>
                <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              </div>
            )}

            {error && (
              <div style={{ padding: '0.7rem 1rem', background: 'rgba(255,68,85,0.1)', border: '1px solid rgba(255,68,85,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="btn btn-gold btn-lg"
              style={{ justifyContent: 'center', marginTop: '0.4rem', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? (
                <span className="animate-spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #050810', borderTopColor: 'transparent', borderRadius: '50%' }} />
              ) : tab === 'login' ? 'Entrar al terminal' : tab === 'register' ? 'Crear cuenta' : 'Enviar Magic Link'}
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
          Al acceder aceptas los{' '}
          <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Términos de uso</a>
          {' '}y la{' '}
          <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Política de privacidad</a>
        </p>
      </div>
    </div>
  );
}
