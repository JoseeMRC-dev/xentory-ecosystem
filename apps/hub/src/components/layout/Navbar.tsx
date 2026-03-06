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
  const drawerRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Block body scroll when drawer is open
  useEffect(() => {
    if (mob) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => { document.body.classList.remove('menu-open'); };
  }, [mob]);

  // Close drawer on route change
  useEffect(() => { setMob(false); }, [location.pathname]);

  // Close drawer on outside click
  useEffect(() => {
    if (!mob) return;
    const fn = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) setMob(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [mob]);

  const isActive = (p: string) => location.pathname === p;

  const navLinks = [
    { to: '/pricing',     label: t('nav.pricing') },
    { to: '/blog',        label: t('nav.blog') },
    { to: '/metodologia', label: t('nav.methodology') },
  ];

  // ── Quick controls (theme + lang + currency) ──
  const QuickControls = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      {/* Currency */}
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
      {/* Theme */}
      <button onClick={toggleTheme} style={IB} title={theme === 'dark' ? t('nav.lightmode') : t('nav.darkmode')}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.color='var(--gold)'}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text2)'}}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
      {/* Language */}
      <button onClick={toggleLang} style={{ ...IB, overflow: 'hidden', padding: 0 }} title={lang === 'es' ? 'English' : 'Español'}>
        {lang === 'es' ? <FlagEN /> : <FlagES />}
      </button>
    </div>
  );

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--nav-h)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(1rem, 4vw, 2.5rem)',
        background: (scrolled || mob) ? 'var(--nav-bg)' : 'transparent',
        borderBottom: (scrolled || mob) ? '1px solid var(--border)' : '1px solid transparent',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        transition: 'all 0.3s',
      }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Urbanist', fontWeight: 900, fontSize: 'clamp(1.2rem,3vw,1.4rem)', letterSpacing: '-0.03em' }}>
            <span className="text-gradient-gold">Xen</span>
            <span style={{ color: 'var(--cyan)' }}>tory</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.6rem' }}>
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
          {/* Hamburger button */}
          <button
            onClick={() => setMob(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', display: 'flex', flexDirection: 'column', gap: 5 }}
            aria-label="Menu"
            onMouseDown={e => e.stopPropagation()}
          >
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'all 0.25s', transformOrigin: 'center', transform: mob ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'all 0.25s', opacity: mob ? 0 : 1 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'all 0.25s', transformOrigin: 'center', transform: mob ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer — solo links y auth */}
      {mob && (
        <div ref={drawerRef} className="glass-2 mobile-drawer" style={{
          position: 'fixed', top: 'var(--nav-h)', left: 0, right: 0, zIndex: 99,
          padding: '1rem 1.5rem 1.5rem', borderBottom: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
          animation: 'fadeIn 0.18s ease both',
        }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} onClick={() => setMob(false)} style={{
              textDecoration: 'none', padding: '0.55rem 0',
              borderBottom: '1px solid var(--border)', fontSize: '1rem',
              color: isActive(to) ? 'var(--gold)' : 'var(--text)', fontWeight: isActive(to) ? 600 : 400,
            }}>{label}</Link>
          ))}

          <div style={{ paddingTop: '0.25rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {user ? (
              <>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{user.email}</div>
                <Link to="/dashboard" onClick={() => setMob(false)} className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>{t('nav.dashboard')}</Link>
                <button onClick={() => { logout(); navigate('/'); setMob(false); }}
                  className="btn btn-sm"
                  style={{ background: 'rgba(255,68,85,0.08)', color: 'var(--red)', border: '1px solid rgba(255,68,85,0.2)', justifyContent: 'center' }}
                >{t('nav.signout')}</button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to="/login"    onClick={() => setMob(false)} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>{t('nav.signin')}</Link>
                <Link to="/register" onClick={() => setMob(false)} className="btn btn-gold btn-sm"    style={{ flex: 1, justifyContent: 'center' }}>{t('nav.signup')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
