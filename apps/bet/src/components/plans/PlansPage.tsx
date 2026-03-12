import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLang } from '../../context/LanguageContext';
import { PLANS } from '../../constants';
import type { Plan } from '../../types';

export function PlansPage() {
  const { user, upgradePlan } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState<Plan | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubscribe = async (planId: Plan) => {
    if (!user) { navigate('/login'); return; }
    if (planId === 'free' || planId === user.plan) return;
    setLoading(planId);
    await new Promise(r => setTimeout(r, 1600));
    upgradePlan(planId);
    setLoading(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3500);
  };

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1000, width: '100%' }}>

      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.9rem', borderRadius: 100, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          💎 Xentory Bet Plans
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '0.8rem' }}>
          {t('Elige tu nivel de predicción', 'Choose your prediction level')}
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto 2rem', lineHeight: 1.75 }}>
          {t(
            'Sin permanencia. El acceso al canal de Telegram se activa y cancela automáticamente con tu suscripción.',
            'No commitment. Telegram channel access is activated and cancelled automatically with your subscription.'
          )}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '0.85rem', color: !yearly ? 'var(--text)' : 'var(--muted)' }}>{t('Mensual', 'Monthly')}</span>
          <button onClick={() => setYearly(y => !y)} style={{ width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: yearly ? 'var(--gold)' : 'var(--card2)', position: 'relative', transition: 'background 0.3s' }}>
            <span style={{ position: 'absolute', top: 3, left: yearly ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: yearly ? '#050810' : 'var(--muted)', transition: 'left 0.3s' }} />
          </button>
          <span style={{ fontSize: '0.85rem', color: yearly ? 'var(--text)' : 'var(--muted)' }}>
            {t('Anual', 'Yearly')} <span style={{ color: 'var(--green)', fontSize: '0.75rem' }}>–20%</span>
          </span>
        </div>
      </div>

      {success && (
        <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, color: 'var(--green)', textAlign: 'center', marginBottom: '1.5rem' }}>
          ✅ {t('¡Plan activado! Recibirás acceso al canal de Telegram en breve.', 'Plan activated! You will receive access to the Telegram channel shortly.')}
        </div>
      )}

      <div className="bet-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem', marginBottom: '2.5rem' }}>
        {PLANS.map(plan => {
          const isCurrent = user?.plan === plan.id;
          const isBusy    = loading === plan.id;
          const price     = yearly && plan.price > 0 ? plan.yearlyPrice : plan.price;

          return (
            <div key={plan.id} className="glass" style={{
              borderRadius: 18, padding: '2rem',
              border: plan.popular ? '1px solid rgba(201,168,76,0.35)' : isCurrent ? `1px solid ${plan.color}35` : '1px solid var(--border)',
              background: plan.popular ? 'rgba(201,168,76,0.025)' : 'var(--card)',
              position: 'relative', overflow: 'hidden',
              transition: 'transform 0.3s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>

              {plan.popular && (
                <div style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', padding: '0.2rem 0.6rem', background: 'var(--gold-dim)', color: 'var(--gold)', fontSize: '0.62rem', letterSpacing: '0.1em', borderRadius: 4, border: '1px solid rgba(201,168,76,0.2)' }}>
                  {t('MÁS POPULAR', 'MOST POPULAR')}
                </div>
              )}
              {isCurrent && (
                <div style={{ position: 'absolute', top: plan.popular ? '3rem' : '1.2rem', right: '1.2rem', padding: '0.2rem 0.6rem', background: `${plan.color}12`, color: plan.color, fontSize: '0.62rem', borderRadius: 4 }}>
                  ✓ {t('ACTIVO', 'ACTIVE')}
                </div>
              )}

              <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.1rem', color: plan.color, marginBottom: '0.2rem' }}>{plan.name}</div>

              <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '2.6rem', letterSpacing: '-0.04em', margin: '0.8rem 0 0.2rem', lineHeight: 1 }}>
                {plan.price === 0 ? 'Free' : <><sup style={{ fontSize: '1rem', fontWeight: 400 }}>€</sup>{price}</>}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '1.3rem' }}>
                {plan.price === 0
                  ? t('Sin tarjeta de crédito', 'No credit card')
                  : yearly
                    ? t(`al año (${Math.round(price / 12)}€/mes)`, `per year (${Math.round(price / 12)}€/mo)`)
                    : t('al mes · cancela cuando quieras', 'per month · cancel anytime')}
              </div>

              <div style={{ height: 1, background: 'var(--border)', marginBottom: '1.3rem' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.8rem' }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.84rem' }}>
                    <span style={{ color: f.included ? 'var(--green)' : 'rgba(255,255,255,0.15)', fontWeight: 700, flexShrink: 0, marginTop: '0.1rem' }}>{f.included ? '✓' : '✗'}</span>
                    <span style={{ color: f.included ? (f.highlight ? 'var(--text)' : 'var(--text2)') : 'var(--muted)', fontWeight: f.highlight ? 500 : 300 }}>{f.label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(plan.id as Plan)}
                disabled={isCurrent || isBusy || plan.id === 'free'}
                style={{
                  width: '100%', padding: '0.8rem', borderRadius: 8,
                  border: plan.popular ? 'none' : `1px solid ${plan.color}30`,
                  cursor: (isCurrent || plan.id === 'free') ? 'not-allowed' : 'pointer',
                  fontFamily: 'Figtree', fontWeight: plan.popular ? 600 : 500, fontSize: '0.88rem',
                  background: isCurrent ? 'var(--card2)' : plan.popular ? 'linear-gradient(135deg,var(--gold),var(--gold-l))' : `${plan.color}12`,
                  color: isCurrent ? 'var(--muted)' : plan.popular ? '#050810' : plan.color,
                  opacity: (isCurrent || plan.id === 'free') ? 0.7 : 1,
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                {isBusy
                  ? <span className="animate-spin" style={{ display: 'inline-block', width: 15, height: 15, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  : isCurrent ? `✓ ${t('Plan actual', 'Current plan')}`
                  : plan.price === 0 ? t('Plan gratuito', 'Free plan')
                  : `${t('Activar', 'Activate')} ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem', lineHeight: 1.9 }}>
        🔒 {t('Pagos seguros procesados por Stripe · Cifrado SSL', 'Secure payments processed by Stripe · SSL Encrypted')}<br />
        {t(
          'El acceso a Telegram se activa y desactiva automáticamente con tu suscripción.',
          'Telegram access is activated and deactivated automatically with your subscription.'
        )}<br />
        <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none' }}>{t('Política de reembolso', 'Refund policy')}</a> ·{' '}
        <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none' }}>{t('Términos de uso', 'Terms of use')}</a> ·{' '}
        <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none' }}>{t('Juego responsable', 'Responsible gambling')}</a>
      </div>
    </div>
  );
}
