import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PLAN_LABELS } from '../../constants';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import type { Plan } from '../../types';

const ONBOARDING_KEY = 'nexus_onboarding_done';

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
      borderRadius: 16, padding: '1.8rem',
      borderTop: `2px solid ${color}`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <span style={{
          padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.68rem',
          background: `${PLAN_COLORS[plan]}15`, color: PLAN_COLORS[plan],
          border: `1px solid ${PLAN_COLORS[plan]}30`,
          fontFamily: 'Urbanist', fontWeight: 600,
        }}>
          {PLAN_LABELS[plan]}
        </span>
      </div>

      <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>{emoji}</div>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.3rem', color }}>{name}</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
        {planKey === 'market'
          ? 'Análisis técnico de cripto, bolsa y forex'
          : 'Predicciones deportivas con estadística IA'}
      </p>

      {/* Status */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, padding: '0.6rem 0.8rem', background: 'var(--card2)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Estado</div>
          <div style={{ fontSize: '0.82rem', color: isPaid ? 'var(--green)' : 'var(--muted)', fontWeight: 500 }}>
            {isPaid ? '● Activo' : '● Gratis'}
          </div>
        </div>
        <div style={{ flex: 1, padding: '0.6rem 0.8rem', background: 'var(--card2)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Telegram</div>
          <div style={{ fontSize: '0.82rem', color: isPaid ? 'var(--cyan)' : 'var(--muted)', fontWeight: 500 }}>
            {isPaid ? '● Canal activo' : '● No incluido'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <button onClick={onLaunch} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem', borderColor: `${color}40`, color }}>
          Abrir →
        </button>
        {!isPaid && (
          <button onClick={onUpgrade} className="btn btn-gold btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
            💎 Mejorar
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, launchPlatform } = useAuth();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem', paddingTop: 'calc(var(--nav-h) + 38px + 2rem)' }}>
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}

      {/* Header */}
      <div className="animate-fadeUp" style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.7rem', marginBottom: '0.3rem' }}>
          {greeting}, <span className="text-gradient-gold">{user.name.split(' ')[0]}</span> 👋
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Miembro desde hace {memberDays} días · Gestiona tus plataformas y suscripciones desde aquí.
        </p>
      </div>

      {/* Platforms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '2rem' }}>
        <PlatformCard
          emoji="📈" name="Xentory Market" planKey="market"
          plan={user.subscriptions.market} color="var(--gold)"
          onLaunch={() => launchPlatform('market')}
          onUpgrade={() => navigate('/pricing#market')}
        />
        <PlatformCard
          emoji="⚽" name="Xentory Bet" planKey="bets"
          plan={user.subscriptions.bets} color="var(--cyan)"
          onLaunch={() => launchPlatform('bets')}
          onUpgrade={() => navigate('/pricing#bets')}
        />
      </div>

      {/* Stats + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.2rem' }}>

        {/* Stats */}
        <div className="glass" style={{ borderRadius: 16, padding: '1.8rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>📊 Tu actividad</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '🧠', label: 'Análisis IA ejecutados', value: MOCK_STATS.marketAnalysesRun, color: 'var(--gold)' },
              { icon: '⚽', label: 'Partidos analizados', value: MOCK_STATS.betsAnalysed, color: 'var(--cyan)' },
              { icon: '🔔', label: 'Alertas activadas', value: MOCK_STATS.alertsTriggered, color: 'var(--orange)' },
              { icon: '✈️', label: 'Señales Telegram recibidas', value: MOCK_STATS.telegramSignalsReceived, color: 'var(--green)' },
            ].map(stat => (
              <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0.9rem', background: 'var(--card2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span>{stat.icon}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>{stat.label}</span>
                </div>
                <span style={{ fontFamily: 'Urbanist', fontWeight: 700, color: stat.color, fontSize: '1.1rem' }}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Telegram */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: user.telegramLinked ? 'rgba(0,255,136,0.06)' : 'var(--card2)', borderRadius: 12, border: `1px solid ${user.telegramLinked ? 'rgba(0,255,136,0.15)' : 'var(--border)'}` }}>
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
        <div className="glass" style={{ borderRadius: 16, padding: '1.8rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>🕐 Actividad reciente</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: '0.8rem', alignItems: 'flex-start',
                padding: '0.9rem 0',
                borderBottom: i < RECENT_ACTIVITY.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: item.platform === 'market' ? 'var(--gold-dim)' : 'var(--cyan-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem',
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.86rem', marginBottom: '0.15rem' }}>{item.text}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.time}</span>
                    <span style={{
                      fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 4,
                      background: item.platform === 'market' ? 'var(--gold-dim)' : 'var(--cyan-dim)',
                      color: item.platform === 'market' ? 'var(--gold)' : 'var(--cyan)',
                    }}>
                      {item.platform === 'market' ? 'Xentory Market' : 'Xentory Bet'}
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
                marginTop: '1.2rem', padding: '1rem 1.2rem',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(0,212,255,0.05))',
                border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)')}
            >
              <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                💎 Bundle Total — Ahorra 9€/mes
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                Xentory Market Pro + Xentory Bet Pro por solo 49€/mes en vez de 58€
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
