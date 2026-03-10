import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { QuickBar } from './QuickBar';
import { useCurrency } from '../../context/CurrencyContext';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: '⬛', label: 'Dashboard'  },
  { to: '/market',     icon: '📊', label: 'Markets'   },
  { to: '/watchlist',  icon: '⭐', label: 'Watchlist'  },
  { to: '/analysis',   icon: '🧠', label: 'Analysis'   },
  { to: '/alerts',     icon: '🔔', label: 'Alerts'    },
  { to: '/telegram',   icon: '✈️',  label: 'Telegram'   },
  { to: '/plans',      icon: '💎', label: 'Plans'     },
];

const HUB_URL  = (import.meta as any).env?.VITE_HUB_URL    ?? 'https://x-eight-beryl.vercel.app';
const MKT_URL  = (import.meta as any).env?.VITE_MARKET_URL  ?? 'https://xentory-ecosystem-market.vercel.app';
const BET_URL  = (import.meta as any).env?.VITE_BET_URL     ?? 'https://xentory-bet.vercel.app';

const PLAN_COLORS: Record<string, string> = { free: '#6b7294', pro: '#c9a84c', elite: '#00d4ff' };
const PLAN_LABELS: Record<string, string> = { free: 'Free', pro: 'Pro', elite: 'Elite' };

function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  return (
    <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 7, padding: 3, border: '1px solid var(--border)', gap: 2 }}>
      {(['USD', 'EUR'] as const).map(c => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          style={{
            padding: '0.2rem 0.5rem', borderRadius: 5, border: 'none', cursor: 'pointer',
            fontSize: '0.7rem', fontWeight: 700, transition: 'all 0.18s',
            background: currency === c ? 'var(--gold)' : 'transparent',
            color: currency === c ? '#050810' : 'var(--muted)',
          }}
        >
          {c === 'USD' ? '$' : '€'}
        </button>
      ))}
    </div>
  );
}

function NavContent({ onNav }: { onNav?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <nav style={{ flex: 1, padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} onClick={() => onNav?.()}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.55rem 0.8rem', borderRadius: 8, textDecoration: 'none',
              fontSize: '0.88rem', fontWeight: isActive ? 500 : 300,
              color: isActive ? 'var(--text)' : 'var(--muted)',
              background: isActive ? 'var(--card2)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            <span style={{ fontSize: '1rem', opacity: 0.85 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid var(--border)' }}>
          <div onClick={() => navigate('/plans')} style={{ padding: '0.7rem 1rem', borderRadius: 10, background: 'var(--card2)', border: `1px solid ${PLAN_COLORS[user.plan]}30`, cursor: 'pointer', marginBottom: '0.7rem' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tu plan</div>
            <div style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 700, color: PLAN_COLORS[user.plan], fontSize: '0.92rem' }}>{PLAN_LABELS[user.plan]}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--gold),var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.78rem', color: '#050810' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            </div>
            <button
              onClick={() => {
                ['xentory_bet_user','xentory_market_user'].forEach(k => {
                  try { localStorage.removeItem(k); } catch { /**/ }
                });
                ['xentory_bet_session','xentory_market_session'].forEach(k => {
                  try { sessionStorage.removeItem(k); } catch { /**/ }
                });
                logout();
              }}
              title="Sign out"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '1rem', flexShrink: 0 }}
            >⏏</button>
          </div>
        </div>
      )}
    </>
  );
}

function LogoBlock() {
  return (
    <div style={{ padding: '1.2rem 1.2rem 0' }}>
      <div style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
        <a href={HUB_URL} style={{ textDecoration: 'none' }}><span className="text-gradient-gold">Xentory</span></a><Link to="/dashboard" style={{ textDecoration: 'none' }}><span style={{ color: '#4d9fff' }}>Market</span></Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.9rem' }}>
        <span className="live-dot" />
        <span style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>MERCADOS EN VIVO</span>
      </div>
      <QuickBar extra={<CurrencyToggle />} />
      <div style={{ height: 1, background: 'var(--border)', marginTop: '1rem' }} />
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 'var(--sidebar-w)',
          background: 'var(--nav-bg)', borderRight: '1px solid var(--border)',
          backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column',
          zIndex: 50,
        }}>
          <LogoBlock />
          <NavContent />
        </aside>
      )}

      {/* Mobile topbar */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 52, zIndex: 50,
          background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 1rem',
        }}>
          <div style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
            <a href={HUB_URL} style={{ textDecoration: 'none' }}><span className="text-gradient-gold">Xentory</span></a><Link to="/dashboard" style={{ textDecoration: 'none' }}><span style={{ color: '#4d9fff' }}>Market</span></Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CurrencyToggle />
            <QuickBar />
            <button
              onClick={() => setOpen(o => !o)}
              aria-label="Menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: 5 }}
            >
              <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'all 0.25s', transform: open ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
              <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'all 0.25s', opacity: open ? 0 : 1 }} />
              <span style={{ display: 'block', width: 22, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'all 0.25s', transform: open ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
            </button>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, top: 52, zIndex: 48,
              background: 'rgba(5,8,16,0.6)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            }}
          />
          <div style={{
            position: 'fixed', top: 52, left: 0, right: 0, bottom: 0, zIndex: 49,
            background: '#080d1a',
            borderTop: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
            animation: 'fadeUp 0.18s ease both',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          }}>
            <NavContent onNav={() => setOpen(false)} />
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>
    </>
  );
}
