import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { LiveTicker } from '../layout/LiveTicker';
import { useAccuracyStats } from '../../hooks/useAccuracyStats';
import { trackEvent } from '../../lib/analytics';

// ── SVG ICONS ────────────────────────────────────────────────────────
const IconAPI = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconBrain = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.73A3 3 0 0 1 4 11a3 3 0 0 1 3-3 2.5 2.5 0 0 1 2.5-6z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.73A3 3 0 0 0 20 11a3 3 0 0 0-3-3 2.5 2.5 0 0 0-2.5-6z"/>
  </svg>
);
const IconTelegram = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IconChevron = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconStar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// ── DATA ─────────────────────────────────────────────────────────────
const TESTIMONIALS_ES = [
  { name: 'Carlos M.',    role: 'Trader · Madrid',        avatar: 'CM', text: 'Primera semana usando Xentory Market: +12% en cripto. Me dice exactamente cuándo comprar y por qué.', result: '+12% primera semana', plan: 'Pro' },
  { name: 'Alejandro R.', role: 'Apostador · Barcelona',  avatar: 'AR', text: 'Mi ROI en apuestas subió un 23% en el primer mes. Las señales llegan directo a Telegram.', result: '+23% ROI en 30 días',   plan: 'Elite' },
  { name: 'María T.',     role: 'Inversora · Valencia',   avatar: 'MT', text: 'Cada mañana tengo las señales esperándome. Sin complicaciones, sin horas mirando pantallas.', result: 'Ahorra 2h diarias',   plan: 'Pro' },
  { name: 'Diego F.',     role: 'Day trader · México DF', avatar: 'DF', text: 'Probé el plan gratuito y en 3 días entendí por qué vale la pena pagar.', result: 'Convirtió en 3 días',   plan: 'Pro' },
  { name: 'Lucía V.',     role: 'Analista · Bogotá',      avatar: 'LV', text: 'El análisis de IA me ahorra horas de research. Ahora dedico ese tiempo a ejecutar operaciones, no a buscar señales.', result: '-3h de research/día', plan: 'Elite' },
  { name: 'Martín S.',    role: 'Trader deportivo · Lima',avatar: 'MS', text: 'Antes perdía el 60% de mis apuestas. Con Xentory Bet llevo 8 semanas en positivo consecutivas.', result: '8 semanas en positivo',  plan: 'Elite' },
];
const TESTIMONIALS_EN = [
  { name: 'Carlos M.',    role: 'Trader · Madrid',        avatar: 'CM', text: 'First week using Xentory Market: +12% on crypto. It tells me exactly when to buy and why.', result: '+12% first week',      plan: 'Pro' },
  { name: 'Alejandro R.', role: 'Sports bettor · Barcelona', avatar: 'AR', text: 'My betting ROI went up 23% in the first month. Signals arrive straight to Telegram.', result: '+23% ROI in 30 days', plan: 'Elite' },
  { name: 'María T.',     role: 'Investor · Valencia',    avatar: 'MT', text: 'Every morning I have my signals waiting. No complications, no hours staring at screens.', result: 'Saves 2h daily',       plan: 'Pro' },
  { name: 'Diego F.',     role: 'Day trader · Mexico City',avatar: 'DF', text: 'I tried the free plan and within 3 days understood why it\'s worth paying for.', result: 'Converted in 3 days',   plan: 'Pro' },
  { name: 'Lucía V.',     role: 'Analyst · Bogotá',       avatar: 'LV', text: 'The AI analysis saves me hours of research. I now spend that time executing trades, not hunting signals.', result: '-3h research/day', plan: 'Elite' },
  { name: 'Martín S.',    role: 'Sports trader · Lima',   avatar: 'MS', text: 'I used to lose 60% of my bets. With Xentory Bet I\'ve had 8 consecutive profitable weeks.', result: '8 winning weeks',      plan: 'Elite' },
];

