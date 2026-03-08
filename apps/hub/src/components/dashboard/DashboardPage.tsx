import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PLAN_LABELS } from '../../constants';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import { useLang } from '../../context/LanguageContext';
import type { Plan } from '../../types';

const ONBOARDING_KEY = 'xentory_onboarding_done';

const PLAN_COLORS: Record<Plan, string> = {
  free: '#6b7294',
  pro: '#c9a84c',
  elite: '#00d4ff',
};

const MOCK_STATS = {
  marketAnalysesRun: 12,
  betsAnalysed: 8,
  alertsTriggered: 3,
  telegramSignalsReceived: 47,
};

const RECENT_ACTIVITY = [
  { icon: '📈', text: 'Análisis IA de BTC/USDT generado', time: 'hace 2h', platform: 'market' },
  { icon: '⚽', text: 'Predicción: Real Madrid vs Barça', time: 'hace 5h', platform: 'bets' },
  { icon: '🔔', text: 'Alerta de precio NVDA activada a $142', time: 'hace 1d', platform: 'market' },
  { icon: '✈️', text: '12 señales recibidas en Telegram', time: 'hace 1d', platform: 'market' },
  { icon: '⚽', text: 'Predicción: Champions League - Cuartos', time: 'hace 2d', platform: 'bets' },
];

