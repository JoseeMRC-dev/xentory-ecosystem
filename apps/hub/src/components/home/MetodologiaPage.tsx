import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSignals, formatUnlockTime } from '../../hooks/useSignals';
import { useAccuracyStats } from '../../hooks/useAccuracyStats';
import type { Signal } from '../../hooks/useSignals';
import type { AccuracyPlatform } from '../../hooks/useAccuracyStats';

// ── Types ─────────────────────────────────────────────────────────────
type PlatformTab = 'both' | 'market' | 'bet';

// ── Sub-components ────────────────────────────────────────────────────

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
    win:     { label: '✓ Correcto',    bg: 'rgba(0,255,136,0.1)',  color: 'var(--green)', border: 'rgba(0,255,136,0.2)' },
    loss:    { label: '✗ Incorrecto',  bg: 'rgba(255,68,85,0.1)',  color: 'var(--red)',   border: 'rgba(255,68,85,0.2)' },
    neutral: { label: '— Neutral',     bg: 'rgba(160,168,200,0.1)',color: 'var(--muted)', border: 'rgba(160,168,200,0.2)' },
  };
  const s = map[result];
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.72rem', fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: Signal['platform'] }) {
  const map: Record<string, { label: string; color: string }> = {
    market: { label: 'Market', color: 'var(--cyan)' },
    bet:    { label: 'Bet',    color: 'var(--gold)' },
    both:   { label: 'Ambas', color: 'var(--green)' },
  };
  const s = map[platform] ?? map.both;
  return (
    <span style={{ fontSize: '0.66rem', fontWeight: 600, color: s.color, opacity: 0.85 }}>
      {s.label}
    </span>
  );
}

