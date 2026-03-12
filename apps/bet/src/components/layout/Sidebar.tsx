import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { QuickBar } from './QuickBar';
import { useLang } from '../../context/LanguageContext';

const IconDashboard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconMatches = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconAnalysis = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);
const IconHistory = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
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
const SPORTS = [
  { key: 'football', label: 'Football' }, { key: 'tennis', label: 'Tennis' },
  { key: 'basketball', label: 'Basketball' }, { key: 'f1', label: 'Formula 1' }, { key: 'golf', label: 'Golf' },
];

function NavContent({ onNav }: { onNav?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();

  const NAV = [
    { to: '/dashboard', icon: <IconDashboard />, label: t('Panel principal', 'Dashboard')   },
    { to: '/matches',   icon: <IconMatches />,   label: t('Partidos',        'Matches')      },
    { to: '/analysis',  icon: <IconAnalysis />,  label: t('Análisis IA',     'AI Analysis')  },
    { to: '/history',   icon: <IconHistory />,   label: t('Historial',       'History')      },
    { to: '/education', icon: <IconEducation />, label: t('Formación',       'Education')    },
    { to: '/telegram',  icon: <IconTelegram />,  label: 'Telegram'                           },
    { to: '/plans',     icon: <IconPlans />,     label: t('Planes',          'Plans')        },
  ];

  const PLAN_LABELS: Record<string, string> = { free: t('Básico', 'Basic'), pro: 'Pro', elite: 'Elite' };

  return (
    <>
      <div style={{ padding: '0.8rem 1.2rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.58rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          {t('Deportes', 'Sports')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {SPORTS.map(sp => (
            <button key={sp.key} onClick={() => { navigate(`/matches?sport=${sp.key}`); onNav?.(); }}
              style={{ padding: '0.2rem 0.55rem', borderRadius: 4, fontSize: '0.65rem', background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', transition: 'all 0.15s', fontWeight: 400 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
            >{sp.label}</button>
          ))}
        </div>
      </div>

      <nav style={{ flex: 1, padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.1rem', overflowY: 'auto' }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} onClick={() => onNav?.()}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.7rem',
              padding: '0.52rem 0.8rem', borderRadius: 7, textDecoration: 'none',
              fontSize: '0.85rem', fontWeight: isActive ? 500 : 300,
              color: isActive ? 'var(--text)' : 'var(--muted)',
              background: isActive ? 'var(--card2)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--green)' : '2px solid transparent',
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
            <div style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 700, color: PLAN_COLORS[user.plan], fontSize: '0.88rem' }}>{PLAN_LABELS[user.plan]}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--gold),var(--green))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#050810' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            </div>
            <button onClick={() => { ['xentory_bet_user','xentory_market_user'].forEach(k => { try { localStorage.removeItem(k); } catch { } }); ['xentory_bet_session','xentory_market_session'].forEach(k => { try { sessionStorage.removeItem(k); } catch { } }); logout(); }}
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
      <div style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', marginBottom: '0.2rem', display: 'flex', alignItems: 'baseline' }}>
        <a href={HUB_URL} style={{ textDecoration: 'none' }}><span className="text-gradient-gold">Xentory</span></a>
        <Link to="/dashboard" style={{ textDecoration: 'none' }}><span style={{ color: '#4d9fff' }}>Bet</span></Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
        <span className="live-dot" />
        <span style={{ fontSize: '0.58rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('En vivo', 'Live')}</span>
      </div>
      <QuickBar />
      <div style={{ height: 1, background: 'var(--border)', marginTop: '0.9rem' }} />
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const fn = () => setIsMobile(window.innerWidth <= 768); fn(); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);

  return (
    <>
      {!isMobile && (
        <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 'var(--sidebar-w)', background: 'var(--nav-bg)', borderRight: '1px solid var(--border)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
          <LogoBlock /><NavContent />
        </aside>
      )}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 52, zIndex: 50, background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem' }}>
          <div style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline' }}>
            <a href={HUB_URL} style={{ textDecoration: 'none' }}><span className="text-gradient-gold">Xentory</span></a>
            <Link to="/dashboard" style={{ textDecoration: 'none' }}><span style={{ color: '#4d9fff' }}>Bet</span></Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QuickBar />
            <button onClick={() => setOpen(o => !o)} aria-label="Menu" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[0,1,2].map(i => <span key={i} style={{ display: 'block', width: 20, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'all 0.25s', ...(i===0&&open?{transform:'rotate(45deg) translate(5px,5px)'}:i===1&&open?{opacity:0}:i===2&&open?{transform:'rotate(-45deg) translate(5px,-5px)'}:{}) }} />)}
            </button>
          </div>
        </div>
      )}
      {isMobile && open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, top: 52, zIndex: 48, background: 'rgba(5,8,16,0.6)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'fixed', top: 52, left: 0, right: 0, bottom: 0, zIndex: 49, background: '#080d1a', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto', animation: 'slideDown 0.18s ease both' }}>
            <NavContent onNav={() => setOpen(false)} />
          </div>
        </>
      )}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>
    </>
  );
}
