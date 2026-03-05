import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// ── TELEGRAM PAGE ──
export function TelegramPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPaid = user?.plan !== 'free';

  const MOCK_SIGNALS = [
    { sport: '⚽', match: 'Real Madrid vs Barcelona', pick: 'Over 2.5 goles', confidence: 74, odds: 1.72, channel: 'PRO', time: 'hace 2h' },
    { sport: '🏀', match: 'Lakers vs Celtics', pick: 'Lakers gana', confidence: 68, odds: 1.91, channel: 'PRO', time: 'hace 4h' },
    { sport: '🎾', match: 'Alcaraz vs Djokovic', pick: 'Alcaraz gana', confidence: 71, odds: 1.65, channel: 'ELITE', time: 'hace 6h' },
    { sport: '⚽', match: 'Man City vs Arsenal', pick: 'BTTS Sí', confidence: 69, odds: 1.80, channel: 'PRO', time: 'ayer' },
  ];

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>✈️ Canal Telegram</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Señales automáticas directamente en tu Telegram cuando se genera un análisis de alta confianza.</p>
      </div>

      {/* Status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Plan activo', value: user?.plan === 'free' ? 'Fanático (Gratis)' : user?.plan === 'pro' ? 'Pro' : 'Elite', color: user?.plan === 'free' ? 'var(--muted)' : 'var(--gold)' },
          { label: 'Canal asignado', value: isPaid ? (user?.plan === 'elite' ? 'Xentory Bet ELITE' : 'Xentory Bet PRO') : 'No incluido', color: isPaid ? 'var(--cyan)' : 'var(--muted)' },
          { label: 'Estado', value: isPaid ? (user?.telegramLinked ? '● Vinculado' : '● Pendiente') : '● Inactivo', color: isPaid && user?.telegramLinked ? 'var(--green)' : 'var(--muted)' },
        ].map(item => (
          <div key={item.label} className="glass" style={{ borderRadius: 14, padding: '1.2rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{item.label}</div>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {!isPaid ? (
        /* Upgrade wall */
        <div className="glass" style={{ borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✈️</div>
          <h2 style={{ marginBottom: '0.8rem' }}>Canal Telegram disponible en Plan Pro</h2>
          <p style={{ color: 'var(--muted)', maxWidth: 400, margin: '0 auto 2rem', lineHeight: 1.7, fontSize: '0.9rem' }}>
            Recibe señales automáticas cada vez que la IA detecte una predicción con más del 65% de confianza.
          </p>
          <button onClick={() => navigate('/plans')} className="btn btn-gold btn-lg">Ver planes →</button>

          {/* Blurred preview */}
          <div style={{ marginTop: '2rem', position: 'relative' }}>
            <div style={{ filter: 'blur(6px)', pointerEvents: 'none', opacity: 0.5 }}>
              {MOCK_SIGNALS.slice(0, 2).map((s, i) => (
                <div key={i} style={{ padding: '1rem', background: 'var(--card2)', borderRadius: 10, marginBottom: '0.5rem', textAlign: 'left', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.3rem' }}>{s.sport}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{s.match}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{s.pick} · @{s.odds}</div>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#00ff88' }}>{s.confidence}%</div>
                </div>
              ))}
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,8,16,0.4)', borderRadius: 10, backdropFilter: 'blur(1px)' }}>
              <span style={{ padding: '0.5rem 1.2rem', background: 'var(--card2)', borderRadius: 100, fontSize: '0.82rem', border: '1px solid var(--border)' }}>🔒 Señales bloqueadas</span>
            </div>
          </div>
        </div>
      ) : (
        /* Setup guide + signals */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Setup */}
          <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>🔧 Configuración del canal</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {[
                { step: '01', title: 'Busca el bot en Telegram', desc: 'Abre Telegram y busca @Xentory BetBot', done: false },
                { step: '02', title: 'Inicia el bot', desc: 'Escribe /start para activar el bot', done: false },
                { step: '03', title: 'Vincula tu cuenta', desc: 'Usa el comando /link y tu email de Xentory Bet', done: false },
                { step: '04', title: 'Acceso al canal', desc: 'El bot te añadirá automáticamente al canal según tu plan', done: false },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.9rem', background: 'var(--card2)', borderRadius: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: item.done ? 'var(--green-dim)' : 'var(--card)', border: `1px solid ${item.done ? 'rgba(0,255,136,0.2)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.75rem', color: item.done ? 'var(--green)' : 'var(--muted)' }}>
                    {item.done ? '✓' : item.step}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 500, marginBottom: '0.15rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={() => navigator.clipboard.writeText('@Xentory BetBot')}>
              📋 Copiar @Xentory BetBot
            </button>
          </div>

          {/* Recent signals */}
          <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>📡 Últimas señales enviadas</h2>
            {MOCK_SIGNALS.filter(s => user?.plan === 'elite' || s.channel === 'PRO').map((signal, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.9rem 0', borderBottom: i < MOCK_SIGNALS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{signal.sport}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: '0.15rem' }}>{signal.match}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{signal.pick}</span>
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: signal.channel === 'ELITE' ? 'var(--cyan-dim)' : 'var(--gold-dim)', color: signal.channel === 'ELITE' ? 'var(--cyan)' : 'var(--gold)' }}>
                      {signal.channel}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Urbanist', fontWeight: 700, color: '#00ff88', fontSize: '0.9rem' }}>{signal.confidence}%</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>@{signal.odds}</div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0 }}>{signal.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── HISTORY PAGE ──
export function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPaid = user?.plan !== 'free';

  const MOCK_HISTORY = [
    { sport: '⚽', match: 'Real Madrid vs Atletico', pick: 'Real Madrid gana', result: 'win', odds: 1.75, confidence: 78, date: '2025-02-20' },
    { sport: '🏀', match: 'Celtics vs Heat', pick: 'Over 215.5', result: 'win', odds: 1.90, confidence: 71, date: '2025-02-19' },
    { sport: '⚽', match: 'Barcelona vs Valencia', pick: 'Over 2.5', result: 'loss', odds: 1.65, confidence: 66, date: '2025-02-18' },
    { sport: '🎾', match: 'Sinner vs Medvedev', pick: 'Sinner gana', result: 'win', odds: 1.60, confidence: 74, date: '2025-02-17' },
    { sport: '⚽', match: 'Man City vs Chelsea', pick: 'BTTS Sí', result: 'win', odds: 1.80, confidence: 69, date: '2025-02-16' },
  ];

  if (!isPaid) return (
    <div className="animate-fadeUp" style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>📊 Historial de predicciones</h1>
      <div className="glass" style={{ borderRadius: 16, padding: '4rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
        <h2 style={{ marginBottom: '0.8rem' }}>Historial disponible en Plan Pro</h2>
        <p style={{ color: 'var(--muted)', maxWidth: 380, margin: '0 auto 2rem', lineHeight: 1.7, fontSize: '0.9rem' }}>
          Accede al historial completo de predicciones con aciertos, rachas y estadísticas de rendimiento.
        </p>
        <button onClick={() => navigate('/plans')} className="btn btn-gold btn-lg">Activar Plan Pro →</button>
      </div>
    </div>
  );

  const wins = MOCK_HISTORY.filter(h => h.result === 'win').length;
  const pct = Math.round((wins / MOCK_HISTORY.length) * 100);

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>📊 Historial de predicciones</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Últimas predicciones generadas y su resultado.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total predicciones', value: MOCK_HISTORY.length.toString(), color: 'var(--text)' },
          { label: 'Aciertos', value: wins.toString(), color: 'var(--green)' },
          { label: '% de acierto', value: `${pct}%`, color: pct >= 65 ? 'var(--green)' : 'var(--gold)' },
          { label: 'Racha actual', value: '3 ✓', color: 'var(--cyan)' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ borderRadius: 14, padding: '1.2rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{s.label}</div>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.8rem', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: '1rem', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Partido</span><span>Predicción</span><span>Confianza</span><span>Cuota</span><span>Resultado</span>
        </div>
        {MOCK_HISTORY.map((h, i) => (
          <div key={i} style={{ padding: '0.9rem 1.5rem', borderBottom: i < MOCK_HISTORY.length - 1 ? '1px solid var(--border)' : 'none', display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div>
              <span style={{ marginRight: '0.4rem' }}>{h.sport}</span>
              <span style={{ fontSize: '0.85rem' }}>{h.match}</span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>{h.pick}</span>
            <span style={{ fontFamily: 'Urbanist', fontWeight: 700, color: h.confidence >= 70 ? 'var(--green)' : 'var(--gold)', fontSize: '0.88rem' }}>{h.confidence}%</span>
            <span style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>@{h.odds}</span>
            <span style={{ padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.72rem', fontWeight: 600, background: h.result === 'win' ? 'rgba(0,255,136,0.12)' : 'rgba(255,68,85,0.12)', color: h.result === 'win' ? 'var(--green)' : 'var(--red)', border: `1px solid ${h.result === 'win' ? 'rgba(0,255,136,0.25)' : 'rgba(255,68,85,0.25)'}`, display: 'inline-block' }}>
              {h.result === 'win' ? '✓ Acierto' : '✗ Fallo'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
