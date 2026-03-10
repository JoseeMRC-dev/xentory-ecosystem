import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCurrency, type Currency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';

const FlagES = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" style={{ display: 'block' }}>
    <rect width="20" height="14" rx="2" fill="#c60b1e"/>
    <rect y="3.5" width="20" height="7" fill="#ffc400"/>
  </svg>
);
const FlagEN = () => (
  <svg width="20" height="14" viewBox="0 0 20 14" style={{ display: 'block' }}>
    <rect width="20" height="14" rx="2" fill="#012169"/>
    <path d="M0 0 L20 14 M20 0 L0 14" stroke="white" strokeWidth="2.5"/>
    <path d="M0 0 L20 14 M20 0 L0 14" stroke="#c8102e" strokeWidth="1.5"/>
    <path d="M10 0 V14 M0 7 H20" stroke="white" strokeWidth="3.5"/>
    <path d="M10 0 V14 M0 7 H20" stroke="#c8102e" strokeWidth="2"/>
  </svg>
);
const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.5"/>
    <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const IB: CSSProperties = {
  width: 32, height: 32, borderRadius: 7, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  background: 'var(--card2)', border: '1px solid var(--border)',
  cursor: 'pointer', color: 'var(--text2)', transition: 'all 0.18s', flexShrink: 0,
};

