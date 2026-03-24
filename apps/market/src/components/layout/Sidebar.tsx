import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { QuickBar } from './QuickBar';
import { useLang } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';

const IconDashboard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconMarket = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconWatchlist = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconAnalysis = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const IconAlerts = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconEducation = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconTelegram = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IconPlans = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconSignOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const HUB_URL = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';
const PLAN_COLORS: Record<string, string> = { free: '#6b7294', pro: '#c9a84c', elite: '#00d4ff' };

function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  return (
    <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 6, padding: 3, border: '1px solid var(--border)', gap: 2 }}>
      {(['USD', 'EUR'] as const).map(c => (
        <button key={c} onClick={() => setCurrency(c)}
          style={{ padding: '0.18rem 0.48rem', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, transition: 'all 0.18s', background: currency === c ? 'var(--gold)' : 'transparent', color: currency === c ? '#050810' : 'var(--muted)' }}>
          {c === 'USD' ? '$' : '€'}
        </button>
      ))}
    </div>
  );
}

function NavContent({ onNav }: { onNav?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();

  const NAV = [
    { to: '/dashboard', icon: <IconDashboard />, label: t('Panel principal', 'Dashboard')  },
    { to: '/market',    icon: <IconMarket />,    label: t('Mercados',        'Markets')     },
    { to: '/watchlist', icon: <IconWatchlist />, label: t('Seguimiento',     'Watchlist')   },
    { to: '/analysis',  icon: <IconAnalysis />,  label: t('Análisis',        'Analysis')    },
    { to: '/alerts',    icon: <IconAlerts />,    label: t('Alertas',         'Alerts')      },
    { to: '/education', icon: <IconEducation />, label: t('Formación',       'Education')   },
    { to: '/telegram',  icon: <IconTelegram />,  label: 'Telegram'                          },
    { to: '/plans',     icon: <IconPlans />,     label: t('Planes',          'Plans')       },
  ];

  const PLAN_LABELS: Record<string, string> = { free: t('Básico', 'Basic'), pro: 'Pro', elite: 'Elite' };

  return (
    <>
      <nav style={{ flex: 1, padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.1rem', overflowY: 'auto' }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} onClick={() => onNav?.()}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.7rem',
              padding: '0.52rem 0.8rem', borderRadius: 7, textDecoration: 'none',
              fontSize: '0.85rem', fontWeight: isActive ? 500 : 300,
              color: isActive ? 'var(--text)' : 'var(--muted)',
              background: isActive ? 'var(--card2)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            <span style={{ opacity: 0.75, flexShrink: 0, display: 'flex' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div style={{ padding: '0.8rem 1rem', borderTop: '1px solid var(--border)' }}>
          <div onClick={() => navigate('/plans')} style={{ padding: '0.6rem 0.8rem', borderRadius: 8, background: 'var(--card2)', border: `1px solid ${PLAN_COLORS[user.plan]}22`, cursor: 'pointer', marginBottom: '0.6rem' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{t('Plan activo', 'Active plan')}</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: PLAN_COLORS[user.plan], fontSize: '0.88rem' }}>{PLAN_LABELS[user.plan]}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--gold),var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#050810' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            </div>
            <button onClick={() => { ['xentory_bet_user','xentory_market_user'].forEach(k => { try { localStorage.removeItem(k); } catch {} }); ['xentory_bet_session','xentory_market_session'].forEach(k => { try { sessionStorage.removeItem(k); } catch {} }); logout(); }}
              title={t('Cerrar sesión', 'Sign out')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0.25rem' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            ><IconSignOut /></button>
          </div>
        </div>
      )}
    </>
  );
}

function LogoBlock() {
  const { t } = useLang();
  return (
    <div style={{ padding: '1.1rem 1.2rem 0' }}>
      <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
        <a href={HUB_URL} style={{ textDecoration: 'none' }}><span className="text-gradient-gold">Xentory</span></a>
        <Link to="/dashboard" style={{ textDecoration: 'none' }}><span style={{ color: '#4d9fff' }}>Market</span></Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
        <span className="live-dot" />
        <span style={{ fontSize: '0.58rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('Mercados en vivo', 'Live markets')}</span>
      </div>
      <QuickBar extra={<CurrencyToggle />} />
      <div style={{ height: 1, background: 'var(--border)', marginTop: '0.9rem' }} />
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const fn = () => setIsMobile(window.innerWidth <= 768); fn(); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
  useEffect(() => {
    if (!isMobile) return;
    if (open) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; document.documentElement.style.overflow = ''; };
  }, [open, isMobile]);

  return (
    <>
      {!isMobile && (
        <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 'var(--sidebar-w)', background: 'var(--nav-bg)', borderRight: '1px solid var(--border)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
          <LogoBlock /><NavContent />
        </aside>
      )}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 52, zIndex: 50, background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem' }}>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            <a href={HUB_URL} style={{ textDecoration: 'none' }}><span className="text-gradient-gold">Xentory</span></a>
            <Link to="/dashboard" style={{ textDecoration: 'none' }}><span style={{ color: '#4d9fff' }}>Market</span></Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CurrencyToggle />
            <QuickBar />
            <button onClick={() => setOpen(o => !o)} aria-label="Menu" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[0,1,2].map(i => <span key={i} style={{ display: 'block', width: 20, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'all 0.25s', ...(i===0&&open?{transform:'rotate(45deg) translate(5px,5px)'}:i===1&&open?{opacity:0}:i===2&&open?{transform:'rotate(-45deg) translate(5px,-5px)'}:{}) }} />)}
            </button>
          </div>
        </div>
      )}
      {isMobile && open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(5,8,16,0.6)', backdropFilter: 'blur(3px)', touchAction: 'none' }} />
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 51, background: '#080d1a', display: 'flex', flexDirection: 'column', overflowY: 'auto', overscrollBehavior: 'contain', animation: 'slideDown 0.18s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', height: 52, flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                <a href={HUB_URL} style={{ textDecoration: 'none' }}><span className="text-gradient-gold">Xentory</span></a>
                <Link to="/dashboard" onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}><span style={{ color: '#4d9fff' }}>Market</span></Link>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Cerrar menú" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: 'var(--text)', fontSize: '1.4rem', lineHeight: 1 }}>✕</button>
            </div>
            <NavContent onNav={() => setOpen(false)} />
          </div>
        </>
      )}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>
    </>
  );
}
