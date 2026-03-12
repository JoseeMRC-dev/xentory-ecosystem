import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSignals, formatUnlockTime } from '../../hooks/useSignals';
import type { Signal } from '../../hooks/useSignals';

const ACCURACY_DATA = [
  { week: 'Sem 1', market: 72, sports: 65 },
  { week: 'Sem 2', market: 68, sports: 71 },
  { week: 'Sem 3', market: 74, sports: 68 },
  { week: 'Sem 4', market: 69, sports: 73 },
  { week: 'Sem 5', market: 75, sports: 70 },
  { week: 'Sem 6', market: 71, sports: 74 },
];

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 75 ? 'var(--green)' : value >= 65 ? 'var(--gold)' : 'var(--orange)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ width: 50, height: 5, borderRadius: 100, background: 'var(--card2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 100, background: color, width: `${value}%`, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '0.78rem', color, fontWeight: 600 }}>{value}%</span>
    </div>
  );
}

function ResultBadge({ result }: { result: Signal['result'] }) {
  if (!result) return <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Pendiente</span>;
  const map = {
    win:     { label: '✓ Correcto',   bg: 'rgba(0,255,136,0.1)',  color: 'var(--green)', border: 'rgba(0,255,136,0.2)' },
    loss:    { label: '✗ Incorrecto', bg: 'rgba(255,68,85,0.1)',  color: 'var(--red)',   border: 'rgba(255,68,85,0.2)' },
    neutral: { label: '— Neutral',    bg: 'rgba(160,168,200,0.1)',color: 'var(--muted)', border: 'rgba(160,168,200,0.2)' },
  };
  const s = map[result];
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.72rem', fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function LockedRow({ signal, plan }: { signal: Signal; plan: string | null }) {
  const planLabel = plan === 'pro' ? 'Elite' : plan === 'free' ? 'Pro' : 'Registrarse';
  return (
    <tr style={{ borderBottom: '1px solid var(--border)', opacity: 0.6 }}>
      <td style={{ padding: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
        {new Date(signal.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
      </td>
      <td style={{ padding: '0.8rem' }}>
        <span style={{ marginRight: '0.4rem' }}>{signal.asset_icon}</span>
        <span style={{ fontWeight: 500, filter: 'blur(4px)', userSelect: 'none' }}>████████</span>
      </td>
      <td style={{ padding: '0.8rem' }}>
        <span style={{ filter: 'blur(4px)', userSelect: 'none', color: 'var(--text2)' }}>████████████</span>
      </td>
      <td style={{ padding: '0.8rem' }}>
        <span style={{ filter: 'blur(3px)' }}>██%</span>
      </td>
      <td style={{ padding: '0.8rem' }}>
        <span style={{
          padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.68rem', fontWeight: 600,
          background: 'var(--card2)', color: 'var(--gold)', border: '1px solid var(--border)',
          whiteSpace: 'nowrap', cursor: 'pointer',
        }}>
          🔒 {signal.unlocks_at ? formatUnlockTime(signal.unlocks_at) : `Requiere ${planLabel}`}
        </span>
      </td>
    </tr>
  );
}

export function MetodologiaPage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const plan        = user?.subscriptions?.market ?? user?.subscriptions?.bets ?? null;
  const { signals, loading, error } = useSignals(user ? plan : null);

  const visibleSignals = signals.filter(s => s.visible);
  const wins = visibleSignals.filter(s => s.result === 'win').length;
  const total = visibleSignals.filter(s => s.result !== null).length;
  const pct  = total > 0 ? Math.round((wins / total) * 100) : 68;

  // Plan label for upgrade prompt
  const planUpgradeLabel =
    !user           ? 'Crear cuenta' :
    plan === 'free' ? 'Mejorar a Pro' :
    plan === 'pro'  ? 'Mejorar a Elite' : null;

  const planDelayLabel =
    !user           ? '48h de retraso' :
    plan === 'free' ? '24h de retraso' :
    plan === 'pro'  ? '6h de retraso (o al terminar el partido)' :
    'Tiempo real ✓';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'calc(var(--bar-h) + 2.5rem) clamp(1rem,5vw,2rem) 5rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-block', padding: '0.3rem 0.9rem', borderRadius: 100, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Transparencia total
        </div>
        <h1 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
          Metodología y resultados verificados
        </h1>
        <p style={{ color: 'var(--text2)', maxWidth: 580, margin: '0 auto', lineHeight: 1.8, fontSize: '0.95rem' }}>
          No somos un bot anónimo de Telegram. Publicamos nuestro historial de señales completo — aciertos y fallos — para que puedas evaluar el rendimiento real antes de suscribirte.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { value: `${pct}%`,         label: 'Precisión últimas 6 semanas',         color: 'var(--green)' },
          { value: `${wins}/${total}`, label: 'Señales correctas (muestra visible)', color: 'var(--gold)' },
          { value: '4.2s',             label: 'Tiempo medio de análisis',             color: 'var(--cyan)' },
          { value: '>65%',             label: 'Confianza mínima para enviar señal',  color: 'var(--text)' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ borderRadius: 14, padding: '1.3rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '2rem', color: s.color, letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How AI works */}
      <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.3rem', marginBottom: '1.5rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border)' }}>
          🧠 Cómo funciona el motor de IA
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1.5rem' }}>
          {[
            {
              title: 'Fuentes de datos', icon: '🔌',
              items: ['API-Football — estadísticas deportivas en tiempo real', 'Google Finance / Binance — datos de mercado', 'Google Grounding — noticias y contexto actual (Pro)', 'Datos históricos de los últimos 5 partidos/sesiones'],
            },
            {
              title: 'Modelos de IA usados', icon: '🤖',
              items: ['Gemini Flash (plan gratuito) — análisis básico rápido', 'Gemini Pro (plan Pro/Elite) — análisis completo', 'Google Grounding activo en Pro — contexto real', 'Temperatura baja (0.3) para máxima consistencia'],
            },
            {
              title: 'Criterios de calidad', icon: '✅',
              items: ['Solo se envían señales con >65% de confianza calculada', 'El sistema prioriza el mercado con mayor probabilidad', 'Se analiza forma reciente, head-to-head y contexto', 'El análisis incluye factores de riesgo explícitos'],
            },
          ].map(block => (
            <div key={block.title}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{block.icon}</span>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.95rem' }}>{block.title}</h3>
              </div>
              {block.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--gold)', flexShrink: 0 }}>·</span>
                  <span style={{ color: 'var(--text2)', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── LIVE SIGNALS HISTORY ── */}
      <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.3rem' }}>📊 Historial de señales</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            {/* Live indicator */}
            <span style={{ fontSize: '0.72rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', boxShadow: '0 0 6px var(--green)', animation: 'pulse 2s infinite' }} />
              En tiempo real
            </span>
            {/* User plan delay indicator */}
            <span style={{
              fontSize: '0.68rem', padding: '0.2rem 0.6rem', borderRadius: 100,
              background: plan === 'elite' ? 'rgba(0,255,136,0.1)' : 'var(--card2)',
              color: plan === 'elite' ? 'var(--green)' : 'var(--muted)',
              border: '1px solid var(--border)',
            }}>
              {planDelayLabel}
            </span>
          </div>
        </div>

        {/* Upgrade banner for non-elite */}
        {planUpgradeLabel && (
          <div
            onClick={() => navigate(user ? '/pricing' : '/register')}
            style={{
              marginBottom: '1rem', padding: '0.8rem 1rem',
              background: 'linear-gradient(135deg,rgba(201,168,76,0.08),rgba(0,212,255,0.05))',
              border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)')}
          >
            <span style={{ fontSize: '0.82rem', color: 'var(--text2)' }}>
              🔒 Las señales bloqueadas se muestran con retraso según tu plan.
              <span style={{ color: 'var(--gold)', marginLeft: '0.3rem' }}>Señales en tiempo real con Elite.</span>
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {planUpgradeLabel} →
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.8rem' }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', opacity: 0.5, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
              ))}
            </div>
            Cargando señales...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--red)', fontSize: '0.85rem' }}>
            ⚠️ Error cargando señales. Inténtalo de nuevo.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['Fecha', 'Activo / Partido', 'Señal', 'Confianza', 'Resultado'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signals.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      No hay señales disponibles aún
                    </td>
                  </tr>
                ) : signals.map(s =>
                  s.locked ? (
                    <LockedRow key={s.id} signal={s} plan={plan} />
                  ) : (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(s.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ padding: '0.8rem' }}>
                        <span style={{ marginRight: '0.4rem' }}>{s.asset_icon}</span>
                        <span style={{ fontWeight: 500 }}>{s.asset}</span>
                      </td>
                      <td style={{ padding: '0.8rem', color: 'var(--text2)', maxWidth: 220 }}>{s.signal}</td>
                      <td style={{ padding: '0.8rem' }}><ConfidenceBar value={s.confidence} /></td>
                      <td style={{ padding: '0.8rem' }}><ResultBadge result={s.result} /></td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          ⚠️ Los resultados pasados no garantizan resultados futuros. Invertir y apostar conlleva riesgo de pérdida económica.
          {!user && <span> — <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => navigate('/register')}>Regístrate gratis</span> para ver más señales.</span>}
        </p>
      </div>

      {/* Limitations */}
      <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: '2rem', borderLeft: '3px solid var(--orange)' }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>⚠️ Lo que la IA no puede hacer (honestidad total)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.6rem' }}>
          {[
            'No predice eventos imprevisibles (lesiones de última hora, decisiones arbitrales)',
            'No garantiza un porcentaje de acierto constante — varía semana a semana',
            'No reemplaza tu criterio propio — es una herramienta de apoyo, no un oráculo',
            'No tiene en cuenta tu situación financiera personal ni tu tolerancia al riesgo',
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--orange)', flexShrink: 0, fontWeight: 700 }}>!</span>
              <span style={{ color: 'var(--text2)', lineHeight: 1.6 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.8rem' }}>¿Te convence la metodología?</h3>
        <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Prueba el Plan Pro 7 días gratis y comprueba el rendimiento real por ti mismo.</p>
        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} className="btn btn-gold btn-lg">Empezar prueba gratuita →</button>
          <button onClick={() => navigate('/pricing')} className="btn btn-outline btn-lg">Ver planes</button>
        </div>
      </div>
    </div>
  );
}
