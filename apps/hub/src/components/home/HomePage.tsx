import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { LiveTicker } from '../layout/LiveTicker';

// ── DATA ──────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Carlos M.',    role: 'Trader · Madrid',         avatar: 'CM', text: 'Primera semana usando Xentory Market: +12% en cripto. Me dice exactamente cuándo comprar y por qué.', result: '+12% primera semana',  plan: 'Pro'   },
  { name: 'Alejandro R.', role: 'Apostador · Barcelona',   avatar: 'AR', text: 'Mi ROI en apuestas subió un 23% en el primer mes. Las señales de Xentory Bet llegan directo a Telegram.',    result: '+23% ROI en 30 días', plan: 'Elite' },
  { name: 'María T.',     role: 'Inversora · Valencia',    avatar: 'MT', text: 'Cada mañana tengo las señales esperándome. Sin complicaciones, sin horas mirando pantallas.', result: 'Ahorra 2h diarias',   plan: 'Pro'   },
  { name: 'Diego F.',     role: 'Day trader · México DF',  avatar: 'DF', text: 'Probé el plan gratuito y en 3 días entendí por qué vale la pena pagar. Mejor que el 90% de YouTube.',  result: 'Convirtió en 3 días',  plan: 'Pro'   },
];

// ── SMALL COMPONENTS ─────────────────────────────────────────────

function SectionBadge({ label }: { label: string }) {
  return (
    <div style={{
      display: 'inline-block', padding: '0.3rem 0.9rem', borderRadius: 100,
      background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)',
      color: 'var(--gold)', fontSize: '0.72rem', letterSpacing: '0.1em',
      textTransform: 'uppercase' as const, marginBottom: '1rem',
    }}>
      {label}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.2rem 0', textAlign: 'left', gap: '1rem',
        }}
      >
        <span style={{ fontWeight: 500, fontSize: 'clamp(0.85rem,2.5vw,0.95rem)', color: 'var(--text)', lineHeight: 1.5 }}>
          {q}
        </span>
        <span style={{
          color: 'var(--gold)', fontSize: '1.3rem', flexShrink: 0,
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>+</span>
      </button>
      {open && (
        <p style={{ paddingBottom: '1.2rem', color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.8, margin: 0 }}>
          {a}
        </p>
      )}
    </div>
  );
}

function TestimonialCard({ item }: { item: typeof TESTIMONIALS[0] }) {
  return (
    <div className="glass" style={{ borderRadius: 16, padding: 'clamp(1.2rem,3vw,1.6rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>★★★★★</div>
      <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.8, flex: 1, margin: 0 }}>
        "{item.text}"
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,var(--gold),var(--green))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.75rem', color: 'var(--bg)',
          }}>
            {item.avatar}
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.role}</div>
          </div>
        </div>
        <div style={{
          padding: '0.2rem 0.7rem', borderRadius: 100, fontSize: '0.72rem',
          background: 'rgba(0,255,136,0.1)', color: 'var(--green)',
          border: '1px solid rgba(0,255,136,0.2)', fontWeight: 600,
        }}>
          {item.result}
        </div>
      </div>
    </div>
  );
}

function ExitPopup({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div className="glass-2" style={{
        borderRadius: 24, padding: 'clamp(1.5rem,5vw,2.5rem)',
        maxWidth: 500, width: '100%', textAlign: 'center',
        border: '1px solid rgba(201,168,76,0.3)', position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1.2rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', fontSize: '1.3rem', lineHeight: 1,
        }}>✕</button>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>🎁</div>
        <h2 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: 'clamp(1.2rem,4vw,1.6rem)', marginBottom: '0.7rem', letterSpacing: '-0.02em' }}>
          Espera — prueba <span className="text-gradient-gold">7 días gratis</span>
        </h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Antes de irte, activa tu prueba gratuita del Plan Pro.<br />
          <strong style={{ color: 'var(--text)' }}>Sin compromiso. Cancela cuando quieras.</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
          <input
            className="input" type="email" placeholder="tu@email.com"
            value={email} onChange={e => setEmail(e.target.value)}
            style={{ textAlign: 'center' }}
          />
          <button
            onClick={() => { if (email) { onClose(); navigate('/register'); } }}
            className="btn btn-gold btn-lg"
            style={{ justifyContent: 'center', width: '100%' }}
          >
            Activar 7 días gratis →
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.72rem', color: 'var(--muted)', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
          <span>✓ Sin tarjeta</span>
          <span>✓ Análisis basados en IA · No garantizan rentabilidad</span>
          <span>✓ Cancela cuando quieras</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.78rem', textDecoration: 'underline' }}>
          No, seguiré con el plan gratuito
        </button>
      </div>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────

