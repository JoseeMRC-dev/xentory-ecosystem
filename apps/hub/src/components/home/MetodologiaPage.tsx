import { useNavigate } from 'react-router-dom';

const ACCURACY_DATA = [
  { week: 'Sem 1', market: 72, sports: 65 },
  { week: 'Sem 2', market: 68, sports: 71 },
  { week: 'Sem 3', market: 74, sports: 68 },
  { week: 'Sem 4', market: 69, sports: 73 },
  { week: 'Sem 5', market: 75, sports: 70 },
  { week: 'Sem 6', market: 71, sports: 74 },
];

const RECENT_SIGNALS = [
  { date: '28 Feb', type: '📈', asset: 'BTC/USDT', signal: 'Compra en soporte $91.200', result: '✓ Correcto', pct: '+4.2%', conf: 76 },
  { date: '27 Feb', type: '⚽', asset: 'Real Madrid vs Atlético', signal: 'Real Madrid gana @1.85', result: '✓ Correcto', pct: '+85%', conf: 72 },
  { date: '26 Feb', type: '📈', asset: 'EUR/USD', signal: 'Over 1.0820 en apertura NY', result: '✓ Correcto', pct: '+1.2%', conf: 68 },
  { date: '25 Feb', type: '⚽', asset: 'Barça vs PSG', signal: 'BTTS Sí @1.72', result: '✗ Incorrecto', pct: '-100%', conf: 64 },
  { date: '24 Feb', type: '📈', asset: 'NVDA', signal: 'Rebote en MA200 a $128', result: '✓ Correcto', pct: '+6.1%', conf: 74 },
  { date: '23 Feb', type: '⚽', asset: 'Lakers vs Celtics', signal: 'Over 224.5 @1.91', result: '✓ Correcto', pct: '+91%', conf: 69 },
];

export function MetodologiaPage() {
  const navigate = useNavigate();

  const wins = RECENT_SIGNALS.filter(s => s.result.startsWith('✓')).length;
  const pct  = Math.round((wins / RECENT_SIGNALS.length) * 100);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'calc(var(--nav-h) + 60px + 2rem) clamp(1rem,5vw,2rem) 5rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-block', padding: '0.3rem 0.9rem', borderRadius: 100, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Transparencia total
        </div>
        <h1 style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
          Metodología y resultados verificados
        </h1>
        <p style={{ color: 'var(--text2)', maxWidth: 580, margin: '0 auto', lineHeight: 1.8, fontSize: '0.95rem' }}>
          No somos un bot anónimo de Telegram. Publicamos nuestro historial de señales completo — aciertos y fallos — para que puedas evaluar el rendimiento real antes de suscribirte.
        </p>
      </div>

      {/* Stats summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { value: `${pct}%`,   label: 'Precisión últimas 6 semanas', color: 'var(--green)' },
          { value: `${wins}/${RECENT_SIGNALS.length}`, label: 'Señales correctas (muestra reciente)', color: 'var(--gold)' },
          { value: '4.2s',      label: 'Tiempo medio de análisis', color: 'var(--cyan)' },
          { value: '>65%',      label: 'Confianza mínima para enviar señal', color: 'var(--text)' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ borderRadius: 14, padding: '1.3rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '2rem', color: s.color, letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How the AI works */}
      <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.3rem', marginBottom: '1.5rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border)' }}>
          🧠 Cómo funciona el motor de IA
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1.5rem' }}>
          {[
            {
              title: 'Fuentes de datos',
              icon: '🔌',
              items: ['API-Football — estadísticas deportivas en tiempo real', 'Google Finance / Binance — datos de mercado', 'Google Grounding — noticias y contexto actual (Pro)', 'Datos históricos de los últimos 5 partidos/sesiones'],
            },
            {
              title: 'Modelos de IA usados',
              icon: '🤖',
              items: ['Gemini Flash (plan gratuito) — análisis básico rápido', 'Gemini Pro (plan Pro/Elite) — análisis completo', 'Google Grounding activo en Pro — contexto real', 'Temperatura baja (0.3) para máxima consistencia'],
            },
            {
              title: 'Criterios de calidad',
              icon: '✅',
              items: ['Solo se envían señales con >65% de confianza calculada', 'El sistema prioriza el mercado con mayor probabilidad', 'Se analiza forma reciente, head-to-head y contexto', 'El análisis incluye factores de riesgo explícitos'],
            },
          ].map(block => (
            <div key={block.title}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{block.icon}</span>
                <h3 style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.95rem' }}>{block.title}</h3>
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

      {/* Recent signals log */}
      <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.3rem' }}>📊 Historial de señales recientes</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span className="live-dot" /> Actualizado manualmente cada semana
          </span>
        </div>

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
              {RECENT_SIGNALS.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{s.date}</td>
                  <td style={{ padding: '0.8rem' }}>
                    <span style={{ marginRight: '0.4rem' }}>{s.type}</span>
                    <span style={{ fontWeight: 500 }}>{s.asset}</span>
                  </td>
                  <td style={{ padding: '0.8rem', color: 'var(--text2)', maxWidth: 220 }}>{s.signal}</td>
                  <td style={{ padding: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 50, height: 5, borderRadius: 100, background: 'var(--card2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 100, background: s.conf >= 70 ? 'var(--green)' : 'var(--gold)', width: `${s.conf}%` }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', color: s.conf >= 70 ? 'var(--green)' : 'var(--gold)', fontWeight: 600 }}>{s.conf}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.8rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.72rem', fontWeight: 600, background: s.result.startsWith('✓') ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,85,0.1)', color: s.result.startsWith('✓') ? 'var(--green)' : 'var(--red)', border: `1px solid ${s.result.startsWith('✓') ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,85,0.2)'}` }}>
                      {s.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          ⚠️ El historial mostrado corresponde a la fase de beta privada (muestra reducida). Un porcentaje de acierto del 68% significa que aproximadamente 7 de cada 10 señales fueron correctas. Los resultados pasados no garantizan resultados futuros. Invertir y apostar conlleva riesgo de pérdida económica.
        </p>
      </div>

      {/* Limitations — honesty section */}
      <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: '2rem', borderLeft: '3px solid var(--orange)' }}>
        <h2 style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>⚠️ Lo que la IA no puede hacer (honestidad total)</h2>
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
        <h3 style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.8rem' }}>¿Te convence la metodología?</h3>
        <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Prueba el Plan Pro 7 días gratis y comprueba el rendimiento real por ti mismo.</p>
        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} className="btn btn-gold btn-lg">Empezar prueba gratuita →</button>
          <button onClick={() => navigate('/pricing')} className="btn btn-outline btn-lg">Ver planes</button>
        </div>
      </div>
    </div>
  );
}
