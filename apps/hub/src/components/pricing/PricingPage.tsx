import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MARKET_PLANS, BETS_PLANS, BUNDLE } from '../../constants';
import type { Plan } from '../../types';

type PlatformTab = 'market' | 'bets' | 'bundle';

function Check({ ok }: { ok: boolean }) {
  return <span style={{ color: ok ? 'var(--green)' : 'var(--border2)', fontWeight: 700, flexShrink: 0 }}>{ok ? '✓' : '✗'}</span>;
}

export function PricingPage() {
  const { user, upgradeMarket, upgradeBets } = useAuth();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<PlatformTab>('market');
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const plans = platform === 'market' ? MARKET_PLANS : platform === 'bets' ? BETS_PLANS : [];

  const handleSubscribe = async (planId: Plan, plt: 'market' | 'bets') => {
    if (!user) { navigate('/register'); return; }
    setLoading(`${plt}-${planId}`);
    await new Promise(r => setTimeout(r, 1600));
    if (plt === 'market') upgradeMarket(planId);
    else upgradeBets(planId);
    setLoading(null);
    setSuccess(`${plt}-${planId}`);
    setTimeout(() => setSuccess(null), 3500);
  };

  const handleBundle = async () => {
    if (!user) { navigate('/register'); return; }
    setLoading('bundle');
    await new Promise(r => setTimeout(r, 1800));
    upgradeMarket('pro');
    upgradeBets('pro');
    setLoading(null);
    setSuccess('bundle');
    setTimeout(() => setSuccess(null), 3500);
  };

  const currentPlan = (plt: 'market' | 'bets') =>
    user ? (plt === 'market' ? user.subscriptions.market : user.subscriptions.bets) : 'free';

  return (
    <div style={{ paddingTop: 'calc(var(--bar-h) + 38px)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '4rem 2rem 3rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.06), transparent 60%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.9rem', borderRadius: 100, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>
          💎 Planes & Precios
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', marginBottom: '1rem', fontFamily: 'Urbanist', fontWeight: 800 }}>
          Elige tu nivel de análisis
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.75 }}>
          Sin permanencia. Cancela cuando quieras. El acceso a Telegram se gestiona automáticamente con tu suscripción activa.
        </p>

        {/* Billing toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: !yearly ? 'var(--text)' : 'var(--muted)' }}>Monthly</span>
          <button onClick={() => setYearly(y => !y)} style={{ width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: yearly ? 'var(--gold)' : 'var(--card2)', position: 'relative', transition: 'background 0.3s' }}>
            <span style={{ position: 'absolute', top: 3, left: yearly ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: yearly ? 'var(--bg)' : 'var(--muted)', transition: 'left 0.3s' }} />
          </button>
          <span style={{ fontSize: '0.85rem', color: yearly ? 'var(--text)' : 'var(--muted)' }}>
            Anual <span style={{ color: 'var(--green)', fontSize: '0.75rem' }}>–20%</span>
          </span>
        </div>

        {/* Platform tabs */}
        <div style={{ display: 'inline-flex', background: 'var(--card2)', borderRadius: 12, padding: '0.3rem', gap: '0.2rem', border: '1px solid var(--border)' }}>
          {([['market', '📈 Xentory Market'], ['bets', '⚽ Xentory Bet'], ['bundle', '🎯 Bundle']] as [PlatformTab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setPlatform(key)} style={{
              padding: '0.6rem 1.4rem', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'Urbanist', fontWeight: 600, fontSize: '0.85rem',
              background: platform === key ? (key === 'bundle' ? 'linear-gradient(135deg,var(--gold),var(--gold-l))' : 'var(--card)') : 'transparent',
              color: platform === key ? (key === 'bundle' ? 'var(--bg)' : 'var(--text)') : 'var(--muted)',
              transition: 'all 0.2s',
              borderBottom: platform === key && key !== 'bundle' ? '1px solid var(--gold)' : '1px solid transparent',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Success */}
      {success && (
        <div style={{ maxWidth: 1100, margin: '0 auto 1rem', padding: '0 2rem' }}>
          <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, color: 'var(--green)', textAlign: 'center' }}>
            ✅ ¡Plan activado! Recibirás acceso al canal de Telegram en breve.
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem 5rem' }}>

        {platform === 'bundle' ? (
          /* ── BUNDLE ── */
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="glass" style={{
              maxWidth: 540, width: '100%', borderRadius: 20, padding: '2.5rem',
              border: '1px solid rgba(201,168,76,0.35)',
              background: 'rgba(201,168,76,0.025)',
              position: 'relative', overflow: 'hidden', textAlign: 'center',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--gold), var(--cyan))' }} />
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
              <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.3rem' }}>{BUNDLE.name}</div>
              <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.88rem' }}>{BUNDLE.description}</p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Individual price</div>
                  <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.5rem', textDecoration: 'line-through', color: 'var(--muted)' }}>
                    {yearly ? `${Math.round(58 * 12 * 0.8)}€/yr` : '58€/mo'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bundle price</div>
                  <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '2.5rem', color: 'var(--gold)', letterSpacing: '-0.04em', display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
                    {yearly
                      ? <>{Math.round(BUNDLE.monthlyPrice * 12 * 0.8)}€<span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 300 }}>/año</span></>
                      : <>{BUNDLE.monthlyPrice}€<span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 300 }}>/mes</span></>
                    }
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 10, padding: '0.8rem', marginBottom: '2rem' }}>
                <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '0.9rem' }}>💰 Save {BUNDLE.saving}€/mo vs individual</span>
              </div>

              <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
                {['All Xentory Market Pro included', 'All Xentory Bet Pro included', '2 premium Telegram channels', 'Market + sports signals', 'One single subscription', 'Simplified payment management'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.7rem', fontSize: '0.88rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span>
                    <span style={{ color: 'var(--text2)' }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleBundle}
                disabled={loading === 'bundle'}
                className="btn btn-gold btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading === 'bundle' ? <span className="animate-spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid var(--bg)', borderTopColor: 'transparent', borderRadius: '50%' }} /> : '🎯 Activar Bundle Total'}
              </button>
            </div>
          </div>
        ) : (
          /* ── PLANS GRID ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.8rem, 3vw, 1.2rem)' }}>
            {plans.map(plan => {
              const plt = platform as 'market' | 'bets';
              const current = currentPlan(plt);
              const isCurrent = current === plan.id;
              const isBusy = loading === `${plt}-${plan.id}`;
              const price = yearly && plan.price > 0 ? plan.yearlyPrice : plan.price;

              return (
                <div key={plan.id} className="glass plan-card" style={{
                  border: plan.popular ? `1px solid rgba(201,168,76,0.35)` : isCurrent ? `1px solid ${plan.color}35` : '1px solid var(--border)',
                  background: plan.popular ? 'rgba(201,168,76,0.025)' : 'var(--card)',
                }}>
                  {plan.popular && (
                    <div style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', padding: '0.2rem 0.6rem', background: 'var(--gold-dim)', color: 'var(--gold)', fontSize: '0.62rem', letterSpacing: '0.1em', borderRadius: 4, border: '1px solid rgba(201,168,76,0.2)' }}>
                      MÁS POPULAR
                    </div>
                  )}
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: '1.2rem', right: plan.popular ? '8rem' : '1.2rem', padding: '0.2rem 0.6rem', background: `${plan.color}12`, color: plan.color, fontSize: '0.62rem', letterSpacing: '0.1em', borderRadius: 4 }}>
                      ✓ ACTIVO
                    </div>
                  )}

                  <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.1rem', color: plan.color, marginBottom: '0.2rem' }}>{plan.name}</div>

                  <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '2.6rem', letterSpacing: '-0.04em', margin: '0.8rem 0 0.2rem', lineHeight: 1 }}>
                    {plan.price === 0 ? 'Gratis' : <><sup style={{ fontSize: '1rem', fontWeight: 400 }}>€</sup>{price}</>}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '1.3rem' }}>
                    {plan.price === 0 ? 'No credit card required' : yearly ? `per yr (${Math.round(price / 12)}€/mo)` : 'per month · cancel anytime'}
                  </div>

                  <div style={{ height: 1, background: 'var(--border)', marginBottom: '1.3rem' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.8rem' }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.84rem' }}>
                        <Check ok={f.included} />
                        <span style={{ color: f.included ? (f.highlight ? 'var(--text)' : 'var(--text2)') : 'var(--muted)', fontWeight: f.highlight ? 500 : 300 }}>{f.label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.id as Plan, plt)}
                    disabled={isCurrent || isBusy}
                    style={{
                      width: '100%', padding: '0.8rem', borderRadius: 8,
                      border: plan.popular ? 'none' : `1px solid ${plan.color}30`,
                      cursor: isCurrent ? 'not-allowed' : 'pointer',
                      fontFamily: 'DM Sans', fontWeight: plan.popular ? 600 : 500, fontSize: '0.88rem',
                      background: isCurrent ? 'var(--card2)' : plan.popular ? 'linear-gradient(135deg,var(--gold),var(--gold-l))' : `${plan.color}12`,
                      color: isCurrent ? 'var(--muted)' : plan.popular ? 'var(--bg)' : plan.color,
                      opacity: isCurrent ? 0.7 : 1,
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    }}
                  >
                    {isBusy ? <span className="animate-spin" style={{ display: 'inline-block', width: 15, height: 15, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
                      : isCurrent ? '✓ Plan actual'
                      : plan.price === 0 ? 'Start free' : `Activate ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Guarantee banner */}
        <div style={{ margin: '2.5rem 0', padding: 'clamp(1.2rem,3vw,1.8rem)', borderRadius: 16, background: 'linear-gradient(135deg,rgba(0,255,136,0.05),rgba(201,168,76,0.04))', border: '1px solid rgba(0,255,136,0.15)', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>🛡️</div>
          <div>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: 'clamp(1rem,2.5vw,1.2rem)', marginBottom: '0.3rem' }}>Solo análisis basados en IA</div>
            <div style={{ color: 'var(--text2)', fontSize: '0.88rem', maxWidth: 480 }}>Nuestros análisis son generados por inteligencia artificial con fines informativos. No constituyen asesoramiento financiero ni garantizan rentabilidad. Las inversiones y apuestas conllevan riesgo de pérdida de capital.</div>
          </div>
        </div>

        {/* Trust signals row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1rem,3vw,2.5rem)', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {[
            { icon: '🔒', text: 'Pagos con Stripe SSL' },
            { icon: '✓',  text: '7 días de prueba Pro gratis' },
            { icon: '🤖', text: 'Análisis por IA' },
            { icon: '⏹',  text: 'Cancela cuando quieras' },
          ].map(t => (
            <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
              <span style={{ color: 'var(--green)' }}>{t.icon}</span> {t.text}
            </div>
          ))}
        </div>

        {/* Stripe notice */}
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.75rem', lineHeight: 1.8 }}>
          🔒 Pagos seguros procesados por Stripe · Cifrado SSL 256-bit<br />
          El acceso a los canales de Telegram se activa y desactiva automáticamente.<br />
          <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Aviso legal</a> · <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Términos de uso</a> · <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Juego responsable</a>
        </div>
      </div>
    </div>
  );
}
