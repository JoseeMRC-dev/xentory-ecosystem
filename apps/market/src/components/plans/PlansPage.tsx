import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PLANS } from '../../constants';
import type { Plan } from '../../types';

function CheckIcon({ included }: { included: boolean }) {
  return (
    <span style={{ color: included ? 'var(--green)' : 'rgba(255,255,255,0.18)', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
      {included ? '✓' : '✗'}
    </span>
  );
}

export function PlansPage() {
  const { user, upgradePlan } = useAuth();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [yearly, setYearly] = useState(false);
  const [success, setSuccess] = useState<Plan | null>(null);

  const handleSubscribe = async (planId: Plan) => {
    if (planId === 'free') {
      upgradePlan('free');
      return;
    }
    setLoading(planId);

    // In production: redirect to Stripe Checkout
    // const res = await fetch('/api/stripe/create-checkout', {
    //   method: 'POST',
    //   body: JSON.stringify({ planId, userId: user?.id }),
    // });
    // const { url } = await res.json();
    // window.location.href = url;

    // DEMO: simulate Stripe flow
    await new Promise(r => setTimeout(r, 1800));
    upgradePlan(planId);
    setLoading(null);
    setSuccess(planId);
    setTimeout(() => setSuccess(null), 4000);
  };

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1100, width: '100%' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.3rem 0.9rem', borderRadius: 100,
          background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)',
          color: 'var(--gold)', fontSize: '0.75rem', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: '1rem',
        }}>
          💎 Planes & Precios
        </div>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.8rem' }}>
          Elige tu nivel de <span className="text-gradient-gold">análisis</span>
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
          Sin permanencia. Cancela cuando quieras. El acceso a Telegram se gestiona automáticamente con tu suscripción.
        </p>

        {/* Billing toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginTop: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: !yearly ? 'var(--text)' : 'var(--muted)' }}>Mensual</span>
          <button
            onClick={() => setYearly(y => !y)}
            style={{
              width: 48, height: 26,
              borderRadius: 13,
              border: 'none',
              cursor: 'pointer',
              background: yearly ? 'var(--gold)' : 'var(--card2)',
              position: 'relative',
              transition: 'background 0.3s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3,
              left: yearly ? 26 : 3,
              width: 20, height: 20,
              borderRadius: '50%',
              background: yearly ? '#050810' : 'var(--muted)',
              transition: 'left 0.3s',
            }} />
          </button>
          <span style={{ fontSize: '0.85rem', color: yearly ? 'var(--text)' : 'var(--muted)' }}>
            Anual <span style={{ color: 'var(--green)', fontSize: '0.75rem' }}>-20%</span>
          </span>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{
          padding: '1rem 1.5rem',
          background: 'rgba(0,255,136,0.1)',
          border: '1px solid rgba(0,255,136,0.25)',
          borderRadius: 12,
          color: 'var(--green)',
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontWeight: 500,
        }}>
          ✅ ¡Plan {PLANS.find(p => p.id === success)?.name} activado! Recibirás acceso al canal de Telegram en breve.
        </div>
      )}

      {/* Plans grid */}
      <div className="mkt-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {PLANS.map(plan => {
          const isCurrentPlan = user?.plan === plan.id;
          const price = yearly && plan.price > 0 ? Math.round(plan.price * 12 * 0.8) : plan.price;
          const isBusy = loading === plan.id;

          return (
            <div
              key={plan.id}
              className="glass"
              style={{
                borderRadius: 18,
                padding: '2rem',
                position: 'relative',
                overflow: 'hidden',
                border: plan.popular
                  ? `1px solid rgba(201,168,76,0.35)`
                  : isCurrentPlan
                  ? `1px solid ${plan.color}40`
                  : 'var(--border)',
                background: plan.popular ? 'rgba(201,168,76,0.03)' : 'var(--card)',
                transition: 'transform 0.3s, box-shadow 0.3s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 20px 60px ${plan.color}10`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: '1.2rem', right: '1.2rem',
                  padding: '0.2rem 0.7rem',
                  background: 'var(--gold-dim)',
                  color: 'var(--gold)',
                  fontSize: '0.65rem', letterSpacing: '0.1em',
                  borderRadius: 4, border: '1px solid rgba(201,168,76,0.25)',
                }}>
                  MÁS POPULAR
                </div>
              )}

              {/* Current plan badge */}
              {isCurrentPlan && (
                <div style={{
                  position: 'absolute', top: '1.2rem', right: plan.popular ? '8rem' : '1.2rem',
                  padding: '0.2rem 0.7rem',
                  background: `${plan.color}15`,
                  color: plan.color,
                  fontSize: '0.65rem', letterSpacing: '0.1em',
                  borderRadius: 4, border: `1px solid ${plan.color}30`,
                }}>
                  ✓ TU PLAN
                </div>
              )}

              {/* Plan info */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.2rem', color: plan.color }}>
                  {plan.name}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{plan.description}</div>
              </div>

              {/* Price */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '2.8rem', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {plan.price === 0 ? (
                    <span>Gratis</span>
                  ) : (
                    <>
                      <sup style={{ fontSize: '1rem', fontWeight: 400 }}>€</sup>
                      {price}
                    </>
                  )}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                  {plan.price === 0 ? 'Sin tarjeta de crédito' : yearly ? `al año (${Math.round(price / 12)}€/mes)` : 'al mes · cancela cuando quieras'}
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)', marginBottom: '1.5rem' }} />

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2rem' }}>
                {plan.features.map((feat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem' }}>
                    <CheckIcon included={feat.included} />
                    <span style={{
                      color: feat.included ? (feat.highlight ? 'var(--text)' : 'var(--text2)') : 'var(--muted)',
                      fontWeight: feat.highlight ? 500 : 300,
                    }}>
                      {feat.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe(plan.id as Plan)}
                disabled={isCurrentPlan || isBusy}
                className="btn"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: isCurrentPlan
                    ? 'var(--card2)'
                    : plan.popular
                    ? `linear-gradient(135deg, var(--gold), var(--gold-l))`
                    : `${plan.color}15`,
                  color: isCurrentPlan ? 'var(--muted)' : plan.popular ? '#050810' : plan.color,
                  border: plan.popular || isCurrentPlan ? 'none' : `1px solid ${plan.color}30`,
                  fontWeight: plan.popular ? 600 : 500,
                  opacity: isCurrentPlan ? 0.7 : 1,
                  cursor: isCurrentPlan ? 'not-allowed' : 'pointer',
                }}
              >
                {isBusy ? (
                  <span className="animate-spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
                ) : isCurrentPlan ? '✓ Plan actual' : plan.price === 0 ? 'Empezar gratis' : `Activar ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Stripe notice */}
      <div style={{ textAlign: 'center', marginTop: '2.5rem', color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.7 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>🔒</span>
          Pagos seguros procesados por Stripe · Cifrado SSL 256-bit
        </div>
        <div>
          El acceso al canal de Telegram se activa y desactiva automáticamente según tu suscripción.
          No almacenamos datos de tarjeta. · <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Política de reembolso</a>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: '4rem' }}>
        <h2 style={{ fontSize: '1.3rem', textAlign: 'center', marginBottom: '2rem' }}>Preguntas frecuentes</h2>
        <div className="mkt-faq-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[
            { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. Sin permanencia. Tu acceso se mantiene hasta el final del período pagado.' },
            { q: '¿Cómo funciona el acceso a Telegram?', a: 'Al activar tu plan, el bot te añade automáticamente al canal correspondiente. Al cancelar, te retira el acceso.' },
            { q: '¿En qué se diferencia el plan Pro del Elite?', a: 'Elite incluye análisis ilimitados a demanda, informes PDF semanales, acceso API y soporte prioritario 24/7.' },
            { q: '¿Los análisis son asesoramiento financiero?', a: 'No. Xentory Market proporciona contexto técnico e informativo. Las decisiones de inversión son responsabilidad del usuario.' },
          ].map((faq, i) => (
            <div key={i} className="glass" style={{ borderRadius: 12, padding: '1.2rem 1.4rem' }}>
              <div style={{ fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.9rem' }}>{faq.q}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.84rem', lineHeight: 1.6 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
