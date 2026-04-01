import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCurrency, type Currency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';

// ── SVG ICONS ─────────────────────────────────────────────────────────
const FlagES = () => (
  <svg width="18" height="13" viewBox="0 0 20 14" style={{ display: 'block', borderRadius: 2 }}>
    <rect width="20" height="14" rx="2" fill="#c60b1e"/>
    <rect y="3.5" width="20" height="7" fill="#ffc400"/>
  </svg>
);
const FlagEN = () => (
  <svg width="18" height="13" viewBox="0 0 20 14" style={{ display: 'block', borderRadius: 2 }}>
    <rect width="20" height="14" rx="2" fill="#012169"/>
    <path d="M0 0 L20 14 M20 0 L0 14" stroke="white" strokeWidth="2.5"/>
    <path d="M0 0 L20 14 M20 0 L0 14" stroke="#c8102e" strokeWidth="1.5"/>
    <path d="M10 0 V14 M0 7 H20" stroke="white" strokeWidth="3.5"/>
    <path d="M10 0 V14 M0 7 H20" stroke="#c8102e" strokeWidth="2"/>
  </svg>
);
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.5"/>
    <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const KeyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const DashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const PlanIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const AlertTriangle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const SpinnerIcon = ({ size = 15 }: { size?: number }) => (
  <span style={{ display: 'inline-block', width: size, height: size, border: `2px solid currentColor`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── ICON BUTTON STYLE ─────────────────────────────────────────────────
const IB: CSSProperties = {
  width: 32, height: 32, borderRadius: 7, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  background: 'var(--card2)', border: '1px solid var(--border)',
  cursor: 'pointer', color: 'var(--text2)', transition: 'all 0.18s', flexShrink: 0,
};

// ── COMPONENT ─────────────────────────────────────────────────────────
export function Navbar() {
  const { user, logout }           = useAuth();
  const { currency, setCurrency }  = useCurrency();
  const { theme, toggleTheme }     = useTheme();
  const { lang, toggleLang, t }    = useLang();
  const navigate                   = useNavigate();
  const location                   = useLocation();
  const [scrolled, setScrolled]    = useState(false);
  const [userMenu, setUserMenu]    = useState(false);
  const [mob, setMob]              = useState(false);
  const [settingsModal, setSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'email'|'password'|'delete'>('email');
  const [sField, setSField]        = useState('');
  const [sField2, setSField2]      = useState('');
  const [sBusy, setSBusy]          = useState(false);
  const [sMsg, setSMsg]            = useState<{type:'ok'|'err', text:string}|null>(null);
  const [tickerOn, setTickerOn]    = useState(() => {
    try { return localStorage.getItem('xentory_ticker') !== 'off'; } catch { return true; }
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
    document.body.classList.toggle('menu-open', mob);
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

  // ── TICKER TOGGLE ──────────────────────────────────────────────
  const TickerToggle = () => (
    <button
      onClick={() => setTickerOn(v => !v)}
      title={tickerOn ? 'Hide ticker' : 'Show ticker'}
      style={{ width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: tickerOn ? 'var(--green)' : 'var(--border2)', position: 'relative', transition: 'background 0.22s', flexShrink: 0, padding: 0 }}
      aria-label="Toggle live ticker"
    >
      <span style={{ position: 'absolute', top: 2, left: tickerOn ? 17 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.22s cubic-bezier(0.34,1.56,0.64,1)', display: 'block', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </button>
  );

  // ── QUICK CONTROLS (right side of navbar) ─────────────────────
  const QuickControls = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      {/* Ticker toggle — desktop only, home only */}
      {isHome && (
        <span className="nav-ticker-toggle" style={{ display: 'none', alignItems: 'center', gap: '0.3rem', marginRight: '0.2rem' }}>
          <TickerToggle />
        </span>
      )}
      {/* Currency toggle */}
      <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 7, padding: 3, border: '1px solid var(--border)', gap: 2 }}>
        {(['USD', 'EUR'] as Currency[]).map(c => (
          <button key={c} onClick={() => setCurrency(c)} style={{
            padding: '0.18rem 0.45rem', borderRadius: 5, border: 'none', cursor: 'pointer',
            fontSize: '0.65rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', transition: 'all 0.18s',
            background: currency === c ? 'linear-gradient(135deg,var(--gold),var(--gold-l))' : 'transparent',
            color: currency === c ? 'var(--bg)' : 'var(--muted)',
          }}>{c === 'USD' ? '$' : '€'}</button>
        ))}
      </div>
      {/* Theme toggle */}
      <button onClick={toggleTheme} style={IB} title={theme === 'dark' ? t('nav.lightmode') : t('nav.darkmode')}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; }}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
      {/* Language toggle */}
      <button onClick={toggleLang} style={{ ...IB, overflow: 'hidden', padding: 0 }} title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}>
        {lang === 'es' ? <FlagEN /> : <FlagES />}
      </button>
    </div>
  );

  return (
    <>
      {/* ── NAV BAR ──────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--nav-h)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(1rem, 4vw, 2.5rem)',
        paddingTop: 'env(safe-area-inset-top)',
        background: (scrolled || mob) ? 'var(--nav-bg)' : 'transparent',
        borderBottom: (scrolled || mob) ? '1px solid var(--border)' : '1px solid transparent',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        transition: 'all 0.3s',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.15rem,3vw,1.35rem)', letterSpacing: '-0.04em' }}>
            <span className="text-gradient-gold">Xen</span>
            <span style={{ color: 'var(--cyan)' }}>tory</span>
          </span>
        </Link>

        {/* Desktop centered nav links */}
        <div className="nav-links" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '1.8rem' }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              textDecoration: 'none', fontSize: '0.84rem',
              color: isActive(to) ? 'var(--text)' : 'var(--muted)',
              fontWeight: isActive(to) ? 500 : 400, transition: 'color 0.18s',
              letterSpacing: '0.01em',
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
              {/* Avatar + dropdown */}
              <div style={{ position: 'relative' }}
                onMouseEnter={() => setUserMenu(true)}
                onMouseLeave={() => setUserMenu(false)}
              >
                <button
                  onClick={() => setUserMenu(v => !v)}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', border: 'none',
                    background: 'linear-gradient(135deg,var(--gold),var(--cyan))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '0.8rem', color: 'var(--bg)',
                    padding: 0,
                  }}>
                  {user.name.charAt(0).toUpperCase()}
                </button>
                {userMenu && (
                  <div className="glass-2" style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, borderRadius: 14,
                    minWidth: 200, overflow: 'hidden', border: '1px solid var(--border2)', zIndex: 400,
                    boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.15s ease both',
                    background: 'var(--bg2)',
                  }}>
                    {/* User info */}
                    <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{user.email}</div>
                    </div>
                    {/* Nav actions */}
                    {[
                      { label: t('nav.dashboard'), icon: <DashIcon />, to: '/dashboard' },
                      { label: t('nav.myplans'),   icon: <PlanIcon />, to: '/pricing'   },
                    ].map(item => (
                      <div key={item.to} onClick={() => { navigate(item.to); setUserMenu(false); }}
                        style={{ padding: '0.65rem 1rem', cursor: 'pointer', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text2)', transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ color: 'var(--muted)' }}>{item.icon}</span>{item.label}
                      </div>
                    ))}
                    {/* Account settings */}
                    <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                      {([
                        { key: 'email'    as const, icon: <MailIcon />,  label: t('nav.settings.email')    },
                        { key: 'password' as const, icon: <KeyIcon />,   label: t('nav.settings.password') },
                        { key: 'delete'   as const, icon: <TrashIcon />, label: t('nav.settings.delete')   },
                      ]).map(({ key, icon, label }) => (
                        <div key={key}
                          onClick={() => { setSettingsTab(key); setSettings(true); setSField(''); setSField2(''); setSMsg(null); setUserMenu(false); }}
                          style={{ padding: '0.65rem 1rem', cursor: 'pointer', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: key === 'delete' ? 'var(--red)' : 'var(--text2)', transition: 'background 0.12s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ color: key === 'delete' ? 'var(--red)' : 'var(--muted)' }}>{icon}</span>{label}
                        </div>
                      ))}
                    </div>
                    {/* Logout */}
                    <div onClick={async () => { await logout(); navigate('/'); setUserMenu(false); }}
                      style={{ padding: '0.65rem 1rem', cursor: 'pointer', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--gold)', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.07)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogoutIcon />{t('nav.signout')}
                    </div>
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

        {/* Mobile right — hamburger only (controls moved to drawer) */}
        <div className="nav-mobile-menu" style={{ display: 'none', alignItems: 'center', gap: '0.4rem' }}>
          <button onClick={() => setMob(o => !o)}
            style={{ background: mob ? 'var(--card2)' : 'none', border: mob ? '1px solid var(--border2)' : 'none', borderRadius: 8, cursor: 'pointer', padding: '0.55rem 0.6rem', display: 'flex', flexDirection: 'column', gap: 5, transition: 'all 0.2s', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            aria-label="Menu" onMouseDown={e => e.stopPropagation()}
          >
            <span style={{ display: 'block', width: 22, height: 2, background: mob ? 'var(--gold)' : 'var(--text)', borderRadius: 2, transition: 'all 0.25s', transform: mob ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: mob ? 'var(--gold)' : 'var(--text)', borderRadius: 2, transition: 'all 0.25s', opacity: mob ? 0 : 1 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: mob ? 'var(--gold)' : 'var(--text)', borderRadius: 2, transition: 'all 0.25s', transform: mob ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* ── MOBILE DRAWER ────────────────────────────────────────── */}
      {mob && (
        <>
          <div style={{ position: 'fixed', inset: 0, top: 'var(--nav-h)', background: 'rgba(4,6,15,0.8)', backdropFilter: 'blur(4px)', zIndex: 198, animation: 'fadeIn 0.2s ease both' }} onClick={() => setMob(false)} />
          <div ref={drawerRef} style={{
            position: 'fixed', top: 'var(--nav-h)', left: 0, right: 0, zIndex: 199,
            background: 'var(--bg2)', borderBottom: '1px solid var(--border2)',
            padding: '1.2rem 1.5rem 2rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            animation: 'fadeUp 0.2s ease both',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setMob(false)} style={{
                textDecoration: 'none', padding: '0.85rem 0',
                borderBottom: '1px solid var(--border)',
                fontSize: '1.05rem', color: isActive(to) ? 'var(--gold)' : 'var(--text)',
                fontWeight: isActive(to) ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                minHeight: 48,
              }}>
                {label}
                <span style={{ color: isActive(to) ? 'var(--gold)' : 'var(--muted)', fontSize: '0.9rem' }}>→</span>
              </Link>
            ))}
            {/* Quick settings row in drawer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.9rem', paddingBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {lang === 'es' ? 'Ajustes rápidos' : 'Quick settings'}
              </span>
              <QuickControls />
            </div>
            <div style={{ paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {user ? (
                <>
                  {/* User info chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 0.8rem', background: 'var(--card2)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: '0.2rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--gold),var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: 'var(--bg)' }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                  </div>
                  {/* Dashboard CTA */}
                  <Link to="/dashboard" onClick={() => setMob(false)} style={{
                    textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.9rem 1rem', borderRadius: 12, minHeight: 52,
                    background: 'linear-gradient(135deg,var(--gold),var(--gold-l))', color: 'var(--bg)',
                    fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.95rem',
                    boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
                  }}>
                    <DashIcon /> {t('nav.dashboard')}
                  </Link>
                  {/* Account buttons */}
                  <div className="hub-mob-acct-btns">
                    {([
                      { key: 'email'    as const, label: t('settings.tab.email')    },
                      { key: 'password' as const, label: t('settings.tab.password') },
                    ]).map(({ key, label }) => (
                      <button key={key} onClick={() => { setSettingsTab(key); setSettings(true); setSField(''); setSField2(''); setSMsg(null); setMob(false); }}
                        style={{ flex: 1, padding: '0.7rem 0.5rem', borderRadius: 10, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: '0.82rem', cursor: 'pointer', minHeight: 44 }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* Cancel subscription */}
                  {(user?.subscriptions?.market !== 'free' || user?.subscriptions?.bets !== 'free') && (
                    <button onClick={() => { navigate('/pricing'); setMob(false); }} className="hub-mob-cancel-btn">
                      {t('nav.myplans')} · {t('generic.cancel')}
                    </button>
                  )}
                  {/* Logout */}
                  <button onClick={async () => { await logout(); navigate('/'); setMob(false); }} style={{
                    background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.3)',
                    borderRadius: 12, padding: '0.8rem 1rem', cursor: 'pointer', minHeight: 48,
                    color: 'var(--gold)', fontSize: '0.9rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s',
                  }}>
                    <LogoutIcon /> {t('nav.signout')}
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '0.7rem' }}>
                  <Link to="/login"    onClick={() => setMob(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', minHeight: 48 }}>{t('nav.signin')}</Link>
                  <Link to="/register" onClick={() => setMob(false)} className="btn btn-gold"    style={{ flex: 1, justifyContent: 'center', minHeight: 48, fontWeight: 700 }}>{t('nav.signup')}</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── SETTINGS MODAL ───────────────────────────────────────── */}
      {settingsModal && (
        <>
          <div onClick={() => setSettings(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(4,6,15,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, animation: 'fadeIn 0.2s ease' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001,
            background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 20, padding: '2rem',
            width: 'min(93vw, 420px)', animation: 'fadeUp 0.25s ease',
            boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {settingsTab === 'email'    ? <><MailIcon /> {t('settings.email.title')}</> :
                   settingsTab === 'password' ? <><KeyIcon />  {t('settings.pwd.title')}</> :
                                                <><TrashIcon /> {t('settings.del.title')}</>}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{user?.email}</div>
              </div>
              <button onClick={() => setSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.2rem' }}>
                <XIcon />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 9, padding: 3, marginBottom: '1.4rem', border: '1px solid var(--border)', gap: 2 }}>
              {([
                { key: 'email'    as const, label: t('settings.tab.email')    },
                { key: 'password' as const, label: t('settings.tab.password') },
                { key: 'delete'   as const, label: t('settings.tab.account')  },
              ]).map(({ key, label }) => (
                <button key={key} onClick={() => { setSettingsTab(key); setSField(''); setSField2(''); setSMsg(null); }} style={{
                  flex: 1, padding: '0.42rem', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: '0.78rem', fontWeight: settingsTab === key ? 600 : 400,
                  background: settingsTab === key ? 'var(--card)' : 'transparent',
                  color: settingsTab === key ? (key === 'delete' ? 'var(--red)' : 'var(--text)') : 'var(--muted)',
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>

            {/* Shared input style */}
            {(() => {
              const inputSt: CSSProperties = { width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' };
              const labelSt: CSSProperties = { fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block' };
              const msgStyle = (type: 'ok'|'err'): CSSProperties => ({
                fontSize: '0.8rem', color: type === 'ok' ? 'var(--green)' : 'var(--red)',
                padding: '0.5rem 0.8rem', borderRadius: 7,
                background: type === 'ok' ? 'rgba(0,200,122,0.08)' : 'rgba(240,68,88,0.08)',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              });
              return (
                <>
                  {/* ── EMAIL TAB ── */}
                  {settingsTab === 'email' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div><label style={labelSt}>{t('settings.email.new')}</label><input type="email" placeholder={user?.email} value={sField} onChange={e => setSField(e.target.value)} style={inputSt} /></div>
                      <div><label style={labelSt}>{t('settings.email.confirm')}</label><input type="email" placeholder={t('settings.email.repeat')} value={sField2} onChange={e => setSField2(e.target.value)} style={inputSt} /></div>
                      {sMsg && <div style={msgStyle(sMsg.type)}>{sMsg.type === 'ok' ? <CheckIcon /> : <XIcon />}{sMsg.text}</div>}
                      <button onClick={async () => {
                        if (!sField || sField !== sField2) { setSMsg({ type: 'err', text: t('settings.email.mismatch') }); return; }
                        setSBusy(true);
                        try { const { getSupabase } = await import('../../lib/supabase'); const sb = getSupabase(); if (!sb) throw new Error(); const { error } = await sb.auth.updateUser({ email: sField }); if (error) throw error; setSMsg({ type: 'ok', text: t('settings.email.sent') }); } catch (e: any) { setSMsg({ type: 'err', text: e?.message ?? 'Error' }); } finally { setSBusy(false); }
                      }} disabled={sBusy || !sField} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', opacity: !sField ? 0.5 : 1 }}>
                        {sBusy ? <SpinnerIcon /> : <><CheckIcon />{t('settings.email.btn')}</>}
                      </button>
                    </div>
                  )}
                  {/* ── PASSWORD TAB ── */}
                  {settingsTab === 'password' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div><label style={labelSt}>{t('settings.pwd.new')}</label><input type="password" placeholder={t('settings.pwd.placeholder')} value={sField} onChange={e => setSField(e.target.value)} style={inputSt} /></div>
                      <div><label style={labelSt}>{t('settings.pwd.confirm')}</label><input type="password" placeholder={t('settings.pwd.repeat')} value={sField2} onChange={e => setSField2(e.target.value)} style={inputSt} /></div>
                      {sMsg && <div style={msgStyle(sMsg.type)}>{sMsg.type === 'ok' ? <CheckIcon /> : <XIcon />}{sMsg.text}</div>}
                      <button onClick={async () => {
                        if (!sField || sField.length < 6) { setSMsg({ type: 'err', text: t('settings.pwd.short') }); return; }
                        if (sField !== sField2) { setSMsg({ type: 'err', text: t('settings.pwd.mismatch') }); return; }
                        setSBusy(true);
                        try { const { getSupabase } = await import('../../lib/supabase'); const sb = getSupabase(); if (!sb) throw new Error(); const { error } = await sb.auth.updateUser({ password: sField }); if (error) throw error; setSMsg({ type: 'ok', text: t('settings.pwd.success') }); setSField(''); setSField2(''); } catch (e: any) { setSMsg({ type: 'err', text: e?.message ?? 'Error' }); } finally { setSBusy(false); }
                      }} disabled={sBusy || !sField} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', opacity: !sField ? 0.5 : 1 }}>
                        {sBusy ? <SpinnerIcon /> : <><CheckIcon />{t('settings.pwd.btn')}</>}
                      </button>
                    </div>
                  )}
                  {/* ── DELETE TAB ── */}
                  {settingsTab === 'delete' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(240,68,88,0.07)', border: '1px solid rgba(240,68,88,0.18)', borderRadius: 10, padding: '0.9rem', display: 'flex', gap: '0.6rem' }}>
                        <span style={{ color: 'var(--red)', flexShrink: 0, marginTop: '1px' }}><AlertTriangle /></span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: '0.25rem', fontSize: '0.85rem' }}>{t('settings.del.warning.title')}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>{t('settings.del.warning.desc')}</div>
                        </div>
                      </div>
                      <div><label style={labelSt}>{t('settings.del.confirm')}</label><input type="text" placeholder={t('settings.del.placeholder')} value={sField} onChange={e => setSField(e.target.value)} style={{ ...inputSt, borderColor: sField === t('settings.del.confirm.word') ? 'rgba(240,68,88,0.5)' : 'var(--border)' }} /></div>
                      {sMsg && <div style={msgStyle(sMsg.type)}>{sMsg.type === 'ok' ? <CheckIcon /> : <XIcon />}{sMsg.text}</div>}
                      <button
                        onClick={async () => {
                          if (sField !== t('settings.del.placeholder')) { setSMsg({ type: 'err', text: t('settings.del.wrong') }); return; }
                          setSBusy(true);
                          try { const { getSupabase } = await import('../../lib/supabase'); const sb = getSupabase(); if (!sb) throw new Error(); await sb.auth.signOut(); setSMsg({ type: 'ok', text: t('settings.del.signout') }); setTimeout(() => { logout(); navigate('/'); }, 2500); } catch (e: any) { setSMsg({ type: 'err', text: e?.message ?? 'Error' }); } finally { setSBusy(false); }
                        }}
                        disabled={sBusy || sField !== t('settings.del.placeholder')}
                        style={{ width: '100%', padding: '0.7rem', borderRadius: 9, border: 'none', cursor: sField === t('settings.del.placeholder') ? 'pointer' : 'not-allowed', background: sField === t('settings.del.placeholder') ? 'var(--red)' : 'rgba(240,68,88,0.15)', color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.88rem', transition: 'all 0.2s', opacity: sField === t('settings.del.placeholder') ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        {sBusy ? <SpinnerIcon /> : <><TrashIcon />{t('settings.del.btn')}</>}
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </>
  );
}
