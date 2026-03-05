import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MARKET_URL = (import.meta as any).env?.VITE_MARKET_URL ?? 'http://localhost:3000';
const BET_URL    = (import.meta as any).env?.VITE_BETS_URL   ?? 'http://localhost:3001';

const STEPS = [
  {
    number: 1,
    emoji: '🎯',
    title: '¿Qué quieres analizar?',
    subtitle: 'Elige tu área de interés para personalizar tu experiencia',
    options: [
      { id: 'market',  emoji: '📈', label: 'Mercados financieros', desc: 'Cripto, acciones, forex' },
      { id: 'sports',  emoji: '⚽', label: 'Predicciones deportivas', desc: 'Fútbol, NBA, tenis...' },
      { id: 'both',    emoji: '🌐', label: 'Ambas cosas',           desc: 'El ecosistema completo' },
    ],
  },
  {
    number: 2,
    emoji: '🧠',
    title: 'Genera tu primer análisis',
    subtitle: 'El motor de IA está listo. Prueba con cualquier activo o partido.',
    options: [
      { id: 'btc',       emoji: '₿',  label: 'Analizar Bitcoin',         desc: 'Ver señales de mercado' },
      { id: 'match',     emoji: '🏆', label: 'Predecir Champions League', desc: 'Próximos partidos' },
      { id: 'portfolio', emoji: '💼', label: 'Analizar EUR/USD',           desc: 'Mercado Forex' },
    ],
  },
  {
    number: 3,
    emoji: '📲',
    title: 'Conecta tu Telegram',
    subtitle: 'Recibe las mejores señales directamente en tu móvil (disponible en plan Pro)',
    options: [
      { id: 'telegram', emoji: '✈️',  label: 'Conectar Telegram',   desc: 'Ir al canal ahora' },
      { id: 'later',    emoji: '⏭️', label: 'Lo haré más tarde',   desc: 'Seguir explorando' },
      { id: 'upgrade',  emoji: '💎', label: 'Ver plan Pro',         desc: 'Desbloquear señales' },
    ],
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingProps) {
  const [step, setStep]       = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [selections, setSelections] = useState<string[]>([]);
  const navigate = useNavigate();

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleSelect = (id: string) => {
    setSelected(id);
  };

  const handleNext = () => {
    if (!selected) return;
    const newSelections = [...selections, selected];
    setSelections(newSelections);

    // Handle actions on last step
    if (isLast) {
      if (selected === 'telegram') {
        onComplete();
        navigate('/telegram');
      } else if (selected === 'upgrade') {
        onComplete();
        navigate('/pricing');
      } else {
        // Redirect based on first selection
        onComplete();
        const first = newSelections[0];
        if (first === 'market') window.location.href = MARKET_URL;
        else if (first === 'sports') window.location.href = BET_URL;
        else navigate('/dashboard');
      }
      return;
    }

    setStep(s => s + 1);
    setSelected(null);
  };

  const handleSkip = () => {
    onComplete();
    navigate('/dashboard');
  };

  return (
    <div className="onboarding-overlay">
      <div style={{
        background: 'var(--bg2)', borderRadius: 24,
        border: '1px solid var(--border2)',
        padding: 'clamp(1.5rem, 5vw, 2.5rem)',
        maxWidth: 520, width: '100%',
        position: 'relative',
        animation: 'fadeUp 0.4s ease',
      }}>
        {/* Progress bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Paso {step + 1} de {STEPS.length}
            </span>
            <button onClick={handleSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.78rem', textDecoration: 'underline' }}>
              Saltar
            </button>
          </div>
          <div style={{ height: 4, borderRadius: 100, background: 'var(--card2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 100, background: 'linear-gradient(90deg, var(--gold), var(--gold-l))', width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Step indicator dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 8, height: 8, borderRadius: 100, background: i === step ? 'var(--gold)' : i < step ? 'var(--green)' : 'var(--border2)', transition: 'all 0.3s ease' }} />
          ))}
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>{currentStep.emoji}</div>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {currentStep.title}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>{currentStep.subtitle}</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
          {currentStep.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.2rem', borderRadius: 12, cursor: 'pointer',
                border: selected === opt.id ? '1px solid var(--gold)' : '1px solid var(--border)',
                background: selected === opt.id ? 'var(--gold-dim)' : 'var(--card2)',
                textAlign: 'left', width: '100%',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{opt.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: selected === opt.id ? 'var(--gold)' : 'var(--text)', marginBottom: '0.15rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{opt.desc}</div>
              </div>
              {selected === opt.id && (
                <span style={{ color: 'var(--gold)', fontWeight: 700, flexShrink: 0 }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={!selected}
          className="btn btn-gold"
          style={{ width: '100%', justifyContent: 'center', opacity: selected ? 1 : 0.4, cursor: selected ? 'pointer' : 'not-allowed', fontSize: '0.95rem', padding: '0.85rem' }}
        >
          {isLast ? 'Empezar →' : 'Continuar →'}
        </button>
      </div>
    </div>
  );
}