// ── MINI DASHBOARD — datos reales de Binance ─────────────────────────
function MiniMockup() {
  const [price,        setPrice]        = useState<number | null>(null);
  const [change,       setChange]       = useState<number | null>(null);
  const [bars,         setBars]         = useState<number[]>([62, 78, 55, 85, 70, 92, 68]);
  const [rsi,          setRsi]          = useState<number | null>(null);
  const [rsiModal,     setRsiModal]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [ticker, klines] = await Promise.all([
          fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT').then(r => r.json()),
          fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=15').then(r => r.json()),
        ]);
        setPrice(parseFloat(ticker.lastPrice));
        setChange(parseFloat(ticker.priceChangePercent));
        const closes: number[] = klines.map((k: any[]) => parseFloat(k[4]));
        const last7 = closes.slice(-7);
        const lo = Math.min(...last7), hi = Math.max(...last7);
        const range = hi - lo || 1;
        setBars(last7.map(c => Math.round(((c - lo) / range) * 70 + 20)));
        if (closes.length >= 15) {
          const deltas = closes.slice(1).map((c, i) => c - closes[i]);
          const gains  = deltas.map(d => d > 0 ? d : 0);
          const losses = deltas.map(d => d < 0 ? -d : 0);
          const ag = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
          const al = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
          setRsi(Math.round(100 - 100 / (1 + (al === 0 ? 100 : ag / al))));
        }
      } catch { /* keep defaults */ }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const openModal = () => {
    setRsiModal(true);
    // doble rAF para que el DOM monte antes de disparar la transición
    requestAnimationFrame(() => requestAnimationFrame(() => setModalVisible(true)));
  };
  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setRsiModal(false), 360);
  };

  const up       = (change ?? 0) >= 0;
  const chColor  = up ? 'var(--green)' : 'var(--red)';
  const chBg     = up ? 'var(--green-dim)' : 'rgba(255,80,80,0.1)';
  const chBorder = up ? 'rgba(0,200,122,0.2)' : 'rgba(255,80,80,0.2)';

  const signal    = rsi === null ? 'BUY' : rsi < 40 ? 'BUY' : rsi > 60 ? 'SELL' : 'HOLD';
  const sigColor  = signal === 'BUY' ? 'var(--green)' : signal === 'SELL' ? 'var(--red)' : 'var(--gold)';
  const sigBg     = signal === 'BUY' ? 'rgba(0,200,122,0.1)' : signal === 'SELL' ? 'rgba(255,80,80,0.1)' : 'rgba(201,168,76,0.08)';
  const sigBorder = signal === 'BUY' ? 'rgba(0,200,122,0.2)' : signal === 'SELL' ? 'rgba(255,80,80,0.2)' : 'rgba(201,168,76,0.2)';
  const conf      = rsi === null ? '—' :
    signal === 'BUY'  ? `${Math.round((40 - rsi) / 40 * 45 + 55)}% conf.` :
    signal === 'SELL' ? `${Math.round((rsi - 60) / 40 * 45 + 55)}% conf.` : '65% conf.';
  const rsiColor  = rsi === null ? 'var(--gold)' : rsi < 30 ? 'var(--green)' : rsi > 70 ? 'var(--red)' : 'var(--gold)';
  const rsiLabel  = rsi === null ? '—' : rsi < 30 ? 'Sobreventa' : rsi > 70 ? 'Sobrecompra' : 'Zona neutral';

  return (
    <>
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid var(--border2)',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(20px)',
        padding: '1.2rem',
        width: '100%', maxWidth: 420,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '0.78rem', color: 'var(--text)' }}>BTC/USD</span>
            {change !== null && (
              <span style={{ fontSize: '0.65rem', color: chColor, background: chBg, padding: '0.1rem 0.4rem', borderRadius: 4, border: `1px solid ${chBorder}` }}>
                {up ? '+' : ''}{change.toFixed(2)}%
              </span>
            )}
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>
            {price !== null ? `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '…'}
          </span>
        </div>
        {/* 7-day chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 48, marginBottom: '1rem' }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, borderRadius: '2px 2px 0 0', height: `${h}%`, background: i === bars.length - 1 ? 'var(--gold)' : 'var(--card3)', transition: 'height 0.3s' }} />
          ))}
        </div>
        {/* Signal + RSI */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ flex: 1, padding: '0.5rem 0.7rem', borderRadius: 8, background: sigBg, border: `1px solid ${sigBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: sigColor, fontWeight: 600 }}>{signal}</span>
            <span style={{ fontSize: '0.7rem', color: sigColor }}>{conf}</span>
          </div>
          <div style={{ flex: 1, padding: '0.5rem 0.7rem', borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>RSI</span>
              <button
                onClick={openModal}
                style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--border2)', background: 'var(--card3)', color: 'var(--muted)', fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}
                aria-label="¿Qué es el RSI?"
              >?</button>
            </div>
            <span style={{ fontSize: '0.7rem', color: rsiColor, fontWeight: 600 }}>{rsi ?? '…'}</span>
          </div>
        </div>
      </div>

      {/* ── RSI MODAL — portal al body, no recortado por nada ── */}
      {rsiModal && createPortal(
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
            background: `rgba(4,6,15,${modalVisible ? '0.72' : '0'})`,
            backdropFilter: `blur(${modalVisible ? '14px' : '0px'})`,
            WebkitBackdropFilter: `blur(${modalVisible ? '14px' : '0px'})`,
            transition: 'background 0.35s ease, backdrop-filter 0.35s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340,
              borderRadius: 22,
              background: 'linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))',
              border: `1px solid ${rsiColor}40`,
              boxShadow: `0 0 60px ${rsiColor}22, 0 24px 60px rgba(0,0,0,0.6)`,
              padding: '2rem 1.8rem 1.6rem',
              transform: modalVisible ? 'scale(1) translateY(0)' : 'scale(0.55) translateY(40px)',
              opacity: modalVisible ? 1 : 0,
              transition: 'transform 0.38s cubic-bezier(0.34,1.4,0.64,1), opacity 0.3s ease',
            }}
          >
            {/* Close */}
            <button onClick={closeModal} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0.2rem 0.4rem' }}>✕</button>

            {/* Label */}
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.6rem', fontWeight: 600 }}>BTC/USD · RSI (14)</div>

            {/* Big RSI number */}
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '5rem', lineHeight: 1, color: rsiColor, letterSpacing: '-0.04em', marginBottom: '0.3rem', transition: 'color 0.3s' }}>
              {rsi ?? '—'}
            </div>
            <div style={{ fontSize: '0.78rem', color: rsiColor, fontWeight: 600, marginBottom: '1.6rem', opacity: 0.85 }}>{rsiLabel}</div>

            {/* Progress bar con zonas */}
            <div style={{ marginBottom: '1.6rem' }}>
              <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 8, marginBottom: '0.4rem' }}>
                <div style={{ width: '30%', background: 'rgba(0,200,122,0.35)' }} />
                <div style={{ width: '40%', background: 'rgba(201,168,76,0.35)' }} />
                <div style={{ width: '30%', background: 'rgba(255,80,80,0.35)' }} />
              </div>
              {/* Indicador de posición */}
              <div style={{ position: 'relative', height: 0 }}>
                <div style={{
                  position: 'absolute', top: -14,
                  left: `${Math.min(Math.max((rsi ?? 50), 2), 98)}%`,
                  transform: 'translateX(-50%)',
                  width: 3, height: 14,
                  background: rsiColor,
                  borderRadius: 2,
                  boxShadow: `0 0 6px ${rsiColor}`,
                  transition: 'left 0.5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.6rem', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--green)' }}>0 — Sobreventa</span>
                <span style={{ color: 'var(--gold)' }}>Neutral</span>
                <span style={{ color: 'var(--red)' }}>Sobrecompra — 100</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', marginBottom: '1.2rem' }} />

            {/* Explicación */}
            <p style={{ fontSize: '0.75rem', color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
              El <strong style={{ color: 'var(--text)' }}>RSI (Índice de Fuerza Relativa)</strong> mide la velocidad y magnitud de los movimientos del precio en una escala de 0 a 100.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.9rem' }}>
              {([
                ['var(--green)', '< 30', 'Sobreventa — el activo puede rebotar al alza'],
                ['var(--gold)',  '30–70','Zona neutral — sin señal clara'],
                ['var(--red)',   '> 70', 'Sobrecompra — el activo puede corregir a la baja'],
              ] as const).map(([color, range, desc]) => (
                <div key={range} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.72rem' }}>
                  <span style={{ color, fontWeight: 700, flexShrink: 0, minWidth: 28 }}>{range}</span>
                  <span style={{ color: 'var(--text2)' }}>{desc}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: '1.2rem', marginBottom: 0, textAlign: 'center' }}>
              Pulsa fuera para cerrar · Datos: Binance · RSI(14) diario
            </p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ── REUSABLE COMPONENTS ──────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.22rem 0.75rem', borderRadius: 100,
      background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)',
      color: 'var(--gold)', fontSize: '0.62rem', letterSpacing: '0.1em',
      textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: '1rem',
    }}>
      {label}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 0', textAlign: 'left', gap: '1rem' }}>
        <span style={{ fontWeight: 500, fontSize: 'clamp(0.84rem,2.5vw,0.93rem)', color: 'var(--text)', lineHeight: 1.5 }}>{q}</span>
        <IconChevron open={open} />
      </button>
      {open && <p style={{ paddingBottom: '1.1rem', color: 'var(--text2)', fontSize: '0.86rem', lineHeight: 1.8, margin: 0 }}>{a}</p>}
    </div>
  );
}

