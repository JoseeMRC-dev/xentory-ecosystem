import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SPORT_CONFIG } from '../../constants';
import { QuickBar } from './QuickBar';

const NAV = [
  { to: '/dashboard', icon: '⬛', label: 'Dashboard'   },
  { to: '/matches',   icon: '📅', label: 'Partidos'    },
  { to: '/analysis',  icon: '🧠', label: 'Análisis IA' },
  { to: '/history',   icon: '📊', label: 'Historial'   },
  { to: '/telegram',  icon: '✈️',  label: 'Telegram'    },
  { to: '/plans',     icon: '💎', label: 'Planes'      },
];

const PLAN_COLORS: Record<string, string> = { free: '#6b7294', pro: '#c9a84c', elite: '#00d4ff' };
const PLAN_LABELS: Record<string, string> = { free: 'Fanático', pro: 'Pro', elite: 'Elite' };

function NavContent({ onNav }: { onNav?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {/* Sports filter */}
      <div style={{ padding: '0.9rem 1.2rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Deportes</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {Object.entries(SPORT_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { navigate(`/matches?sport=${key}`); onNav?.(); }}
              style={{ padding: '0.2rem 0.55rem', borderRadius: 100, fontSize: '0.68rem', background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = (cfg as any).color; e.currentTarget.style.color = (cfg as any).color; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
            >{(cfg as any).emoji}</button>
          ))}
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', overflowY: 'auto' }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} onClick={() => onNav?.()}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.55rem 0.8rem', borderRadius: 8, textDecoration: 'none',
              fontSize: '0.88rem', fontWeight: isActive ? 500 : 300,
              color: isActive ? 'var(--text)' : 'var(--muted)',
              background: isActive ? 'var(--card2)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--green)' : '2px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            <span style={{ fontSize: '1rem', opacity: 0.85 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Plan + user */}
      {user && (
        <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid var(--border)' }}>
          <div onClick={() => navigate('/plans')} style={{ padding: '0.7rem 1rem', borderRadius: 10, background: 'var(--card2)', border: `1px solid ${PLAN_COLORS[user.plan]}30`, cursor: 'pointer', marginBottom: '0.7rem' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tu plan</div>
            <div style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 700, color: PLAN_COLORS[user.plan], fontSize: '0.92rem' }}>{PLAN_LABELS[user.plan]}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--gold),var(--green))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.78rem', color: '#050810' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            </div>
            <button onClick={logout} title="Cerrar sesión" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', flexShrink: 0 }}>⏏</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Logo block ─────────────────────────────────────────────────────────────
function LogoBlock() {
  return (
    <div style={{ padding: '1.2rem 1.2rem 0' }}>
      {/* Logo */}
      <div style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
        <span className="text-gradient-gold">Xentory</span>
        <span style={{ color: 'var(--green)' }}>Bet</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.9rem' }}>
        <span className="live-dot" />
        <span style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>EN VIVO</span>
      </div>
      {/* QuickBar DEBAJO del logo */}
      <QuickBar />
      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginTop: '1rem' }} />
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 'var(--sidebar-w)',
        background: 'var(--nav-bg)', borderRight: '1px solid var(--border)',
        backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column',
        zIndex: 50,
      }} className="bet-sidebar-desk">
        <LogoBlock />
        <NavContent />
      </aside>

      {/* ── Mobile topbar ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 52, zIndex: 50,
        background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 1rem',
      }} className="bet-sidebar-mob">
        {/* Logo inline para mobile */}
        <div style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
          <span className="text-gradient-gold">Xentory</span>
          <span style={{ color: 'var(--green)' }}>Bet</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <QuickBar />
          <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ display: 'block', width: 20, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'transform 0.22s', transform: open ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
            <span style={{ display: 'block', width: 20, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'opacity 0.22s', opacity: open ? 0 : 1 }} />
            <span style={{ display: 'block', width: 20, height: 2, background: 'var(--text)', borderRadius: 2, transition: 'transform 0.22s', transform: open ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {open && (
        <div style={{
          position: 'fixed', top: 52, left: 0, right: 0, bottom: 0, zIndex: 49,
          background: 'var(--nav-bg)', display: 'flex', flexDirection: 'column',
          overflowY: 'auto', animation: 'fadeUp 0.18s ease both',
          borderTop: '1px solid var(--border)',
        }} className="bet-sidebar-drawer">
          <NavContent onNav={() => setOpen(false)} />
        </div>
      )}

      <style>{`
        .bet-sidebar-desk   { display: flex !important; }
        .bet-sidebar-mob    { display: none !important; }
        .bet-sidebar-drawer { display: flex !important; }
        @media (max-width: 768px) {
          .bet-sidebar-desk { display: none !important; }
          .bet-sidebar-mob  { display: flex !important; }
        }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>
    </>
  );
}