export function Navbar() {
  const { user, logout }            = useAuth();
  const { currency, setCurrency }   = useCurrency();
  const { theme, toggleTheme }      = useTheme();
  const { lang, toggleLang, t }     = useLang();
  const navigate                    = useNavigate();
  const location                    = useLocation();
  const [scrolled, setScrolled]     = useState(false);
  const [userMenu, setUserMenu]     = useState(false);
  const [mob, setMob]               = useState(false);
  const [settingsModal, setSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'email'|'password'|'delete'>('email');
  const [sField, setSField]          = useState('');
  const [sField2, setSField2]        = useState('');
  const [sBusy, setSBusy]            = useState(false);
  const [sMsg, setSMsg]              = useState<{type:'ok'|'err',text:string}|null>(null);
  const [tickerOn, setTickerOn]     = useState(() => {
    try { return localStorage.getItem('xentory_ticker') !== 'off'; }
    catch { return true; }
  });
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('xentory_ticker', tickerOn ? 'on' : 'off'); } catch { /**/ }
    document.documentElement.classList.toggle('ticker-hidden', !tickerOn);
  }, [tickerOn]);

  useEffect(() => {
    if (mob) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => { document.body.classList.remove('menu-open'); };
  }, [mob]);

  useEffect(() => { setMob(false); }, [location.pathname]);

  useEffect(() => {
    if (!mob) return;
    const fn = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) setMob(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [mob]);

  const isActive = (p: string) => location.pathname === p;
  const isHome   = location.pathname === '/';

  const navLinks = [
    { to: '/pricing',     label: t('nav.pricing') },
    { to: '/blog',        label: t('nav.blog') },
    { to: '/metodologia', label: t('nav.methodology') },
  ];

  const TickerToggle = () => (
    <button
      onClick={() => setTickerOn(v => !v)}
      title={tickerOn ? 'Hide ticker' : 'Show ticker'}
      style={{
        width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: tickerOn ? 'var(--green)' : 'var(--border2)',
        position: 'relative', transition: 'background 0.22s',
        flexShrink: 0, padding: 0,
        boxShadow: tickerOn ? '0 0 8px rgba(0,204,106,0.35)' : 'none',
      }}
      aria-label="Toggle live ticker"
    >
      <span style={{
        position: 'absolute', top: 3, left: tickerOn ? 19 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: 'white', transition: 'left 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)', display: 'block',
      }} />
    </button>
  );

  const QuickControls = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      {isHome && <span className="nav-ticker-toggle" style={{ display: 'none', alignItems: 'center', gap: '0.3rem' }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>📊</span>
        <TickerToggle />
      </span>}
      <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 7, padding: 3, border: '1px solid var(--border)', gap: 2 }}>
        {(['USD', 'EUR'] as Currency[]).map(c => (
          <button key={c} onClick={() => setCurrency(c)} style={{
            padding: '0.2rem 0.5rem', borderRadius: 5, border: 'none', cursor: 'pointer',
            fontSize: '0.68rem', fontWeight: 700, fontFamily: 'Urbanist', transition: 'all 0.18s',
            background: currency === c ? 'linear-gradient(135deg,var(--gold),var(--gold-l))' : 'transparent',
            color: currency === c ? 'var(--bg)' : 'var(--muted)',
          }}>{c === 'USD' ? '$' : '€'}</button>
        ))}
      </div>
      <button onClick={toggleTheme} style={IB} title={theme === 'dark' ? t('nav.lightmode') : t('nav.darkmode')}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.color='var(--gold)'}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text2)'}}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
      <button onClick={toggleLang} style={{ ...IB, overflow: 'hidden', padding: 0 }} title={lang === 'es' ? 'English' : 'Español'}>
        {lang === 'es' ? <FlagEN /> : <FlagES />}
      </button>
    </div>
  );

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--nav-h)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(1rem, 4vw, 2.5rem)',
        background: (scrolled || mob) ? 'var(--nav-bg)' : 'transparent',
        borderBottom: (scrolled || mob) ? '1px solid var(--border)' : '1px solid transparent',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        transition: 'all 0.3s',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Urbanist', fontWeight: 900, fontSize: 'clamp(1.2rem,3vw,1.4rem)', letterSpacing: '-0.03em' }}>
            <span className="text-gradient-gold">Xen</span>
            <span style={{ color: '#4d9fff' }}>tory</span>
          </span>
        </Link>

        {/* Desktop nav links — centered */}
        <div className="nav-links" style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '1.6rem',
        }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              textDecoration: 'none', fontSize: '0.86rem',
              color: isActive(to) ? 'var(--text)' : 'var(--muted)',
              fontWeight: isActive(to) ? 600 : 400, transition: 'color 0.2s',
            }}
              onMouseEnter={e => { if (!isActive(to)) e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { if (!isActive(to)) e.currentTarget.style.color = 'var(--muted)'; }}
            >{label}</Link>
          ))}
        </div>

        {/* Desktop right */}
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <QuickControls />
          {user ? (
            <>
              <Link to="/dashboard" className="btn btn-ghost btn-sm">{t('nav.dashboard')}</Link>
              <div style={{ position: 'relative' }}
                onMouseEnter={() => setUserMenu(true)}
                onMouseLeave={() => setUserMenu(false)}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
                  background: 'linear-gradient(135deg,var(--gold),var(--cyan))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.85rem', color: 'var(--bg)',
                }}>{user.name.charAt(0).toUpperCase()}</div>
                {userMenu && (
                  <div className="glass-2" style={{
                    position: 'absolute', top: '110%', right: 0, borderRadius: 12,
                    minWidth: 190, overflow: 'hidden', border: '1px solid var(--border2)', zIndex: 200,
                  }}>
                    <div style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{user.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{user.email}</div>
                    </div>
                    {[
                      { label: t('nav.dashboard'), to: '/dashboard' },
                      { label: t('nav.myplans'), to: '/pricing' },
                    ].map(item => (
                      <div key={item.to}
                        onClick={() => { navigate(item.to); setUserMenu(false); }}
                        style={{ padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.84rem', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >{item.label}</div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {[
                        { label: '✉️ Modificar correo',     tab: 'email'    as const },
                        { label: '🔑 Cambiar contraseña',   tab: 'password' as const },
                        { label: '🗑️ Eliminar cuenta',       tab: 'delete'   as const },
                      ].map(({ label, tab }) => (
                        <div key={tab}
                          onClick={() => { setSettingsTab(tab); setSettings(true); setSField(''); setSField2(''); setSMsg(null); setUserMenu(false); }}
                          style={{ padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.82rem', color: tab === 'delete' ? 'var(--red)' : 'var(--text2)', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >{label}</div>
                      ))}
                    </div>
                    <div
                      onClick={() => { logout(); navigate('/'); setUserMenu(false); }}
                      style={{ padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--red)', borderTop: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,68,85,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >{t('nav.signout')}</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn btn-ghost btn-sm">{t('nav.signin')}</Link>
              <Link to="/register" className="btn btn-gold btn-sm">{t('nav.signup')}</Link>
            </>
          )}
        </div>

        {/* Mobile right — QuickControls + Hamburger */}
        <div className="nav-mobile-menu" style={{ display: 'none', alignItems: 'center', gap: '0.5rem' }}>
          <QuickControls />
          <button
            onClick={() => setMob(o => !o)}
            style={{
              background: mob ? 'var(--card2)' : 'none',
              border: mob ? '1px solid var(--border2)' : 'none',
              borderRadius: 8,
              cursor: 'pointer', padding: '0.4rem 0.5rem',
              display: 'flex', flexDirection: 'column', gap: 5,
              transition: 'all 0.2s',
            }}
            aria-label="Menu"
            onMouseDown={e => e.stopPropagation()}
          >
            <span style={{ display: 'block', width: 22, height: 2, background: mob ? 'var(--gold)' : 'var(--text)', borderRadius: 2, transition: 'all 0.25s', transformOrigin: 'center', transform: mob ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: mob ? 'var(--gold)' : 'var(--text)', borderRadius: 2, transition: 'all 0.25s', opacity: mob ? 0 : 1 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: mob ? 'var(--gold)' : 'var(--text)', borderRadius: 2, transition: 'all 0.25s', transformOrigin: 'center', transform: mob ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* ── MOBILE DRAWER OVERLAY + PANEL ── */}
      {mob && (
        <>
          {/* Dark overlay */}
          <div
            style={{
              position: 'fixed', inset: 0,
              top: 'var(--nav-h)',
              background: 'rgba(5,8,16,0.75)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 98,
              animation: 'fadeIn 0.2s ease both',
            }}
            onClick={() => setMob(false)}
          />
          {/* Drawer panel */}
          <div
            ref={drawerRef}
            className="mobile-drawer"
            style={{
              position: 'fixed',
              top: 'var(--nav-h)',
              left: 0, right: 0,
              zIndex: 199,
              background: 'var(--bg2)',
              borderBottom: '1px solid var(--border2)',
              padding: '1.2rem 1.5rem 1.8rem',
              display: 'flex', flexDirection: 'column', gap: '0.6rem',
              animation: 'fadeUp 0.2s ease both',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Nav links */}
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setMob(false)} style={{
                textDecoration: 'none',
                padding: '0.7rem 0',
                borderBottom: '1px solid var(--border)',
                fontSize: '1rem',
                color: isActive(to) ? 'var(--gold)' : 'var(--text)',
                fontWeight: isActive(to) ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                {label}
                <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>→</span>
              </Link>
            ))}

            {/* Auth section */}
            <div style={{ paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {user ? (
                <>
                  {/* User info */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.7rem',
                    padding: '0.6rem 0.8rem',
                    background: 'var(--card2)', borderRadius: 10,
                    border: '1px solid var(--border)',
                    marginBottom: '0.2rem',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,var(--gold),var(--cyan))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.9rem', color: 'var(--bg)',
                    }}>{user.name.charAt(0).toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                  </div>

                  {/* Dashboard — botón destacado */}
                  <Link
                    to="/dashboard"
                    onClick={() => setMob(false)}
                    style={{
                      textDecoration: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, var(--gold), var(--gold-l))',
                      color: 'var(--bg)',
                      fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.95rem',
                      boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    📊 {t('nav.dashboard')}
                  </Link>

                  {/* Ajustes de cuenta */}
                  <div className="hub-mob-acct-btns">
                    {[
                      { label: '✉️ Correo',     tab: 'email'    as const },
                      { label: '🔑 Contraseña', tab: 'password' as const },
                    ].map(({ label, tab }) => (
                      <button key={tab}
                        onClick={() => { setSettingsTab(tab); setSettings(true); setSField(''); setSField2(''); setSMsg(null); setMob(false); }}
                        style={{ flex: 1, padding: '0.5rem 0.4rem', borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: '0.78rem', cursor: 'pointer' }}
                      >{label}</button>
                    ))}
                  </div>

                  {/* Cancelar suscripción */}
                  {(user?.subscriptions?.market !== 'free' || user?.subscriptions?.bets !== 'free') && (
                    <button
                      onClick={() => { navigate('/pricing'); setMob(false); }}
                      className="hub-mob-cancel-btn"
                      style={{}}
                    >
                      ⚙️ {user?.subscriptions?.market !== 'free' ? `Plan ${user?.subscriptions?.market === 'pro' ? 'Pro' : 'Elite'}` : `Plan ${user?.subscriptions?.bets === 'pro' ? 'Pro' : 'Elite'}`} · Cancelar suscripción
                    </button>
                  )}

                  {/* Cerrar sesión */}
                  <button
                    onClick={() => { logout(); navigate('/'); setMob(false); }}
                    style={{
                      background: 'rgba(255,68,85,0.08)',
                      border: '1px solid rgba(255,68,85,0.35)',
                      borderRadius: 10,
                      padding: '0.65rem 1rem',
                      cursor: 'pointer',
                      color: 'var(--red)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,68,85,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,68,85,0.6)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,68,85,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,68,85,0.35)'; }}
                  >
                    {t('nav.signout')}
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to="/login"    onClick={() => setMob(false)} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>{t('nav.signin')}</Link>
                  <Link to="/register" onClick={() => setMob(false)} className="btn btn-gold btn-sm"    style={{ flex: 1, justifyContent: 'center' }}>{t('nav.signup')}</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {/* ── SETTINGS MODAL ─────────────────────────────── */}
      {settingsModal && (
        <>
          <div
            onClick={() => setSettings(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, animation: 'fadeIn 0.2s ease' }}
          />
          <div className="hub-settings-modal" style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            zIndex: 1001,
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 20, padding: '2rem',
            width: 'min(92vw, 420px)',
            animation: 'fadeUp 0.25s ease',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.15rem' }}>
                  {settingsTab === 'email'    ? '✉️ Modificar correo'
                  : settingsTab === 'password' ? '🔑 Cambiar contraseña'
                  :                              '🗑️ Eliminar cuenta'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{user?.email}</div>
              </div>
              <button onClick={() => setSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.3rem', lineHeight: 1 }}>✕</button>
            </div>

            {/* Tabs */}
            <div className="hub-settings-tabs">
              {([
                { tab: 'email'    as const, label: 'Correo' },
                { tab: 'password' as const, label: 'Contraseña' },
                { tab: 'delete'   as const, label: 'Cuenta' },
              ] as {tab:'email'|'password'|'delete', label:string}[]).map(({ tab, label }) => (
                <button key={tab} onClick={() => { setSettingsTab(tab); setSField(''); setSField2(''); setSMsg(null); }} style={{
                  flex: 1, padding: '0.45rem', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: settingsTab === tab ? 700 : 400,
                  background: settingsTab === tab ? 'var(--card)' : 'transparent',
                  color: settingsTab === tab ? (tab === 'delete' ? 'var(--red)' : 'var(--text)') : 'var(--muted)',
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>

            {/* Email tab */}
            {settingsTab === 'email' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Nuevo correo</div>
                  <input type="email" placeholder={user?.email} value={sField} onChange={e => setSField(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Confirmar correo</div>
                  <input type="email" placeholder="Repite el correo" value={sField2} onChange={e => setSField2(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {sMsg && <div style={{ fontSize: '0.8rem', color: sMsg.type === 'ok' ? 'var(--green)' : 'var(--red)', padding: '0.5rem 0.8rem', borderRadius: 7, background: sMsg.type === 'ok' ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,85,0.08)' }}>{sMsg.text}</div>}
                <button
                  onClick={async () => {
                    if (!sField || sField !== sField2) { setSMsg({ type: 'err', text: 'Los correos no coinciden' }); return; }
                    setSBusy(true);
                    try {
                      const { getSupabase } = await import('../../lib/supabase');
                      const sb = getSupabase();
                      if (!sb) throw new Error('no supabase');
                      const { error } = await sb.auth.updateUser({ email: sField });
                      if (error) throw error;
                      setSMsg({ type: 'ok', text: 'Revisa tu bandeja — te enviamos un enlace de confirmación.' });
                    } catch (e: any) {
                      setSMsg({ type: 'err', text: e?.message ?? 'Error al actualizar' });
                    } finally { setSBusy(false); }
                  }}
                  disabled={sBusy || !sField}
                  className="btn btn-gold"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.2rem', opacity: !sField ? 0.5 : 1 }}
                >
                  {sBusy ? '⏳ Guardando…' : '✓ Actualizar correo'}
                </button>
              </div>
            )}

            {/* Password tab */}
            {settingsTab === 'password' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Nueva contraseña</div>
                  <input type="password" placeholder="Mínimo 6 caracteres" value={sField} onChange={e => setSField(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Confirmar contraseña</div>
                  <input type="password" placeholder="Repite la contraseña" value={sField2} onChange={e => setSField2(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {sMsg && <div style={{ fontSize: '0.8rem', color: sMsg.type === 'ok' ? 'var(--green)' : 'var(--red)', padding: '0.5rem 0.8rem', borderRadius: 7, background: sMsg.type === 'ok' ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,85,0.08)' }}>{sMsg.text}</div>}
                <button
                  onClick={async () => {
                    if (!sField || sField.length < 6) { setSMsg({ type: 'err', text: 'Mínimo 6 caracteres' }); return; }
                    if (sField !== sField2) { setSMsg({ type: 'err', text: 'Las contraseñas no coinciden' }); return; }
                    setSBusy(true);
                    try {
                      const { getSupabase } = await import('../../lib/supabase');
                      const sb = getSupabase();
                      if (!sb) throw new Error('no supabase');
                      const { error } = await sb.auth.updateUser({ password: sField });
                      if (error) throw error;
                      setSMsg({ type: 'ok', text: '¡Contraseña actualizada correctamente!' });
                      setSField(''); setSField2('');
                    } catch (e: any) {
                      setSMsg({ type: 'err', text: e?.message ?? 'Error al actualizar' });
                    } finally { setSBusy(false); }
                  }}
                  disabled={sBusy || !sField}
                  className="btn btn-gold"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.2rem', opacity: !sField ? 0.5 : 1 }}
                >
                  {sBusy ? '⏳ Guardando…' : '✓ Cambiar contraseña'}
                </button>
              </div>
            )}

            {/* Delete tab */}
            {settingsTab === 'delete' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', borderRadius: 10, padding: '1rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: '0.4rem', fontSize: '0.88rem' }}>⚠️ Esta acción es irreversible</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    Se eliminarán todos tus datos, suscripciones y configuraciones. No podrás recuperar tu cuenta.
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Escribe "ELIMINAR" para confirmar</div>
                  <input type="text" placeholder="ELIMINAR" value={sField} onChange={e => setSField(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, background: 'var(--card2)', border: '1px solid rgba(255,68,85,0.3)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {sMsg && <div style={{ fontSize: '0.8rem', color: sMsg.type === 'ok' ? 'var(--green)' : 'var(--red)', padding: '0.5rem 0.8rem', borderRadius: 7, background: sMsg.type === 'ok' ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,85,0.08)' }}>{sMsg.text}</div>}
                <button
                  onClick={async () => {
                    if (sField !== 'ELIMINAR') { setSMsg({ type: 'err', text: 'Escribe exactamente "ELIMINAR"' }); return; }
                    setSBusy(true);
                    try {
                      const { getSupabase } = await import('../../lib/supabase');
                      const sb = getSupabase();
                      if (!sb) throw new Error('no supabase');
                      // Supabase requires admin to delete user — sign out and show message
                      await sb.auth.signOut();
                      setSMsg({ type: 'ok', text: 'Sesión cerrada. Contacta soporte para eliminar tus datos permanentemente.' });
                      setTimeout(() => { logout(); navigate('/'); }, 2500);
                    } catch (e: any) {
                      setSMsg({ type: 'err', text: e?.message ?? 'Error' });
                    } finally { setSBusy(false); }
                  }}
                  disabled={sBusy || sField !== 'ELIMINAR'}
                  style={{
                    width: '100%', padding: '0.7rem', borderRadius: 9, border: 'none', cursor: sField === 'ELIMINAR' ? 'pointer' : 'not-allowed',
                    background: sField === 'ELIMINAR' ? 'var(--red)' : 'rgba(255,68,85,0.2)',
                    color: 'white', fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.9rem',
                    transition: 'all 0.2s', marginTop: '0.2rem', opacity: sField === 'ELIMINAR' ? 1 : 0.5,
                  }}
                >
                  {sBusy ? '⏳ Procesando…' : '🗑️ Eliminar mi cuenta'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