function PlatformCard({
  emoji, name, planKey, plan, color, onLaunch, onUpgrade,
}: {
  emoji: string; name: string; planKey: 'market' | 'bets';
  plan: Plan; color: string; onLaunch: () => void; onUpgrade: () => void;
}) {
  const isPaid = plan !== 'free';
  return (
    <div className="glass" style={{
      borderRadius: 16,
      padding: 'clamp(1rem, 4vw, 1.8rem)',
      borderTop: `2px solid ${color}`,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Plan badge */}
      <div style={{ position: 'absolute', top: '0.9rem', right: '0.9rem' }}>
        <span style={{
          padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.68rem',
          background: `${PLAN_COLORS[plan]}15`, color: PLAN_COLORS[plan],
          border: `1px solid ${PLAN_COLORS[plan]}30`,
          fontFamily: 'Urbanist', fontWeight: 600,
        }}>
          {PLAN_LABELS[plan]}
        </span>
      </div>

      <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.6rem' }}>{emoji}</div>
      <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)', marginBottom: '0.3rem', color, lineHeight: 1.2 }}>{name}</h3>
      <p style={{ color: 'var(--muted)', fontSize: 'clamp(0.75rem, 2vw, 0.82rem)', marginBottom: '1rem', lineHeight: 1.5 }}>
        {planKey === 'market'
          ? 'Análisis técnico de cripto, bolsa y forex'
          : 'Predicciones deportivas con estadística IA'}
      </p>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 80, padding: '0.5rem 0.6rem', background: 'var(--card2)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Estado</div>
          <div style={{ fontSize: 'clamp(0.72rem, 2vw, 0.82rem)', color: isPaid ? 'var(--green)' : 'var(--muted)', fontWeight: 500 }}>
            {isPaid ? '● Activo' : '● Gratis'}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 80, padding: '0.5rem 0.6rem', background: 'var(--card2)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Telegram</div>
          <div style={{ fontSize: 'clamp(0.72rem, 2vw, 0.82rem)', color: isPaid ? 'var(--cyan)' : 'var(--muted)', fontWeight: 500 }}>
            {isPaid ? '● Activo' : '● No incluido'}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <button onClick={onLaunch} className="btn btn-outline" style={{
          flex: 1, justifyContent: 'center',
          fontSize: 'clamp(0.75rem, 2vw, 0.82rem)',
          borderColor: `${color}40`, color, padding: '0.5rem 0.6rem',
        }}>
          Abrir →
        </button>
        {!isPaid && (
          <button onClick={onUpgrade} className="btn btn-gold btn-sm" style={{
            flex: 1, justifyContent: 'center',
            fontSize: 'clamp(0.75rem, 2vw, 0.82rem)', padding: '0.5rem 0.6rem',
          }}>
            💎 Mejorar
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, launchPlatform } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [launching, setLaunching] = useState<'market' | 'bets' | null>(null);

  const handleLaunch = async (platform: 'market' | 'bets') => {
    setLaunching(platform);
    try { await launchPlatform(platform); }
    catch { setLaunching(null); }
  };

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      const timer = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  };

  if (!user) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const memberDays = Math.round((Date.now() - new Date(user.createdAt).getTime()) / 86400000);

  return (
    <div style={{
      maxWidth: 1100, margin: '0 auto',
      padding: 'calc(var(--bar-h) + 1.5rem) clamp(1rem, 4vw, 2rem) 3rem',
    }}>
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}

      {/* Header */}
      <div className="animate-fadeUp" style={{ marginBottom: '1.8rem' }}>
        <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.7rem)', marginBottom: '0.3rem' }}>
          {greeting}, <span className="text-gradient-gold">{user.name.split(' ')[0]}</span> 👋
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
          Miembro desde hace {memberDays} días · Gestiona tus plataformas y suscripciones desde aquí.
        </p>
      </div>

      {/* Platform cards — 2 col always, stacks on very small */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        gap: 'clamp(0.8rem, 3vw, 1.2rem)',
        marginBottom: '1.5rem',
      }}>
        <PlatformCard
          emoji="📈" name="Xentory Market" planKey="market"
          plan={user.subscriptions.market} color="var(--gold)"
          onLaunch={() => handleLaunch('market')}
          onUpgrade={() => navigate('/pricing#market')}
        />
        <PlatformCard
          emoji="⚽" name="Xentory Bet" planKey="bets"
          plan={user.subscriptions.bets} color="var(--green)"
          onLaunch={() => handleLaunch('bets')}
          onUpgrade={() => navigate('/pricing#bets')}
        />

      {/* ── Launch overlay ── */}
      {launching && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#050810',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%',
            background: launching === 'market'
              ? 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(0,200,100,0.08) 0%, transparent 70%)',
            animation: 'glow-pulse 3s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{
            fontFamily: 'Urbanist, sans-serif', fontWeight: 900,
            fontSize: 'clamp(2rem, 6vw, 2.8rem)', letterSpacing: '-0.04em',
            marginBottom: '2.5rem',
          }}>
            <span style={{ background: 'linear-gradient(135deg, #c9a84c, #f0d060)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Xentory</span>
            <span style={{ color: launching === 'market' ? '#4d9fff' : '#00c864' }}>
              {launching === 'market' ? 'Market' : 'Bet'}
            </span>
          </div>
          <div style={{ position: 'relative', width: 72, height: 72, marginBottom: '2rem' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: launching === 'market' ? '#c9a84c' : '#00c864',
              borderRightColor: launching === 'market' ? 'rgba(201,168,76,0.3)' : 'rgba(0,200,100,0.3)',
              animation: 'spin 1.1s cubic-bezier(0.4,0,0.2,1) infinite' }} />
            <div style={{ position: 'absolute', inset: 10, borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: '#4d9fff', borderLeftColor: 'rgba(77,159,255,0.3)',
              animation: 'spin 0.75s cubic-bezier(0.4,0,0.2,1) infinite reverse' }} />
            <div style={{ position: 'absolute', inset: 22, borderRadius: '50%',
              background: `linear-gradient(135deg, ${launching === 'market' ? '#c9a84c' : '#00c864'}, #4d9fff)`,
              animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
          </div>
          <p style={{ color: '#6b7294', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {launching === 'market' ? 'Cargando datos del mercado…' : 'Cargando análisis deportivo…'}
          </p>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, ${launching === 'market' ? '#c9a84c' : '#00c864'}, #4d9fff)`,
            animation: 'progress-bar 2.5s linear both', transformOrigin: 'left' }} />
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse-dot { 0%,100%{transform:scale(0.8);opacity:0.6} 50%{transform:scale(1.2);opacity:1} }
            @keyframes glow-pulse { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.15);opacity:1} }
            @keyframes progress-bar { from{transform:scaleX(0)} to{transform:scaleX(1)} }
          `}</style>
        </div>
      )}
      </div>

      {/* Stats + Activity — stack on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: 'clamp(0.8rem, 3vw, 1.2rem)',
      }}>

        {/* Stats */}
        <div className="glass" style={{ borderRadius: 16, padding: 'clamp(1rem, 4vw, 1.8rem)' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>📊 Tu actividad</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {[
              { icon: '🧠', label: 'Análisis IA ejecutados', value: MOCK_STATS.marketAnalysesRun, color: 'var(--gold)' },
              { icon: '⚽', label: 'Partidos analizados',     value: MOCK_STATS.betsAnalysed,       color: 'var(--cyan)' },
              { icon: '🔔', label: 'Alertas activadas',       value: MOCK_STATS.alertsTriggered,    color: 'var(--orange)' },
              { icon: '✈️', label: 'Señales Telegram',        value: MOCK_STATS.telegramSignalsReceived, color: 'var(--green)' },
            ].map(stat => (
              <div key={stat.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.65rem 0.9rem', background: 'var(--card2)', borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <span>{stat.icon}</span>
                  <span style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.label}</span>
                </div>
                <span style={{ fontFamily: 'Urbanist', fontWeight: 700, color: stat.color, fontSize: '1.1rem', flexShrink: 0, marginLeft: '0.5rem' }}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Telegram link status */}
          <div style={{
            marginTop: '1.2rem', padding: '0.9rem 1rem',
            background: user.telegramLinked ? 'rgba(0,255,136,0.06)' : 'var(--card2)',
            borderRadius: 12,
            border: `1px solid ${user.telegramLinked ? 'rgba(0,255,136,0.15)' : 'var(--border)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>Canal Telegram</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 500, color: user.telegramLinked ? 'var(--green)' : 'var(--muted)' }}>
                  {user.telegramLinked ? '● Vinculado' : '● No vinculado'}
                </div>
              </div>
              <span style={{ fontSize: '1.3rem' }}>{user.telegramLinked ? '✈️' : '⚠️'}</span>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="glass" style={{ borderRadius: 16, padding: 'clamp(1rem, 4vw, 1.8rem)' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>🕐 Actividad reciente</h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                padding: '0.85rem 0',
                borderBottom: i < RECENT_ACTIVITY.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: item.platform === 'market' ? 'var(--gold-dim)' : 'var(--cyan-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'clamp(0.78rem, 2vw, 0.86rem)', marginBottom: '0.15rem', lineHeight: 1.4 }}>{item.text}</div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{item.time}</span>
                    <span style={{
                      fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 4,
                      background: item.platform === 'market' ? 'var(--gold-dim)' : 'var(--cyan-dim)',
                      color: item.platform === 'market' ? 'var(--gold)' : 'var(--cyan)',
                    }}>
                      {item.platform === 'market' ? 'Market' : 'Bet'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bundle CTA */}
          {(user.subscriptions.market === 'free' || user.subscriptions.bets === 'free') && (
            <div
              onClick={() => navigate('/pricing')}
              style={{
                marginTop: '1rem', padding: '0.9rem 1rem',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(0,212,255,0.05))',
                border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)')}
            >
              <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', marginBottom: '0.3rem' }}>
                💎 Bundle Total — Ahorra 9€/mes
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 'clamp(0.72rem, 2vw, 0.8rem)', lineHeight: 1.5 }}>
                Xentory Market Pro + Xentory Bet Pro por solo 49€/mes en vez de 58€
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}