export function HomePage() {
  const { t } = useLang();

  const STATS = [
    { value: '4.2s',   label: t('home.stats.analysis'), color: 'var(--gold)'  },
    { value: '5',      label: t('home.stats.markets'),  color: 'var(--cyan)'  },
    { value: '68%',    label: t('home.stats.accuracy'), color: 'var(--green)' },
    { value: t('home.stats.freeVal'), label: t('home.stats.free'), color: 'var(--text)' },
  ];

  const HOW_STEPS = [
    { num: '01', icon: '🔌', title: t('home.how.s1t'), desc: t('home.how.s1d') },
    { num: '02', icon: '🧠', title: t('home.how.s2t'), desc: t('home.how.s2d') },
    { num: '03', icon: '📲', title: t('home.how.s3t'), desc: t('home.how.s3d') },
  ];

  const FAQS = [
    { q: t('home.faq.q1'), a: t('home.faq.a1') },
    { q: t('home.faq.q2'), a: t('home.faq.a2') },
    { q: t('home.faq.q3'), a: t('home.faq.a3') },
    { q: t('home.faq.q4'), a: t('home.faq.a4') },
    { q: t('home.faq.q5'), a: t('home.faq.a5') },
    { q: t('home.faq.q6'), a: t('home.faq.a6') },
    { q: t('home.faq.q7'), a: t('home.faq.a7') },
    { q: t('home.faq.q8'), a: t('home.faq.a8') },
  ];
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showExit, setShowExit] = useState(false);
  const exitFired = useRef(false);

  // IntersectionObserver — uses querySelectorAll so ref timing never matters
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    const observe = () =>
      document.querySelectorAll<HTMLElement>('.reveal:not(.visible)').forEach(el => io.observe(el));
    observe();
    const tid = setTimeout(observe, 120);
    return () => { clearTimeout(tid); io.disconnect(); };
  }, []);

    // Exit intent
  useEffect(() => {
    if (user) return;
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && !exitFired.current) {
        exitFired.current = true;
        setTimeout(() => setShowExit(true), 300);
      }
    };
    const onHide = () => {
      if (document.hidden && !exitFired.current) {
        exitFired.current = true;
        setTimeout(() => setShowExit(true), 800);
      }
    };
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [user]);


  return (
    <div>
      {showExit && <ExitPopup onClose={() => setShowExit(false)} />}

      <LiveTicker />

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: 'calc(var(--nav-h) + 36px + 4rem) clamp(1rem,5vw,2rem) 5rem',
        background: 'radial-gradient(ellipse at 25% 40%,rgba(201,168,76,0.06) 0%,transparent 55%),radial-gradient(ellipse at 75% 30%,rgba(0,212,255,0.05) 0%,transparent 50%)',
      }}>
        <div className="animate-fadeUp" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.35rem 1rem', borderRadius: 100,
          border: '1px solid rgba(0,212,255,0.3)', background: 'var(--cyan-dim)',
          color: 'var(--cyan)', fontSize: '0.72rem', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: '2rem',
        }}>
          <span className="live-dot" /> Ahora en beta privada · Plazas limitadas
        </div>

        <h1 className="animate-fadeUp" style={{
          fontFamily: 'Urbanist', fontWeight: 800,
          fontSize: 'clamp(2rem,7vw,4.5rem)', lineHeight: 1.08,
          letterSpacing: '-0.04em', maxWidth: 820, marginBottom: '1rem',
          animationDelay: '0.1s',
        }}>
          Toma mejores decisiones de{' '}
          <span className="text-gradient-gold">inversión y apuestas</span>{' '}
          con inteligencia artificial
        </h1>

        <p className="animate-fadeUp" style={{
          fontSize: 'clamp(0.95rem,2.5vw,1.15rem)', color: 'var(--text2)',
          maxWidth: 580, lineHeight: 1.8, marginBottom: '2.5rem',
          animationDelay: '0.2s',
        }}>
          Deja de perder tiempo buscando señales en Telegram o YouTube.<br />
          <strong style={{ color: 'var(--text)' }}>
            Xentory analiza mercados financieros y partidos deportivos con Google Gemini
          </strong>{' '}
          y te dice qué hacer — en segundos.
        </p>

        <div className="animate-fadeUp" style={{
          display: 'flex', gap: '0.8rem', flexWrap: 'wrap',
          justifyContent: 'center', marginBottom: '1.2rem', animationDelay: '0.3s',
        }}>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            className="btn btn-gold btn-xl"
          >
            {user ? 'Ir al dashboard →' : 'Empieza gratis — sin tarjeta →'}
          </button>
          <button
            onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn btn-outline btn-xl"
          >
            Ver cómo funciona
          </button>
        </div>

        <p className="animate-fadeUp" style={{ fontSize: '0.78rem', color: 'var(--muted)', animationDelay: '0.4s' }}>
          ✓ Gratis para empezar &nbsp;·&nbsp; ✓ 7 días de prueba Pro sin tarjeta &nbsp;·&nbsp; ✓ Análisis basados en IA · No garantizan rentabilidad
        </p>

        <div className="animate-fadeUp" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: 'clamp(0.5rem,2vw,1.5rem)', marginTop: '4rem',
          maxWidth: 700, width: '100%', animationDelay: '0.5s',
        }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: 'clamp(1.3rem,3vw,2rem)', color: s.color, letterSpacing: '-0.03em' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 'clamp(0.6rem,1.5vw,0.72rem)', color: 'var(--muted)', marginTop: '0.25rem', lineHeight: 1.3 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PROBLEMA → SOLUCIÓN ═══════════════════════════════════════ */}
      <section className="reveal" style={{ padding: 'clamp(4rem,8vw,6rem) clamp(1rem,5vw,2rem)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.5rem' }}>
          {[
            { icon: '😤', label: t('home.problem.badge'), title: t('home.problem.p1t'), desc: t('home.problem.p1d'), color: 'var(--red)' },
            { icon: '🧠', label: t('home.problem.sol'),   title: t('home.problem.p2t'), desc: t('home.problem.p2d'), color: 'var(--green)' },
            { icon: '📲', label: t('home.problem.soldesc'), title: t('home.problem.p3t'), desc: t('home.problem.p3d'), color: 'var(--gold)' },
          ].map((c, i) => (
            <div key={i} className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,3vw,2rem)', borderTop: `2px solid ${c.color}` }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>{c.icon}</div>
              <div style={{ fontSize: '0.68rem', color: c.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 600 }}>{c.label}</div>
              <h3 style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: 'clamp(1rem,2vw,1.1rem)', marginBottom: '0.6rem' }}>{c.title}</h3>
              <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.75, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PLATFORMS ════════════════════════════════════════════════ */}
      <section className="reveal" style={{ padding: 'clamp(4rem,8vw,6rem) clamp(1rem,5vw,2rem)', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <SectionBadge label="Ecosistema completo" />
            <h2 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: 'clamp(1.8rem,5vw,2.8rem)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
              Dos plataformas. <span className="text-gradient-gold">Una sola cuenta.</span>
            </h2>
            <p style={{ color: 'var(--text2)', maxWidth: 500, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.75 }}>
              La única plataforma en español que combina análisis financiero y predicción deportiva con IA bajo una sola suscripción.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.5rem' }}>
            <div className="glass" style={{ borderRadius: 20, padding: 'clamp(1.5rem,3vw,2.5rem)', borderLeft: '3px solid var(--gold)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📈</div>
              <h3 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: 'clamp(1.2rem,2.5vw,1.5rem)', marginBottom: '0.5rem' }}>
                Xentory <span className="text-gradient-gold">Market</span>
              </h3>
              <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.75, marginBottom: '1.2rem' }}>
                Análisis técnico de cripto, acciones y forex con Google Gemini. RSI, MACD, Bollinger Bands y señales de compra/venta.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
                {['Bitcoin', 'Ethereum', 'NVDA', 'EUR/USD', 'S&P 500', '+50 activos'].map(t => (
                  <span key={t} style={{ padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.7rem', background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)' }}>{t}</span>
                ))}
              </div>
              <button onClick={() => navigate(user ? '/dashboard' : '/register')} className="btn btn-gold">
                {user ? 'Abrir Xentory Market →' : 'Probar gratis →'}
              </button>
            </div>

            <div className="glass" style={{ borderRadius: 20, padding: 'clamp(1.5rem,3vw,2.5rem)', borderLeft: '3px solid var(--green)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚽</div>
              <h3 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: 'clamp(1.2rem,2.5vw,1.5rem)', marginBottom: '0.5rem' }}>
                Xentory <span style={{ color: 'var(--green)' }}>Bet</span>
              </h3>
              <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.75, marginBottom: '1.2rem' }}>
                Predicciones deportivas con análisis de los últimos 5 partidos, todos los mercados (1X2, Over/Under, BTTS, hándicap) y la mejor apuesta del día.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
                {['Champions', 'La Liga', 'Premier', 'NBA', 'ATP/WTA', '+5 deportes'].map(t => (
                  <span key={t} style={{ padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.7rem', background: 'rgba(0,255,136,0.08)', color: 'var(--green)', border: '1px solid rgba(0,255,136,0.2)' }}>{t}</span>
                ))}
              </div>
              <button onClick={() => navigate(user ? '/dashboard' : '/register')} className="btn btn-green">
                {user ? 'Abrir Xentory Bet →' : 'Probar gratis →'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═════════════════════════════════════════════ */}
      <section id="how" className="reveal" style={{ padding: 'clamp(4rem,8vw,6rem) clamp(1rem,5vw,2rem)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <SectionBadge label="Metodología" />
            <h2 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: 'clamp(1.8rem,5vw,2.8rem)', letterSpacing: '-0.03em' }}>
              Cómo genera la IA tus análisis
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.5rem' }}>
            {HOW_STEPS.map((s, i) => (
              <div key={i} className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,3vw,2rem)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontFamily: 'Urbanist', fontWeight: 800, fontSize: '2.5rem', color: 'var(--border2)', lineHeight: 1 }}>
                  {s.num}
                </div>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{s.icon}</div>
                <h3 style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.6rem' }}>{s.title}</h3>
                <p style={{ color: 'var(--text2)', fontSize: '0.88rem', lineHeight: 1.75, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/metodologia" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500, borderBottom: '1px solid rgba(201,168,76,0.3)', paddingBottom: '2px' }}>
              Ver metodología completa y resultados verificados →
            </Link>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ═════════════════════════════════════════════ */}
      <section className="reveal" style={{ padding: 'clamp(4rem,8vw,6rem) clamp(1rem,5vw,2rem)', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <SectionBadge label="Resultados reales" />
            <h2 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: 'clamp(1.8rem,5vw,2.8rem)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
              Lo que dicen nuestros usuarios beta
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
              Resultados de la fase beta privada. Los resultados individuales pueden variar.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: '1rem' }}>
            {TESTIMONIALS.map((item, i) => <TestimonialCard key={i} item={item} />)}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════════════ */}
      <section className="reveal" style={{ padding: 'clamp(4rem,8vw,6rem) clamp(1rem,5vw,2rem)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,3.5rem)' }}>
            <SectionBadge label="FAQ" />
            <h2 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: 'clamp(1.8rem,5vw,2.8rem)', letterSpacing: '-0.03em' }}>
              Resolvemos tus dudas
            </h2>
          </div>
          <div className="glass" style={{ borderRadius: 20, padding: 'clamp(1.2rem,3vw,2rem)' }}>
            {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ════════════════════════════════════════════════ */}
      <section className="reveal" style={{ padding: 'clamp(4rem,8vw,7rem) clamp(1rem,5vw,2rem)', textAlign: 'center' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: 'clamp(1.8rem,5vw,3rem)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Empieza a tomar decisiones{' '}
            <span className="text-gradient-gold">basadas en datos</span>
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 'clamp(0.92rem,2vw,1.05rem)', lineHeight: 1.8, marginBottom: '2rem' }}>
            Regístrate gratis hoy. Sin tarjeta de crédito.<br />
            Accede a análisis de IA en tiempo real. Cancela cuando quieras.
          </p>
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button onClick={() => navigate(user ? '/dashboard' : '/register')} className="btn btn-gold btn-xl">
              {user ? 'Ir al dashboard →' : 'Crear cuenta gratis →'}
            </button>
            <button onClick={() => navigate('/pricing')} className="btn btn-outline btn-xl">
              Ver planes
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(0.8rem,2vw,2rem)', fontSize: '0.78rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
            <span>🔒 Stripe SSL</span>
            <span>✓ Análisis basados en IA · No garantizan rentabilidad</span>
            <span>✓ Sin permanencia</span>
            <span>✓ Cancela cuando quieras</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