function TestimonialCard({ item }: { item: typeof TESTIMONIALS_EN[0] }) {
  return (
    <div className="glass" style={{ borderRadius: 16, padding: 'clamp(1.2rem,3vw,1.6rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '2px', color: 'var(--gold)' }}>
        {[0,1,2,3,4].map(i => <IconStar key={i} />)}
      </div>
      <p style={{ color: 'var(--text2)', fontSize: '0.87rem', lineHeight: 1.8, flex: 1, margin: 0 }}>
        "{item.text}"
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--gold),var(--green))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: '#04060f' }}>
            {item.avatar}
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.84rem' }}>{item.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{item.role}</div>
          </div>
        </div>
        <div style={{ padding: '0.18rem 0.65rem', borderRadius: 100, fontSize: '0.7rem', background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(0,200,122,0.2)', fontWeight: 600 }}>
          {item.result}
        </div>
      </div>
    </div>
  );
}

function ExitPopup({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-2" style={{ borderRadius: 24, padding: 'clamp(1.5rem,5vw,2.5rem)', maxWidth: 480, width: '100%', textAlign: 'center', border: '1px solid rgba(201,168,76,0.3)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1.2rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem' }}>✕</button>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.2rem,4vw,1.55rem)', marginBottom: '0.7rem', letterSpacing: '-0.02em' }}>
          {t('exit.title')}
        </h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.88rem' }}>
          {t('exit.sub')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <input className="input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ textAlign: 'center' }} />
          <button onClick={() => { if (email) { onClose(); navigate('/register'); } }} className="btn btn-gold btn-lg" style={{ justifyContent: 'center', width: '100%' }}>
            {t('exit.cta')}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', fontSize: '0.7rem', color: 'var(--muted)', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><IconCheck />{t('exit.trust1')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><IconCheck />{t('exit.trust2')}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem', textDecoration: 'underline' }}>
          {t('exit.dismiss')}
        </button>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────
export function HomePage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showExit, setShowExit] = useState(false);
  const exitFired = useRef(false);

  const TESTIMONIALS = lang === 'es' ? TESTIMONIALS_ES : TESTIMONIALS_EN;

  // Real accuracy stat from DB — falls back to 68% if DB has no data yet
  const { data: accData } = useAccuracyStats('both', 6);
  const accuracyPct = accData?.stats.accuracy_pct ?? 68;

  const STATS = [
    { value: '4.2s',                 label: t('home.stats.analysis'), color: 'var(--gold)'  },
    { value: '5+',                   label: t('home.stats.markets'),  color: 'var(--cyan)'  },
    { value: `${accuracyPct}%`,      label: t('home.stats.accuracy'), color: 'var(--green)' },
    { value: t('home.stats.freeVal'),label: t('home.stats.free'),     color: 'var(--text)'  },
  ];

  const HOW_STEPS = [
    { num: '01', icon: <IconAPI />,      title: t('home.how.s1t'), desc: t('home.how.s1d') },
    { num: '02', icon: <IconBrain />,    title: t('home.how.s2t'), desc: t('home.how.s2d') },
    { num: '03', icon: <IconTelegram />, title: t('home.how.s3t'), desc: t('home.how.s3d') },
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

  const MARKET_TAGS = ['Bitcoin', 'Ethereum', 'NVDA', 'EUR/USD', 'S&P 500', '+50'];
  const BET_TAGS    = ['Champions', 'La Liga', 'Premier', 'NBA', 'ATP/WTA', '+5'];

  // Scroll reveal
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    const observe = () => document.querySelectorAll<HTMLElement>('.reveal:not(.visible)').forEach(el => io.observe(el));
    observe();
    const tid = setTimeout(observe, 120);
    return () => { clearTimeout(tid); io.disconnect(); };
  }, []);

  // Exit intent
  useEffect(() => {
    if (user) return;
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 5 && !exitFired.current) { exitFired.current = true; setTimeout(() => setShowExit(true), 300); } };
    const onHide  = () => { if (document.hidden && !exitFired.current) { exitFired.current = true; setTimeout(() => setShowExit(true), 800); } };
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', onHide);
    return () => { document.removeEventListener('mouseleave', onLeave); document.removeEventListener('visibilitychange', onHide); };
  }, [user]);

  const MARKET_URL = (import.meta as any).env?.VITE_MARKET_URL ?? 'https://xentory-ecosystem-market.vercel.app';
  const BET_URL    = (import.meta as any).env?.VITE_BET_URL    ?? 'https://xentory-bet.vercel.app';

  return (
    <div>
      {showExit && <ExitPopup onClose={() => setShowExit(false)} />}
      <LiveTicker />

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: 'calc(var(--bar-h) + 3rem) clamp(1rem,5vw,2rem) 5rem',
        background: 'radial-gradient(ellipse 70% 50% at 20% 35%, rgba(201,168,76,0.055) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 25%, rgba(59,158,255,0.045) 0%, transparent 60%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle grid lines */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(var(--border2) 1px, transparent 1px), linear-gradient(90deg, var(--border2) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        {/* Beta badge */}
        <div className="animate-fadeUp" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.28rem 0.9rem', borderRadius: 100, border: '1px solid rgba(59,158,255,0.28)', background: 'var(--cyan-dim)', color: 'var(--cyan)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.8rem', fontWeight: 600 }}>
          <span className="live-dot" style={{ background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)' }} />
          {t('hero.badge')}
        </div>

        {/* Headline */}
        <h1 className="animate-fadeUp" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(2.2rem,6.5vw,4.8rem)', lineHeight: 1.05, letterSpacing: '-0.035em', maxWidth: 860, marginBottom: '1.2rem', animationDelay: '0.08s' }}>
          {t('hero.title1')}{' '}
          <span className="text-gradient-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>{t('hero.title2')}</span><br />
          {t('hero.title3')}
        </h1>

        {/* Sub */}
        <p className="animate-fadeUp" style={{ fontSize: 'clamp(0.95rem,2.2vw,1.1rem)', color: 'var(--text2)', maxWidth: 560, lineHeight: 1.8, marginBottom: '2.5rem', animationDelay: '0.16s' }}>
          {t('hero.sub')}
        </p>

        {/* CTAs */}
        <div className="animate-fadeUp" style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem', animationDelay: '0.24s' }}>
          <button onClick={() => { trackEvent('cta_click', { cta: 'hero_primary', destination: user ? 'dashboard' : 'register' }); navigate(user ? '/dashboard' : '/register'); }} className="btn btn-gold btn-xl" style={{ gap: '0.6rem' }}>
            {user ? t('hero.cta1.user') : t('hero.cta1')} <IconArrow />
          </button>
          <button onClick={() => { trackEvent('cta_click', { cta: 'hero_secondary' }); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }); }} className="btn btn-outline btn-xl">
            {t('hero.cta2')}
          </button>
        </div>

        {/* Trust pills */}
        <div className="animate-fadeUp" style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '4rem', animationDelay: '0.3s' }}>
          {[t('hero.trust1'), t('hero.trust2'), t('hero.trust3')].map((s, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: 'var(--muted)' }}>
              <IconCheck />{s}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="animate-fadeUp stats-grid-4" style={{ maxWidth: 680, width: '100%', animationDelay: '0.36s' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '0.8rem', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.4rem,3vw,2rem)', color: s.color, letterSpacing: '-0.04em', lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 'clamp(0.58rem,1.4vw,0.68rem)', color: 'var(--muted)', marginTop: '0.3rem', lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Hero mockup — appears on wider screens */}
        <div className="animate-fadeUp" style={{ marginTop: '3.5rem', animationDelay: '0.44s', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <MiniMockup />
        </div>
      </section>

      {/* ══ PROBLEM → SOLUTION ═══════════════════════════════════════ */}
      <section style={{ padding: 'clamp(4.5rem,9vw,7rem) clamp(1rem,5vw,2rem)', background: 'var(--bg2)' }}>
        <div className="section-container">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <SectionLabel label={t('home.problem.badge')} />
            <h2 style={{ fontSize: 'clamp(1.8rem,5vw,2.8rem)', maxWidth: 640, margin: '0 auto' }}>
              {lang === 'es' ? 'Los datos existen. Interpretarlos no debería costarte horas.' : 'The data exists. Interpreting it shouldn\'t cost you hours.'}
            </h2>
          </div>
          <div className="feature-grid-3">
            {[
              { label: t('home.problem.p1t'), title: t('prob.card1.title'), desc: t('home.problem.p1d'), accent: 'var(--red)',  top: 'var(--red)'  },
              { label: t('home.problem.sol'), title: t('prob.card2.title'), desc: t('home.problem.soldesc'), accent: 'var(--green)', top: 'var(--green)' },
              { label: t('home.problem.p3t'), title: t('prob.card3.title'), desc: t('home.problem.p3d'), accent: 'var(--gold)', top: 'var(--gold)' },
            ].map((c, i) => (
              <div key={i} className={`glass reveal reveal-scale d${i + 1}`} style={{ borderRadius: 18, padding: 'clamp(1.5rem,3vw,2rem)', borderTop: `2px solid ${c.top}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 0 0 80px', background: `${c.accent}06` }} />
                <div style={{ fontSize: '0.62rem', color: c.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.7rem', fontWeight: 600 }}>{c.label}</div>
                <h3 style={{ fontSize: 'clamp(0.95rem,2vw,1.05rem)', marginBottom: '0.7rem', fontFamily: 'Outfit, sans-serif' }}>{c.title}</h3>
                <p style={{ color: 'var(--text2)', fontSize: '0.86rem', lineHeight: 1.75, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PLATFORMS ════════════════════════════════════════════════ */}
      <section style={{ padding: 'clamp(4.5rem,9vw,7rem) clamp(1rem,5vw,2rem)' }}>
        <div className="section-container">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <SectionLabel label={t('platforms.badge')} />
            <h2 style={{ fontSize: 'clamp(1.8rem,5vw,2.8rem)', marginBottom: '1rem' }}>
              {t('platforms.title')} <span className="text-gradient-gold">{t('platforms.title2')}</span>
            </h2>
            <p style={{ color: 'var(--text2)', maxWidth: 500, margin: '0 auto', fontSize: '0.93rem', lineHeight: 1.75 }}>
              {t('platforms.sub')}
            </p>
          </div>

          <div className="feature-grid-2">
            {/* Market card */}
            <div className="glass platform-card reveal reveal-left d1" style={{ borderRadius: 22, padding: 'clamp(1.8rem,4vw,2.8rem)', borderLeft: '3px solid var(--gold)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(var(--gold-glow), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                </div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.15rem,2.5vw,1.45rem)' }}>
                  Xentory <span className="text-gradient-gold">{t('platforms.market.title').replace('Xentory ', '')}</span>
                </h3>
              </div>
              <p style={{ color: 'var(--text2)', fontSize: '0.87rem', lineHeight: 1.8, marginBottom: '1.4rem' }}>
                {t('platforms.market.desc')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.8rem' }}>
                {MARKET_TAGS.map(tag => (
                  <span key={tag} style={{ padding: '0.18rem 0.55rem', borderRadius: 100, fontSize: '0.68rem', background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)', fontWeight: 500 }}>{tag}</span>
                ))}
              </div>
              <a href={user ? MARKET_URL : undefined} onClick={!user ? () => { trackEvent('cta_click', { cta: 'platform_market', destination: 'register' }); navigate('/register'); } : () => trackEvent('cta_click', { cta: 'platform_market', destination: 'market_app' })} className="btn btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                {user ? t('platforms.market.cta.user') : t('platforms.market.cta')}
              </a>
            </div>

            {/* Bet card */}
            <div className="glass platform-card reveal reveal-right d2" style={{ borderRadius: 22, padding: 'clamp(1.8rem,4vw,2.8rem)', borderLeft: '3px solid var(--cyan)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(rgba(59,158,255,0.15), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--cyan-dim)', border: '1px solid rgba(59,158,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                </div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.15rem,2.5vw,1.45rem)' }}>
                  Xentory <span className="text-gradient-cyan">{t('platforms.bet.title').replace('Xentory ', '')}</span>
                </h3>
              </div>
              <p style={{ color: 'var(--text2)', fontSize: '0.87rem', lineHeight: 1.8, marginBottom: '1.4rem' }}>
                {t('platforms.bet.desc')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.8rem' }}>
                {BET_TAGS.map(tag => (
                  <span key={tag} style={{ padding: '0.18rem 0.55rem', borderRadius: 100, fontSize: '0.68rem', background: 'var(--cyan-dim)', color: 'var(--cyan)', border: '1px solid rgba(59,158,255,0.2)', fontWeight: 500 }}>{tag}</span>
                ))}
              </div>
              <a href={user ? BET_URL : undefined} onClick={!user ? () => { trackEvent('cta_click', { cta: 'platform_bet', destination: 'register' }); navigate('/register'); } : () => trackEvent('cta_click', { cta: 'platform_bet', destination: 'bet_app' })} className="btn btn-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                {user ? t('platforms.bet.cta.user') : t('platforms.bet.cta')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═════════════════════════════════════════════ */}
      <section id="how" style={{ padding: 'clamp(4.5rem,9vw,7rem) clamp(1rem,5vw,2rem)', background: 'var(--bg2)' }}>
        <div className="section-container">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <SectionLabel label={t('how.badge')} />
            <h2 style={{ fontSize: 'clamp(1.8rem,5vw,2.8rem)' }}>{t('how.title')}</h2>
          </div>
          <div className="how-grid">
            {HOW_STEPS.map((s, i) => (
              <div key={i} className={`glass reveal reveal-up d${i + 1}`} style={{ borderRadius: 18, padding: 'clamp(1.5rem,3vw,2rem)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '1.4rem', right: '1.4rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '2.8rem', color: 'var(--border2)', lineHeight: 1, userSelect: 'none' }}>{s.num}</div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', marginBottom: '1.1rem' }}>
                  {s.icon}
                </div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', marginBottom: '0.65rem' }}>{s.title}</h3>
                <p style={{ color: 'var(--text2)', fontSize: '0.86rem', lineHeight: 1.75, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/metodologia" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gold)', textDecoration: 'none', fontSize: '0.86rem', fontWeight: 500 }}>
              {t('how.link')} <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ═════════════════════════════════════════════ */}
      <section style={{ padding: 'clamp(4.5rem,9vw,7rem) clamp(1rem,5vw,2rem)' }}>
        <div className="section-container">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <SectionLabel label={t('test.badge')} />
            <h2 style={{ fontSize: 'clamp(1.8rem,5vw,2.8rem)', marginBottom: '0.8rem' }}>{t('test.title')}</h2>
            {/* Aggregate rating row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '2px', color: 'var(--gold)' }}>
                {[0,1,2,3,4].map(i => <IconStar key={i} />)}
              </div>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gold)' }}>4.8</span>
              <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>/5</span>
              <span style={{ width: 1, height: 14, background: 'var(--border2)' }} />
              <span style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>
                {lang === 'es' ? '500+ usuarios activos' : '500+ active users'}
              </span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{t('test.disclaimer')}</p>
          </div>
          <div className="testimonial-grid">
            {TESTIMONIALS.map((item, i) => (
              <div key={i} className={`reveal reveal-scale d${(i % 4) + 1}`}>
                <TestimonialCard item={item} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RESULTS IN NUMBERS ═══════════════════════════════════════ */}
      <section style={{ padding: 'clamp(3.5rem,8vw,6rem) clamp(1rem,5vw,2rem)', background: 'var(--bg2)' }}>
        <div className="section-container">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 'clamp(2rem,4vw,3rem)' }}>
            <SectionLabel label={lang === 'es' ? 'Resultados reales' : 'Real results'} />
            <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', marginBottom: '0.5rem' }}>
              {lang === 'es' ? 'Lo que consiguen nuestros usuarios' : 'What our users achieve'}
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '0.88rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              {lang === 'es'
                ? 'Datos agregados basados en el historial de señales y feedback de usuarios activos.'
                : 'Aggregated data based on signal history and active user feedback.'}
            </p>
          </div>
          <div className="stats-grid-4 reveal reveal-up d1">
            {[
              { value: '+18%', label: lang === 'es' ? 'ROI medio · plan Pro (90 días)' : 'Avg ROI · Pro plan (90 days)',    color: 'var(--green)', icon: '📈' },
              { value: '+31%', label: lang === 'es' ? 'ROI medio · plan Elite (90 días)' : 'Avg ROI · Elite plan (90 days)', color: 'var(--gold)',  icon: '🏆' },
              { value: '71%',  label: lang === 'es' ? 'Precisión histórica verificada' : 'Verified historical accuracy',     color: 'var(--cyan)',  icon: '🎯' },
              { value: '2h',   label: lang === 'es' ? 'Tiempo ahorrado al día por usuario' : 'Time saved per day per user',   color: 'var(--text)',  icon: '⏱️' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: 'clamp(1.2rem,3vw,1.8rem)', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color, opacity: 0.6 }} />
                <div style={{ fontSize: '1.6rem', marginBottom: '0.3rem', lineHeight: 1 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem,4vw,2.2rem)', color: s.color, letterSpacing: '-0.04em', lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.4rem', lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <p className="reveal" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.68rem', marginTop: '1rem', opacity: 0.7 }}>
            {lang === 'es'
              ? '* Resultados basados en historial agregado. El rendimiento pasado no garantiza resultados futuros.'
              : '* Results based on aggregated history. Past performance does not guarantee future results.'}
          </p>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════════════ */}
      <section style={{ padding: 'clamp(4.5rem,9vw,7rem) clamp(1rem,5vw,2rem)' }}>
        <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 clamp(0rem,2vw,1rem)' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,3.5rem)' }}>
            <SectionLabel label={t('faq.badge')} />
            <h2 style={{ fontSize: 'clamp(1.8rem,5vw,2.8rem)' }}>{t('faq.title')}</h2>
          </div>
          <div className="glass reveal reveal-up d1 slow" style={{ borderRadius: 20, padding: 'clamp(1.2rem,3vw,2rem)' }}>
            {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ════════════════════════════════════════════════ */}
      <section style={{ padding: 'clamp(5rem,10vw,8rem) clamp(1rem,5vw,2rem)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(201,168,76,0.045) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 580, margin: '0 auto', position: 'relative' }}>
          <div className="reveal"><SectionLabel label={lang === 'es' ? 'Empieza hoy' : 'Get started'} /></div>
          <h2 className="reveal d1" style={{ fontSize: 'clamp(1.8rem,5vw,3rem)', marginBottom: '1.1rem' }}>
            {t('cta.title')}
          </h2>
          <p className="reveal d2" style={{ color: 'var(--text2)', fontSize: 'clamp(0.9rem,2vw,1rem)', lineHeight: 1.8, marginBottom: '2.2rem' }}>
            {t('cta.sub')}
          </p>
          <div className="reveal d3" style={{ display: 'flex', gap: '0.7rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.8rem' }}>
            <button onClick={() => { trackEvent('cta_click', { cta: 'final_primary', destination: user ? 'dashboard' : 'register' }); navigate(user ? '/dashboard' : '/register'); }} className="btn btn-gold btn-xl" style={{ gap: '0.6rem' }}>
              {user ? t('hero.cta1.user') : t('cta.btn1')} <IconArrow />
            </button>
            <button onClick={() => { trackEvent('cta_click', { cta: 'final_pricing' }); navigate('/pricing'); }} className="btn btn-outline btn-xl">
              {t('cta.btn2')}
            </button>
          </div>
          <div className="reveal d4" style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(0.8rem,2vw,2rem)', flexWrap: 'wrap' }}>
            {[
              { icon: <IconShield />, text: t('cta.trust1') },
              { icon: <IconCheck />,  text: t('cta.trust2') },
              { icon: <IconCheck />,  text: t('cta.trust3') },
            ].map((s, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--green)' }}>{s.icon}</span>{s.text}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
