import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { MARKET_PLANS, BETS_PLANS, BUNDLE } from '../../constants';
import { supabase } from '../../lib/supabase';
import { deviceFingerprint } from '../../lib/fingerprint';
import type { Plan } from '../../types';

const SUPABASE_FN = 'https://mtgatdmrpfysqphdgaue.supabase.co/functions/v1';

type PlatformTab = 'market' | 'bets' | 'bundle';

const CheckIcon = ({ ok }: { ok: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ok ? '2.5' : '2'} strokeLinecap="round" style={{ color: ok ? 'var(--green)' : 'var(--border2)', flexShrink: 0, marginTop: '1px' }}>
    {ok ? <polyline points="20 6 9 17 4 12"/> : <line x1="6" y1="12" x2="18" y2="12"/>}
  </svg>
);
const ShieldIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.6" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const SpinnerIcon = () => (
  <span style={{ display: 'inline-block', width: 15, height: 15, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
);
const MarketIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const BetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/>
  </svg>
);
const BundleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);

export function PricingPage() {
  const { user, upgradeMarket, upgradeBets } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTab = (['market','bets','bundle'] as PlatformTab[]).includes(searchParams.get('tab') as PlatformTab)
    ? searchParams.get('tab') as PlatformTab : 'market';
  const initialPlan = searchParams.get('plan') as Plan | null;

  const [platform, setPlatform] = useState<PlatformTab>(initialTab);
  const [yearly,   setYearly]   = useState(searchParams.get('interval') === 'yearly');
  const [loading,    setLoading]    = useState<string | null>(null);
  const [success,    setSuccess]    = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  // plataformas donde este usuario YA usó el trial (comprobación por user_id)
  const [trialUsed,  setTrialUsed]  = useState<Record<string, boolean>>({});

  // Cargar historial de trial del usuario actual
  useEffect(() => {
    if (!user) return;
    supabase
      .from('trial_usage')
      .select('platform')
      .then(({ data }) => {
        if (!data) return;
        const used: Record<string, boolean> = {};
        data.forEach((r: { platform: string }) => { used[r.platform] = true; });
        setTrialUsed(used);
      });
  }, [user]);

  // Detectar retorno desde Stripe (?success=true)
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      const plt  = searchParams.get('platform') ?? 'market';
      const plan = (searchParams.get('plan') ?? 'pro') as Plan;
      setSuccess(`${plt}-${plan}`);
      // Actualizar plan en el estado local inmediatamente (hasta que el webhook confirme)
      if (plt === 'market' || plt === 'bundle') upgradeMarket(plan);
      if (plt === 'bets'   || plt === 'bundle') upgradeBets(plan);
      // Limpiar params de la URL
      window.history.replaceState({}, '', '/pricing');
    }
  }, []);

  const plans = platform === 'market' ? MARKET_PLANS : platform === 'bets' ? BETS_PLANS : [];

  // ── Llamar al Edge Function create-checkout ───────────────────────────
  const startCheckout = async (plt: string, plan: string, interval: string) => {
    if (!user) { navigate('/register'); return; }

    const key = `${plt}-${plan}`;
    setLoading(key);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { navigate('/login'); return; }

      // Fingerprint del dispositivo para el control anti-abuso del trial
      const fp = await deviceFingerprint();

      const res = await fetch(`${SUPABASE_FN}/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          platform:    plt,
          plan,
          interval,
          device_fp:   fp,
          success_url: `${window.location.origin}/pricing?success=true&platform=${plt}&plan=${plan}`,
          cancel_url:  `${window.location.origin}/pricing?tab=${plt}`,
        }),
      });

      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setError(json.error ?? 'Error al iniciar el pago');
        setLoading(null);
      }
    } catch (e) {
      setError('Error de conexión. Inténtalo de nuevo.');
      setLoading(null);
    }
  };

  const handleSubscribe = (planId: Plan, plt: 'market' | 'bets') => {
    if (planId === 'free') return;
    startCheckout(plt, planId, yearly ? 'yearly' : 'monthly');
  };

  const handleBundle = () => {
    startCheckout('bundle', 'pro', yearly ? 'yearly' : 'monthly');
  };

  const currentPlan = (plt: 'market' | 'bets') =>
    user ? (plt === 'market' ? user.subscriptions.market : user.subscriptions.bets) : 'free';

  const TABS: [PlatformTab, React.ReactNode, string][] = [
    ['market', <MarketIcon />, t('pricing.tab.market')],
    ['bets',   <BetIcon />,   t('pricing.tab.bets')],
    ['bundle', <BundleIcon />,t('pricing.tab.bundle')],
  ];

  const TRUST = [
    t('pricing.trust1'), t('pricing.trust2'), t('pricing.trust3'), t('pricing.trust4'),
  ];

  return (
    <div style={{ paddingTop: 'calc(var(--bar-h) + 32px)', minHeight: '100vh' }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: 'clamp(3rem,6vw,5rem) clamp(1rem,5vw,2rem) clamp(2.5rem,5vw,3.5rem)', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(201,168,76,0.07), transparent 65%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.22rem 0.75rem', borderRadius: 100, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1.2rem', fontWeight: 600 }}>
          {t('pricing.badge')}
        </div>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', marginBottom: '0.9rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
          {t('pricing.title')}
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 500, margin: '0 auto 2.5rem', lineHeight: 1.75, fontSize: '0.9rem' }}>
          {t('pricing.sub')}
        </p>

        {/* Billing toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: !yearly ? 'var(--text)' : 'var(--muted)', transition: 'color 0.2s' }}>{t('pricing.monthly')}</span>
          <button onClick={() => setYearly(y => !y)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: yearly ? 'var(--gold)' : 'var(--card2)', position: 'relative', transition: 'background 0.25s', padding: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: yearly ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: yearly ? 'var(--bg)' : 'var(--muted)', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', display: 'block' }} />
          </button>
          <span style={{ fontSize: '0.85rem', color: yearly ? 'var(--text)' : 'var(--muted)', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {t('pricing.yearly')}
            <span style={{ fontSize: '0.72rem', color: 'var(--green)', background: 'var(--green-dim)', padding: '0.1rem 0.45rem', borderRadius: 4, border: '1px solid rgba(0,200,122,0.2)', fontWeight: 600 }}>{t('pricing.save')}</span>
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ marginBottom: '1.5rem', padding: '0.8rem 1.2rem', borderRadius: 10, background: 'rgba(255,68,85,0.1)', border: '1px solid rgba(255,68,85,0.3)', color: 'var(--red)', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Platform tabs */}
        <div style={{ display: 'inline-flex', background: 'var(--card2)', borderRadius: 12, padding: '0.3rem', gap: '0.2rem', border: '1px solid var(--border)' }}>
          {TABS.map(([key, icon, label]) => (
            <button key={key} onClick={() => setPlatform(key)} style={{
              padding: '0.55rem 1.2rem', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.83rem',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: platform === key ? (key === 'bundle' ? 'linear-gradient(135deg,var(--gold),var(--gold-l))' : 'var(--card3)') : 'transparent',
              color: platform === key ? (key === 'bundle' ? 'var(--bg)' : 'var(--text)') : 'var(--muted)',
              transition: 'all 0.18s',
              boxShadow: platform === key && key !== 'bundle' ? '0 1px 8px rgba(0,0,0,0.2)' : 'none',
            }}>
              <span style={{ opacity: platform === key ? 1 : 0.5 }}>{icon}</span>
              <span style={{ display: 'inline' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SUCCESS BANNER ───────────────────────────────────────── */}
      {success && (
        <div style={{ maxWidth: 1120, margin: '0 auto 0.5rem', padding: '0 clamp(1rem,4vw,2rem)' }}>
          <div style={{ padding: '0.9rem 1.4rem', background: 'rgba(0,200,122,0.07)', border: '1px solid rgba(0,200,122,0.2)', borderRadius: 10, color: 'var(--green)', textAlign: 'center', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            {t('pricing.success')}
          </div>
        </div>
      )}

      {/* ── PLANS GRID ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0.5rem clamp(1rem,4vw,2rem) 5rem' }}>

        {platform === 'bundle' ? (
          /* ── BUNDLE CARD ── */
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '1rem' }}>
            <div className="glass" style={{ maxWidth: 520, width: '100%', borderRadius: 22, padding: 'clamp(1.8rem,5vw,2.8rem)', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.018)', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
              {/* Top accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,var(--gold),var(--cyan))' }} />
              {/* Icon */}
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem', color: 'var(--gold)' }}>
                <BundleIcon />
              </div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.3rem' }}>{BUNDLE.name}</div>
              <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.87rem', lineHeight: 1.7 }}>{BUNDLE.description}</p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>{t('pricing.bundle.individual')}</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.4rem', textDecoration: 'line-through', color: 'var(--muted)' }}>
                    {yearly ? `${Math.round(58 * 12 * 0.8)}€${t('pricing.yr')}` : `58€${t('pricing.mo')}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>{t('pricing.bundle.price')}</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '2.4rem', color: 'var(--gold)', letterSpacing: '-0.04em', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
                    {yearly
                      ? <>{Math.round(BUNDLE.monthlyPrice * 12 * 0.8)}€<span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 300 }}>{t('pricing.yr')}</span></>
                      : <>{BUNDLE.monthlyPrice}€<span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 300 }}>{t('pricing.mo')}</span></>}
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(0,200,122,0.06)', border: '1px solid rgba(0,200,122,0.15)', borderRadius: 9, padding: '0.7rem 1rem', marginBottom: '2rem', fontSize: '0.88rem', color: 'var(--green)', fontWeight: 600 }}>
                {t('pricing.bundle.save')} {BUNDLE.saving}€{t('pricing.mo')} vs individual
              </div>

              <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
                {['All Xentory Market Pro included', 'All Xentory Bet Pro included', '2 premium Telegram channels', 'Market + sports signals', 'One single subscription'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.65rem', fontSize: '0.87rem', alignItems: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ color: 'var(--text2)' }}>{f}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleBundle} disabled={loading === 'bundle'} className="btn btn-gold btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
                {loading === 'bundle' ? <SpinnerIcon /> : t('pricing.bundle.cta')}
              </button>
            </div>
          </div>
        ) : (
          /* ── INDIVIDUAL PLANS ── */
          <div className="pricing-grid" style={{ paddingTop: '1rem' }}>
            {plans.map(plan => {
              const plt = platform as 'market' | 'bets';
              const current = currentPlan(plt);
              const isCurrent = current === plan.id;
              const isBusy = loading === `${plt}-${plan.id}`;
              const price = yearly && plan.price > 0 ? plan.yearlyPrice : plan.price;
              const isPaid = plan.price > 0;
              // Trial: disponible si el usuario no lo usó en esta plataforma
              // (el dispositivo se comprueba en el backend)
              const trialAvailable = isPaid && !trialUsed[plt] && !trialUsed['bundle'];

              return (
                <div key={plan.id} style={{
                  borderRadius: 20, padding: 'clamp(1.5rem,3vw,2.2rem)',
                  background: plan.popular ? 'rgba(201,168,76,0.02)' : 'var(--card)',
                  border: plan.popular ? '1px solid rgba(201,168,76,0.3)' : isCurrent ? `1px solid ${plan.color}30` : '1px solid var(--border)',
                  position: 'relative', overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* Top accent line */}
                  {plan.popular && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${plan.color},${plan.color}80)` }} />}

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.2rem', flexWrap: 'wrap', minHeight: 24 }}>
                    {plan.popular && <span style={{ padding: '0.18rem 0.55rem', background: 'var(--gold-dim)', color: 'var(--gold)', fontSize: '0.6rem', letterSpacing: '0.1em', borderRadius: 4, border: '1px solid rgba(201,168,76,0.2)', fontWeight: 700 }}>{t('pricing.popular')}</span>}
                    {isCurrent && <span style={{ padding: '0.18rem 0.55rem', background: `${plan.color}12`, color: plan.color, fontSize: '0.6rem', letterSpacing: '0.1em', borderRadius: 4, fontWeight: 700 }}>{t('pricing.active')}</span>}
                    {trialAvailable && !isCurrent && (
                      <span style={{ padding: '0.18rem 0.55rem', background: 'rgba(0,200,122,0.08)', color: 'var(--green)', fontSize: '0.6rem', letterSpacing: '0.08em', borderRadius: 4, border: '1px solid rgba(0,200,122,0.2)', fontWeight: 700 }}>
                        7 días gratis
                      </span>
                    )}
                    {isPaid && trialUsed[plt] && !isCurrent && (
                      <span style={{ padding: '0.18rem 0.55rem', background: 'var(--card2)', color: 'var(--muted)', fontSize: '0.6rem', letterSpacing: '0.08em', borderRadius: 4, border: '1px solid var(--border)', fontWeight: 600 }}>
                        Prueba utilizada
                      </span>
                    )}
                  </div>

                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: plan.color, marginBottom: '1rem' }}>{plan.name}</div>

                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '2.4rem', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '0.3rem' }}>
                    {plan.price === 0 ? t('pricing.free.label') : <><sup style={{ fontSize: '0.9rem', fontWeight: 400, verticalAlign: 'super' }}>€</sup>{price}</>}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.76rem', marginBottom: '1.4rem', lineHeight: 1.4 }}>
                    {plan.price === 0 ? t('pricing.free.sub') : yearly ? `${t('pricing.per.year')} (${Math.round(price / 12)}€${t('pricing.mo')})` : t('pricing.per.month')}
                  </div>

                  <div style={{ height: 1, background: 'var(--border)', marginBottom: '1.3rem' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1.8rem' }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start', fontSize: '0.83rem' }}>
                        <CheckIcon ok={f.included} />
                        <span style={{ color: f.included ? (f.highlight ? 'var(--text)' : 'var(--text2)') : 'var(--muted)', fontWeight: f.highlight ? 500 : 400 }}>{f.label}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => handleSubscribe(plan.id as Plan, plt)} disabled={isCurrent || isBusy} style={{
                    width: '100%', padding: '0.78rem', borderRadius: 9, border: plan.popular ? 'none' : `1px solid ${plan.color}28`,
                    cursor: isCurrent ? 'not-allowed' : 'pointer',
                    fontFamily: 'Figtree, sans-serif', fontWeight: plan.popular ? 600 : 500, fontSize: '0.88rem',
                    background: isCurrent ? 'var(--card2)' : plan.popular ? `linear-gradient(135deg,var(--gold),var(--gold-l))` : `${plan.color}10`,
                    color: isCurrent ? 'var(--muted)' : plan.popular ? 'var(--bg)' : plan.color,
                    opacity: isCurrent ? 0.65 : 1, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                  }}>
                    {isBusy
                      ? <SpinnerIcon />
                      : isCurrent
                        ? t('pricing.current')
                        : plan.price === 0
                          ? t('pricing.start.free')
                          : trialAvailable
                            ? `Probar ${plan.name} gratis →`
                            : `${t('pricing.activate')} ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── GUARANTEE / DISCLAIMER ─────────────────────────────── */}
        <div style={{ margin: '2.5rem 0 1.5rem', padding: 'clamp(1.2rem,3vw,1.8rem)', borderRadius: 16, background: 'linear-gradient(135deg,rgba(0,200,122,0.04),rgba(201,168,76,0.03))', border: '1px solid rgba(0,200,122,0.12)', display: 'flex', alignItems: 'flex-start', gap: '1.2rem', flexWrap: 'wrap' }}>
          <div style={{ flexShrink: 0, marginTop: '2px' }}><ShieldIcon /></div>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(0.95rem,2.5vw,1.1rem)', marginBottom: '0.3rem' }}>{t('pricing.guarantee.title')}</div>
            <div style={{ color: 'var(--text2)', fontSize: '0.86rem', maxWidth: 520, lineHeight: 1.7 }}>{t('pricing.guarantee.desc')}</div>
          </div>
        </div>

        {/* Trust row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1rem,3vw,2.5rem)', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {TRUST.map(txt => (
            <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              {txt}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.72rem', lineHeight: 1.8 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: '0.3rem', verticalAlign: 'middle' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Stripe SSL 256-bit ·{' '}
          <a href="/terminos" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Terms</a> ·{' '}
          <a href="/terminos" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Privacy</a>
        </div>
      </div>
    </div>
  );
}
