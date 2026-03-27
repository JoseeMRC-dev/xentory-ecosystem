import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PLAN_LABELS } from '../../constants';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import { useLang } from '../../context/LanguageContext';
import type { Plan } from '../../types';

const ONBOARDING_KEY = 'xentory_onboarding_done';

const PLAN_COLORS: Record<Plan, string> = {
  free:  '#5a6180',
  pro:   '#c9a84c',
  elite: '#3b9eff',
};


// ── SVG ICONS ─────────────────────────────────────────────────────────
const MarketIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const BetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/>
  </svg>
);
const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const TelegramIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

// ── PLATFORM CARD ─────────────────────────────────────────────────────
function PlatformCard({
  icon, name, planKey, plan, color, onLaunch, onUpgrade, highlighted,
}: {
  icon: React.ReactNode; name: string; planKey: 'market' | 'bets';
  plan: Plan; color: string; onLaunch: () => void; onUpgrade: () => void;
  highlighted?: boolean;
}) {
  const { t, lang } = useLang();
  const isPaid = plan !== 'free';

  return (
    <div className="glass" style={{
      borderRadius: 18, padding: 'clamp(1.2rem, 4vw, 1.8rem)',
      borderTop: `2px solid ${color}`, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', transition: 'transform 0.2s',
      boxShadow: highlighted ? `0 0 0 1px ${color}40, 0 4px 24px ${color}14` : undefined,
    }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
    >
      {/* "Tu plataforma" badge for highlighted card */}
      {highlighted && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      )}
      {/* Plan badge */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <span style={{
          padding: '0.18rem 0.55rem', borderRadius: 100, fontSize: '0.62rem',
          background: `${PLAN_COLORS[plan]}14`, color: PLAN_COLORS[plan],
          border: `1px solid ${PLAN_COLORS[plan]}28`, fontWeight: 600,
          fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em',
        }}>
          {PLAN_LABELS[plan]}
        </span>
      </div>

      {/* Icon */}
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}12`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: '0.9rem' }}>
        {icon}
      </div>

      <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.15rem)', marginBottom: '0.3rem', color, lineHeight: 1.2, fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>{name}</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.55 }}>
        {planKey === 'market'
          ? t('platforms.market.desc').substring(0, 65) + '…'
          : t('platforms.bet.desc').substring(0, 65) + '…'}
      </p>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: t('nav.dashboard'), value: isPaid ? t('pricing.active').replace('✓ ', '') : t('pricing.free.label'), vColor: isPaid ? 'var(--green)' : 'var(--muted)' },
          { label: 'Telegram',         value: isPaid ? t('pricing.active').replace('✓ ', '') : (lang === 'es' ? 'No incluido' : 'Not included'), vColor: isPaid ? 'var(--cyan)' : 'var(--muted)' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 76, padding: '0.45rem 0.6rem', background: 'var(--card2)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: '0.57rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.18rem' }}>{s.label}</div>
            <div style={{ fontSize: '0.78rem', color: s.vColor, fontWeight: 500 }}>● {s.value}</div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <button onClick={onLaunch} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center', borderColor: `${color}35`, color, gap: '0.4rem' }}>
          {lang === 'es' ? 'Acceder' : 'Open'} <ArrowIcon />
        </button>
        {!isPaid && (
          <button onClick={onUpgrade} className="btn btn-gold btn-sm" style={{ flex: 1, justifyContent: 'center', gap: '0.3rem' }}>
            <StarIcon /> {lang === 'es' ? 'Mejorar' : 'Upgrade'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────
function readPref(key: string) { try { return localStorage.getItem(key); } catch { return null; } }

export function DashboardPage() {
  const { user, launchPlatform } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [launching, setLaunching] = useState<'market' | 'bets' | null>(null);

  // Onboarding preferences — drive personalization
  const prefPlatform = readPref('xentory_pref_platform'); // 'market'|'sports'|'both'
  const prefAnalysis = readPref('xentory_pref_analysis'); // 'btc'|'match'|'portfolio'

  const handleLaunch = async (platform: 'market' | 'bets') => {
    setLaunching(platform);
    try { await launchPlatform(platform); }
    catch { setLaunching(null); }
  };

  // When the user presses Back from a sub-app, the browser restores this page
  // from the bfcache with `launching` still set. Reset it so the overlay disappears.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLaunching(null);
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

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
  const greeting = lang === 'es'
    ? (hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

  const memberDays = Math.round((Date.now() - new Date(user.createdAt).getTime()) / 86400000);

  // Personalized subtitle based on onboarding preference
  const prefLabel = prefPlatform === 'market'  ? (lang === 'es' ? 'Análisis de mercados'       : 'Market analysis')
    : prefPlatform === 'sports'  ? (lang === 'es' ? 'Predicciones deportivas'    : 'Sports predictions')
    : prefPlatform === 'both'    ? (lang === 'es' ? 'Ecosistema completo'         : 'Full ecosystem')
    : null;
  const memberTxt = prefLabel
    ? (lang === 'es' ? `Tu perfil: ${prefLabel} · Gestiona tus plataformas aquí.`
                     : `Your focus: ${prefLabel} · Manage your platforms here.`)
    : (lang === 'es' ? `Miembro desde hace ${memberDays} días · Gestiona tus plataformas aquí.`
                     : `Member for ${memberDays} days · Manage your platforms here.`);

  // Quick action derived from step-2 answer
  const quickAction = prefAnalysis === 'btc'
    ? { emoji: '₿',  label: lang === 'es' ? 'Continuar: Analizar Bitcoin'          : 'Continue: Analyse Bitcoin',           platform: 'market' as const }
    : prefAnalysis === 'match'
    ? { emoji: '🏆', label: lang === 'es' ? 'Continuar: Predecir Champions League' : 'Continue: Predict Champions League',  platform: 'bets'   as const }
    : prefAnalysis === 'portfolio'
    ? { emoji: '💱', label: lang === 'es' ? 'Continuar: Analizar EUR/USD'          : 'Continue: Analyse EUR/USD',           platform: 'market' as const }
    : null;


  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'calc(var(--bar-h) + 1.5rem) clamp(1rem,4vw,2rem) 3rem' }}>
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}

      {/* Header */}
      <div className="animate-fadeUp" style={{ marginBottom: '1.8rem' }}>
        <h1 style={{ fontSize: 'clamp(1.3rem,4vw,1.7rem)', marginBottom: '0.3rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
          {greeting}, <span className="text-gradient-gold">{user.name.split(' ')[0]}</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 'clamp(0.78rem,2vw,0.88rem)' }}>{memberTxt}</p>
      </div>

      {/* Quick action banner — shown only when onboarding preference is set */}
      {quickAction && (
        <div
          className="animate-fadeUp"
          onClick={() => handleLaunch(quickAction.platform)}
          style={{
            marginBottom: '1.2rem', padding: '0.85rem 1.2rem', borderRadius: 14, cursor: 'pointer',
            background: quickAction.platform === 'market' ? 'linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.03))' : 'linear-gradient(135deg,rgba(0,200,122,0.08),rgba(0,200,122,0.03))',
            border: `1px solid ${quickAction.platform === 'market' ? 'rgba(201,168,76,0.22)' : 'rgba(0,200,122,0.22)'}`,
            display: 'flex', alignItems: 'center', gap: '0.8rem',
            transition: 'border-color 0.2s, transform 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = quickAction.platform === 'market' ? 'rgba(201,168,76,0.45)' : 'rgba(0,200,122,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = quickAction.platform === 'market' ? 'rgba(201,168,76,0.22)' : 'rgba(0,200,122,0.22)'; e.currentTarget.style.transform = 'none'; }}
        >
          <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{quickAction.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: quickAction.platform === 'market' ? 'var(--gold)' : 'var(--green)' }}>
              {quickAction.label}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
              {lang === 'es' ? 'Basado en tus preferencias' : 'Based on your preferences'}
            </div>
          </div>
          <ArrowIcon />
        </div>
      )}

      {/* Platform cards — ordered by preference */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 'clamp(0.8rem,3vw,1.2rem)', marginBottom: '1.5rem' }}>
        {(prefPlatform === 'sports'
          ? [
              <PlatformCard key="bets"   icon={<BetIcon />}    name="Xentory Bet"    planKey="bets"   plan={user.subscriptions.bets}   color="var(--cyan)" onLaunch={() => handleLaunch('bets')}   onUpgrade={() => navigate('/pricing#bets')}   highlighted />,
              <PlatformCard key="market" icon={<MarketIcon />} name="Xentory Market" planKey="market" plan={user.subscriptions.market} color="var(--gold)"  onLaunch={() => handleLaunch('market')} onUpgrade={() => navigate('/pricing#market')} />,
            ]
          : prefPlatform === 'market'
          ? [
              <PlatformCard key="market" icon={<MarketIcon />} name="Xentory Market" planKey="market" plan={user.subscriptions.market} color="var(--gold)"  onLaunch={() => handleLaunch('market')} onUpgrade={() => navigate('/pricing#market')} highlighted />,
              <PlatformCard key="bets"   icon={<BetIcon />}    name="Xentory Bet"    planKey="bets"   plan={user.subscriptions.bets}   color="var(--cyan)" onLaunch={() => handleLaunch('bets')}   onUpgrade={() => navigate('/pricing#bets')} />,
            ]
          : [
              <PlatformCard key="market" icon={<MarketIcon />} name="Xentory Market" planKey="market" plan={user.subscriptions.market} color="var(--gold)"  onLaunch={() => handleLaunch('market')} onUpgrade={() => navigate('/pricing#market')} />,
              <PlatformCard key="bets"   icon={<BetIcon />}    name="Xentory Bet"    planKey="bets"   plan={user.subscriptions.bets}   color="var(--cyan)" onLaunch={() => handleLaunch('bets')}   onUpgrade={() => navigate('/pricing#bets')} />,
            ]
        )}

        {/* Launch overlay */}
        {launching && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: launching === 'market' ? 'radial-gradient(circle,rgba(201,168,76,0.08),transparent 70%)' : 'radial-gradient(circle,rgba(59,158,255,0.08),transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(2rem,6vw,2.8rem)', letterSpacing: '-0.04em', marginBottom: '2.5rem' }}>
              <span className="text-gradient-gold">Xentory</span>
              <span style={{ color: 'var(--cyan)' }}> {launching === 'market' ? 'Market' : 'Bet'}</span>
            </div>
            <div style={{ position: 'relative', width: 64, height: 64, marginBottom: '2rem' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: launching === 'market' ? 'var(--gold)' : 'var(--cyan)', animation: 'spin 1.1s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--cyan)', animation: 'spin 0.75s linear infinite reverse' }} />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {launching === 'market' ? (lang === 'es' ? 'Cargando mercados…' : 'Loading markets…') : (lang === 'es' ? 'Cargando análisis…' : 'Loading analysis…')}
            </p>
          </div>
        )}
      </div>

      {/* Telegram status + Bundle CTA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 'clamp(0.8rem,3vw,1.2rem)' }}>

        {/* Telegram status */}
        <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1rem,4vw,1.8rem)' }}>
          <h2 style={{ fontSize: '0.92rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif', color: 'var(--text2)' }}>
            <TelegramIcon /> Telegram
          </h2>
          <div style={{ padding: '0.85rem 1rem', background: user.telegramLinked ? 'rgba(0,200,122,0.05)' : 'var(--card2)', borderRadius: 12, border: `1px solid ${user.telegramLinked ? 'rgba(0,200,122,0.12)' : 'var(--border)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Telegram</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: user.telegramLinked ? 'var(--green)' : 'var(--muted)' }}>
                  ● {user.telegramLinked ? (lang === 'es' ? 'Vinculado' : 'Linked') : (lang === 'es' ? 'No vinculado' : 'Not linked')}
                </div>
              </div>
              <div style={{ color: user.telegramLinked ? 'var(--green)' : 'var(--muted)' }}><TelegramIcon /></div>
            </div>
          </div>
        </div>

        {/* Bundle CTA */}
        {(user.subscriptions.market === 'free' || user.subscriptions.bets === 'free') && (
          <>
            <style>{`
              @keyframes bundleGlow{0%,100%{box-shadow:0 0 0px rgba(201,168,76,0)}50%{box-shadow:0 0 28px rgba(201,168,76,0.45),0 0 10px rgba(201,168,76,0.2)}}
              @keyframes bundleShake{0%,82%,100%{transform:none}85%{transform:translateX(-5px)}88%{transform:translateX(5px)}91%{transform:translateX(-4px)}94%{transform:translateX(4px)}97%{transform:translateX(-2px)}}
            `}</style>
            <div onClick={() => navigate('/pricing?tab=bundle')} style={{ borderRadius: 18, padding: 'clamp(1rem,4vw,1.8rem)', background: 'linear-gradient(135deg,rgba(201,168,76,0.07),rgba(59,158,255,0.04))', border: '1px solid rgba(201,168,76,0.4)', cursor: 'pointer', transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'center', animation: 'bundleGlow 3.5s ease-in-out infinite, bundleShake 6s ease-in-out infinite' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
            >
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
                <span style={{ color: 'var(--gold)' }}><StarIcon /></span>
                {lang === 'es' ? 'Bundle Total — Ahorra 9€/mes' : 'Full Bundle — Save €9/mo'}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                {lang === 'es' ? 'Market Pro + Bet Pro por solo 49€/mes en vez de 58€' : 'Market Pro + Bet Pro for just €49/mo instead of €58'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