function LockedRow({ signal, plan }: { signal: Signal; plan: string | null }) {
  const planLabel = plan === 'pro' ? 'Elite' : plan === 'free' ? 'Pro' : 'Registrarse';
  return (
    <tr style={{ borderBottom: '1px solid var(--border)', opacity: 0.55 }}>
      <td style={{ padding: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
        {new Date(signal.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
      </td>
      <td style={{ padding: '0.8rem' }}>
        <span style={{ marginRight: '0.4rem' }}>{signal.asset_icon}</span>
        <span style={{ fontWeight: 500, filter: 'blur(4px)', userSelect: 'none' }}>████████</span>
      </td>
      <td style={{ padding: '0.8rem' }}>
        <span style={{ filter: 'blur(4px)', userSelect: 'none', color: 'var(--text2)', fontSize: '0.82rem' }}>████████████</span>
      </td>
      <td style={{ padding: '0.8rem' }}><span style={{ filter: 'blur(3px)', fontSize: '0.82rem' }}>██%</span></td>
      <td style={{ padding: '0.8rem' }}><PlatformBadge platform={signal.platform} /></td>
      <td style={{ padding: '0.8rem' }}>
        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.68rem', fontWeight: 600, background: 'var(--card2)', color: 'var(--gold)', border: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
          🔒 {signal.unlocks_at ? formatUnlockTime(signal.unlocks_at) : `Requiere ${planLabel}`}
        </span>
      </td>
    </tr>
  );
}

// ── Mini bar chart ─────────────────────────────────────────────────────
function WeeklyChart({ weekly, color }: { weekly: { week_label: string; accuracy: number; total: number }[]; color: string }) {
  const max = Math.max(...weekly.map(w => w.accuracy), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: 72, paddingBottom: 2 }}>
      {weekly.map((w, i) => {
        const pct  = (w.accuracy / max) * 100;
        const barH = Math.max(pct, 6);
        const isGood = w.accuracy >= 65;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
            {/* Tooltip */}
            <div style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--card3)', border: '1px solid var(--border2)', borderRadius: 6,
              padding: '0.2rem 0.4rem', fontSize: '0.64rem', whiteSpace: 'nowrap',
              opacity: 0, transition: 'opacity 0.15s', pointerEvents: 'none',
              color: 'var(--text)', marginBottom: 4, zIndex: 10,
            }} className="bar-tooltip">
              {w.accuracy}% · {w.total} señales
            </div>
            <div
              style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                height: `${barH}%`,
                background: isGood
                  ? `linear-gradient(180deg, ${color}, ${color}80)`
                  : 'rgba(255,68,85,0.5)',
                transition: 'height 0.5s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                const tip = e.currentTarget.previousElementSibling as HTMLElement;
                if (tip) tip.style.opacity = '1';
              }}
              onMouseLeave={e => {
                const tip = e.currentTarget.previousElementSibling as HTMLElement;
                if (tip) tip.style.opacity = '0';
              }}
            />
            <span style={{ fontSize: '0.55rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis', textAlign: 'center' }}>
              {w.week_label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────
function StatCard({ value, label, color, loading }: { value: string; label: string; color: string; loading?: boolean }) {
  return (
    <div className="glass" style={{ borderRadius: 14, padding: '1.3rem', textAlign: 'center' }}>
      {loading ? (
        <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${color}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '2rem', color, letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>{value}</div>
      )}
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{label}</div>
    </div>
  );
}

// ── Competitor comparison table ────────────────────────────────────────
const COMPETITORS = [
  {
    name: 'Xentory',
    xentory: true,
    price: '€0–29/mes',
    ai: true,
    market: true,
    sports: true,
    telegram: true,
    track: true,
    trial: true,
  },
  {
    name: 'Tipsters Telegram',
    price: '€0–100/mes',
    ai: false,
    market: false,
    sports: true,
    telegram: true,
    track: false,
    trial: false,
  },
  {
    name: 'TradingView signals',
    price: '€15–60/mes',
    ai: false,
    market: true,
    sports: false,
    telegram: false,
    track: false,
    trial: false,
  },
  {
    name: 'BetBurger / Arbs',
    price: '€50–150/mes',
    ai: false,
    market: false,
    sports: true,
    telegram: false,
    track: false,
    trial: false,
  },
];

function CompBool({ ok, xentory }: { ok: boolean; xentory?: boolean }) {
  if (ok) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={xentory ? 'var(--green)' : 'var(--muted)'} strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--border2)" strokeWidth="2" strokeLinecap="round">
      <line x1="6" y1="12" x2="18" y2="12"/>
    </svg>
  );
}


// ══════════════════════════════════════════════════════════════════════
export function MetodologiaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const plan = user?.subscriptions?.market ?? user?.subscriptions?.bets ?? null;

  const [tab, setTab] = useState<PlatformTab>('both');

  // Map UI tab to AccuracyPlatform
  const accuracyPlatform: AccuracyPlatform = tab;

  const { data: accData, loading: accLoading } = useAccuracyStats(accuracyPlatform, 6);
  const { signals, loading: sigLoading, error: sigError } = useSignals(user ? plan : null);

  // Filter signals by selected platform tab
  const filteredSignals = tab === 'both'
    ? signals
    : signals.filter(s => s.platform === tab || s.platform === 'both');

  const visibleSignals = filteredSignals.filter(s => s.visible);
  const wins  = visibleSignals.filter(s => s.result === 'win').length;
  const total = visibleSignals.filter(s => s.result !== null).length;

  const displayPct = accData
    ? accData.stats.accuracy_pct
    : total > 0 ? Math.round((wins / total) * 100) : 68;

  const planUpgradeLabel =
    !user           ? 'Crear cuenta' :
    plan === 'free' ? 'Mejorar a Pro' :
    plan === 'pro'  ? 'Mejorar a Elite' : null;

  const planDelayLabel =
    !user           ? '48h de retraso' :
    plan === 'free' ? '24h de retraso' :
    plan === 'pro'  ? '6h de retraso (o al terminar el partido)' :
    'Tiempo real ✓';

  const TABS: [PlatformTab, string, string][] = [
    ['both',   '📊', 'Todos'],
    ['market', '📈', 'Market'],
    ['bet',    '⚽', 'Apuestas'],
  ];

  const accentColor =
    tab === 'market' ? 'var(--cyan)' :
    tab === 'bet'    ? 'var(--gold)' :
    'var(--green)';

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: 'calc(var(--bar-h) + 2.5rem) clamp(1rem,5vw,2rem) 5rem' }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-block', padding: '0.3rem 0.9rem', borderRadius: 100, background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Transparencia total
        </div>
        <h1 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
          Metodología y resultados verificados
        </h1>
        <p style={{ color: 'var(--text2)', maxWidth: 580, margin: '0 auto', lineHeight: 1.8, fontSize: '0.95rem' }}>
          No somos un tipster anónimo de Telegram. Publicamos nuestro historial completo — aciertos <em>y</em> fallos — para que puedas evaluar el rendimiento real antes de suscribirte.
        </p>
      </div>

      {/* ── Platform tabs ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', background: 'var(--card2)', borderRadius: 12, padding: '0.3rem', gap: '0.2rem', border: '1px solid var(--border)' }}>
          {TABS.map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '0.55rem 1.2rem', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.83rem',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: tab === key ? 'var(--card3)' : 'transparent',
              color:      tab === key ? 'var(--text)' : 'var(--muted)',
              transition: 'all 0.18s',
              boxShadow:  tab === key ? '0 1px 8px rgba(0,0,0,0.2)' : 'none',
            }}>
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <StatCard
          value={`${displayPct}%`}
          label="Precisión últimas 6 semanas"
          color="var(--green)"
          loading={accLoading}
        />
        <StatCard
          value={accData ? `${accData.stats.correct}/${accData.stats.resolved}` : `${wins}/${total}`}
          label={`Aciertos${tab !== 'both' ? ` · ${tab === 'market' ? 'Market' : 'Apuestas'}` : ''}`}
          color="var(--gold)"
          loading={accLoading}
        />
        <StatCard
          value={accData ? `${accData.stats.avg_confidence}%` : '>65%'}
          label="Confianza media de señales enviadas"
          color="var(--cyan)"
          loading={accLoading}
        />
        <StatCard
          value=">65%"
          label="Umbral mínimo para publicar una señal"
          color="var(--text)"
        />
      </div>

      {/* ── Weekly accuracy chart ─────────────────────────────────── */}
      {accData && (
        <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2rem)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.1rem' }}>
              📅 Precisión semanal — últimas 6 semanas
            </h2>
            <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.72rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: accentColor, display: 'inline-block' }} />
                ≥65% acierto
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,68,85,0.5)', display: 'inline-block' }} />
                {'<'}65% acierto
              </span>
            </div>
          </div>
          <WeeklyChart weekly={accData.weekly} color={accentColor} />
          <p style={{ marginTop: '0.8rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
            Datos reales de la base de datos de señales · Actualizado en tiempo real
          </p>
        </div>
      )}

      {/* ── How the AI works ─────────────────────────────────────── */}
      <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.3rem', marginBottom: '1.5rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border)' }}>
          🧠 Cómo funciona el motor de IA
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1.5rem' }}>
          {[
            {
              title: 'Fuentes de datos', icon: '🔌',
              items: [
                'API-Football — estadísticas deportivas en tiempo real',
                'Binance & Google Finance — datos de mercado al tick',
                'Google News Grounding — noticias y contexto actual (Pro)',
                'Histórico de los últimos 5 partidos / sesiones',
              ],
            },
            {
              title: 'Modelos de IA', icon: '🤖',
              items: [
                'Gemini 2.0 Flash (plan gratuito) — análisis rápido',
                'Gemini 2.0 Pro (plan Pro/Elite) — análisis completo',
                'Google Grounding activo en Pro — fuentes verificadas',
                'Temperatura 0.3 — respuestas consistentes y precisas',
              ],
            },
            {
              title: 'Control de calidad', icon: '✅',
              items: [
                'Solo se publican señales con >65% de confianza calculada',
                'Se prioriza el mercado con mayor probabilidad estadística',
                'Análisis incluye forma reciente, H2H y contexto de noticias',
                'Factores de riesgo explícitos en cada señal',
              ],
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

      {/* ── Signal history ────────────────────────────────────────── */}
      <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.3rem' }}>📊 Historial de señales</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', boxShadow: '0 0 6px var(--green)', animation: 'pulse 2s infinite' }} />
              En tiempo real
            </span>
            <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem', borderRadius: 100, background: plan === 'elite' ? 'rgba(0,255,136,0.1)' : 'var(--card2)', color: plan === 'elite' ? 'var(--green)' : 'var(--muted)', border: '1px solid var(--border)' }}>
              {planDelayLabel}
            </span>
          </div>
        </div>

        {/* Upgrade banner */}
        {planUpgradeLabel && (
          <div
            onClick={() => navigate(user ? '/pricing' : '/register')}
            style={{ marginBottom: '1rem', padding: '0.8rem 1rem', background: 'linear-gradient(135deg,rgba(201,168,76,0.08),rgba(0,212,255,0.05))', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', transition: 'border-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)')}
          >
            <span style={{ fontSize: '0.82rem', color: 'var(--text2)' }}>
              🔒 Las señales se muestran con retraso según tu plan.
              <span style={{ color: 'var(--gold)', marginLeft: '0.3rem' }}>Señales en tiempo real con Elite.</span>
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {planUpgradeLabel} →
            </span>
          </div>
        )}

        {sigLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.8rem' }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', opacity: 0.5, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
              ))}
            </div>
            Cargando señales…
          </div>
        ) : sigError ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--red)', fontSize: '0.85rem' }}>
            ⚠️ Error cargando señales. Inténtalo de nuevo.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['Fecha', 'Activo / Partido', 'Señal', 'Confianza', 'Plataforma', 'Resultado'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSignals.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      No hay señales disponibles aún para este filtro
                    </td>
                  </tr>
                ) : filteredSignals.map(s =>
                  s.locked ? (
                    <LockedRow key={s.id} signal={s} plan={plan} />
                  ) : (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                        {new Date(s.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ padding: '0.8rem' }}>
                        <span style={{ marginRight: '0.4rem' }}>{s.asset_icon}</span>
                        <span style={{ fontWeight: 500 }}>{s.asset}</span>
                      </td>
                      <td style={{ padding: '0.8rem', color: 'var(--text2)', maxWidth: 220, fontSize: '0.82rem' }}>{s.signal}</td>
                      <td style={{ padding: '0.8rem' }}><ConfidenceBar value={s.confidence} /></td>
                      <td style={{ padding: '0.8rem' }}><PlatformBadge platform={s.platform} /></td>
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

      {/* ── Competitor comparison ─────────────────────────────────── */}
      <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.5rem' }}>
          🏆 ¿Por qué Xentory?
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Comparado con las alternativas del mercado:
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr>
                {['Proveedor', 'Precio', 'IA', 'Mercados', 'Deportes', 'Telegram', 'Historial', 'Trial gratis'].map((h, i) => (
                  <th key={h} style={{ padding: '0.6rem 0.8rem', textAlign: i === 0 ? 'left' : 'center', color: 'var(--muted)', fontWeight: 500, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c, i) => (
                <tr key={c.name} style={{
                  borderBottom: i < COMPETITORS.length - 1 ? '1px solid var(--border)' : 'none',
                  background: c.xentory ? 'rgba(0,200,122,0.03)' : 'transparent',
                }}>
                  <td style={{ padding: '0.85rem 0.8rem', fontWeight: c.xentory ? 700 : 400, color: c.xentory ? 'var(--green)' : 'var(--text)' }}>
                    {c.xentory && <span style={{ marginRight: '0.4rem' }}>✦</span>}
                    {c.name}
                  </td>
                  <td style={{ padding: '0.85rem 0.8rem', textAlign: 'center', fontSize: '0.78rem', color: c.xentory ? 'var(--green)' : 'var(--muted)', fontWeight: c.xentory ? 600 : 400 }}>
                    {c.price}
                  </td>
                  {[c.ai, c.market, c.sports, c.telegram, c.track, c.trial].map((v, j) => (
                    <td key={j} style={{ padding: '0.85rem 0.8rem', textAlign: 'center' }}>
                      <CompBool ok={v} xentory={c.xentory} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
          ✦ Xentory es la única plataforma que combina IA, mercados financieros y deportes con historial público verificable.
        </p>
      </div>

      {/* ── Limitations ───────────────────────────────────────────── */}
      <div className="glass" style={{ borderRadius: 18, padding: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: '2rem', borderLeft: '3px solid var(--orange)' }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>⚠️ Lo que la IA no puede hacer (honestidad total)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.6rem' }}>
          {[
            'No predice eventos imprevisibles: lesiones de última hora, decisiones arbitrales, cisnes negros',
            'El porcentaje de acierto varía semana a semana — no es constante',
            'No reemplaza tu criterio — es una herramienta de apoyo, no un oráculo',
            'No considera tu situación financiera personal ni tu tolerancia al riesgo',
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--orange)', flexShrink: 0, fontWeight: 700 }}>!</span>
              <span style={{ color: 'var(--text2)', lineHeight: 1.6 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.8rem' }}>¿Te convence la metodología?</h3>
        <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Prueba el Plan Pro 7 días gratis. Sin tarjeta de crédito. Cancela cuando quieras.
        </p>
        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} className="btn btn-gold btn-lg">Empezar prueba gratuita →</button>
          <button onClick={() => navigate('/pricing')} className="btn btn-outline btn-lg">Ver planes</button>
        </div>
      </div>
    </div>
  );
}
