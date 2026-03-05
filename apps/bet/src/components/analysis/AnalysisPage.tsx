import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchTeamStats } from '../../services/sportsService';
import { generateMatchAnalysis } from '../../services/aiService';
import { SPORT_CONFIG, FORM_COLORS, confidenceColor } from '../../constants';
import type { MatchAnalysis, FormMatch } from '../../types';

// ── FORM BADGE ──
function FormBadge({ result }: { result: FormMatch['result'] }) {
  const c = FORM_COLORS[result];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 26, height: 26, borderRadius: '50%', fontSize: '0.72rem', fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {result}
    </span>
  );
}

// ── MARKET ROW ──
function MarketRow({ label, prob, recommendation, isRec, odds }: {
  label: string; prob: number; recommendation: string; isRec: boolean; odds?: number;
}) {
  const color = isRec ? confidenceColor(prob) : 'var(--muted)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.8rem',
      padding: '0.7rem 0.9rem', borderRadius: 10,
      background: isRec ? `${color}08` : 'transparent',
      border: isRec ? `1px solid ${color}25` : '1px solid transparent',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: isRec ? 500 : 300, color: isRec ? 'var(--text)' : 'var(--text2)' }}>
          {label} {isRec && '✓'}
        </div>
      </div>
      <div style={{ width: 120 }}>
        <div className="conf-bar">
          <div className="conf-bar-fill" style={{ width: `${prob}%`, background: color }} />
        </div>
      </div>
      <div style={{ minWidth: 40, textAlign: 'right', fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.88rem', color }}>{prob}%</div>
      {odds && <div style={{ minWidth: 40, textAlign: 'right', fontSize: '0.8rem', color: 'var(--gold)' }}>@{odds}</div>}
    </div>
  );
}

// ── ANALYSIS PAGE ──
export function MatchAnalysisPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const match = location.state?.match;

  const generateAnalysis = async () => {
    if (!match) return;
    setLoading(true);
    setError('');
    try {
      const [homeStats, awayStats] = await Promise.all([
        fetchTeamStats(match.homeTeam.id, match.competition.id),
        fetchTeamStats(match.awayTeam.id, match.competition.id),
      ]);
      if (!homeStats || !awayStats) throw new Error('No stats');
      const result = await generateMatchAnalysis(match, homeStats, awayStats, user?.plan ?? 'free');
      setAnalysis(result);
    } catch {
      setError('Error al generar el análisis. Inténtalo de nuevo.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (match) generateAnalysis();
  }, []);

  if (!match) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
      <h3>Partido no encontrado</h3>
      <button onClick={() => navigate('/matches')} className="btn btn-outline" style={{ marginTop: '1rem' }}>← Volver</button>
    </div>
  );

  const sport = SPORT_CONFIG[match.sport as keyof typeof SPORT_CONFIG];

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1000 }}>

      {/* Back */}
      <button onClick={() => navigate('/matches')} className="btn btn-ghost btn-sm" style={{ marginBottom: '1.2rem' }}>
        ← Volver a partidos
      </button>

      {/* Match hero */}
      <div className="glass" style={{
        borderRadius: 18, padding: '2rem', marginBottom: '1.5rem',
        borderTop: `2px solid ${sport.color}`,
        background: `linear-gradient(135deg, ${sport.color}05, transparent)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{sport.emoji}</span>
          <span style={{ fontSize: '0.82rem', color: sport.color, fontWeight: 500 }}>{match.competition.name}</span>
          {match.round && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>· {match.round}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.3rem' }}>
              {match.homeTeam.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Local</div>
          </div>
          <div style={{ background: 'var(--card2)', borderRadius: 12, padding: '0.8rem 1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
              {new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </div>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.1em' }}>VS</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
              {new Date(match.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.3rem' }}>
              {match.awayTeam.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Visitante</div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass" style={{ borderRadius: 16, padding: '4rem', textAlign: 'center' }}>
          <div className="animate-spin" style={{ display: 'inline-block', width: 40, height: 40, border: '3px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%', marginBottom: '1.5rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Generando análisis IA...</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
            {user?.plan === 'free' ? 'Analizando últimos 3 partidos con Gemini Flash' : 'Analizando últimos 5 partidos con Gemini Pro + Google Grounding'}
          </p>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', borderRadius: 12, color: 'var(--red)', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {error}
          <button onClick={generateAnalysis} className="btn btn-outline btn-sm">Reintentar</button>
        </div>
      )}

      {analysis && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* AI Summary */}
          <div className="glass" style={{ borderRadius: 16, padding: '1.5rem', borderLeft: '3px solid var(--gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem' }}>🧠 Análisis IA</h2>
              <span style={{
                padding: '0.2rem 0.7rem', borderRadius: 100, fontSize: '0.65rem',
                background: analysis.tier === 'pro' ? 'var(--gold-dim)' : 'var(--card2)',
                color: analysis.tier === 'pro' ? 'var(--gold)' : 'var(--muted)',
                border: analysis.tier === 'pro' ? '1px solid rgba(201,168,76,0.2)' : '1px solid var(--border)',
              }}>
                {analysis.tier === 'pro' ? '⚡ Gemini Pro + Grounding' : 'Gemini Flash'}
              </span>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: '0.92rem', lineHeight: 1.75, marginBottom: '1rem' }}>{analysis.aiSummary}</p>
            {user?.plan !== 'free' && (
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.7 }}>{analysis.aiTechnical}</p>
            )}
            {user?.plan === 'free' && (
              <div style={{ padding: '0.8rem 1rem', background: 'var(--card2)', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--muted)' }}>
                🔒 Análisis técnico completo disponible en Plan Pro
              </div>
            )}
          </div>

          {/* Best Bet */}
          <div className="glass" style={{
            borderRadius: 16, padding: '1.5rem',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(0,255,136,0.04))',
            border: '1px solid rgba(201,168,76,0.2)',
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.8rem' }}>
              🎯 Mejor apuesta recomendada
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.3rem' }}>
                  {analysis.markets.bestBet.pick}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{analysis.markets.bestBet.market}</div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gold)' }}>
                    @{analysis.markets.bestBet.odds}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Cuota estimada</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.8rem', color: confidenceColor(analysis.markets.bestBet.confidence) }}>
                    {analysis.markets.bestBet.confidence}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Confianza</div>
                </div>
              </div>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border)' }}>
              {analysis.markets.bestBet.reasoning}
            </p>
          </div>

          {/* Markets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>

            {/* 1X2 */}
            <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>⚖️ Resultado 1X2</h3>
              <MarketRow label={`${match.homeTeam.shortName} gana`} prob={analysis.markets.result.home} recommendation="home" isRec={analysis.markets.result.recommendation === 'home'} odds={analysis.markets.result.homeOdds} />
              <MarketRow label="Empate" prob={analysis.markets.result.draw} recommendation="draw" isRec={analysis.markets.result.recommendation === 'draw'} odds={analysis.markets.result.drawOdds} />
              <MarketRow label={`${match.awayTeam.shortName} gana`} prob={analysis.markets.result.away} recommendation="away" isRec={analysis.markets.result.recommendation === 'away'} odds={analysis.markets.result.awayOdds} />
            </div>

            {/* Over/Under */}
            <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>📊 Goles Over/Under</h3>
              <MarketRow label="Over 2.5 goles" prob={analysis.markets.overUnder25.over} recommendation="over" isRec={analysis.markets.overUnder25.recommendation === 'over'} odds={parseFloat((1 / (analysis.markets.overUnder25.over / 100) * 0.92).toFixed(2))} />
              <MarketRow label="Under 2.5 goles" prob={analysis.markets.overUnder25.under} recommendation="under" isRec={analysis.markets.overUnder25.recommendation === 'under'} />
              <div style={{ height: 1, background: 'var(--border)', margin: '0.5rem 0' }} />
              {user?.plan !== 'free' ? (
                <>
                  <MarketRow label="Over 3.5 goles" prob={analysis.markets.overUnder35.over} recommendation="over" isRec={analysis.markets.overUnder35.recommendation === 'over'} />
                  <MarketRow label="Under 3.5 goles" prob={analysis.markets.overUnder35.under} recommendation="under" isRec={analysis.markets.overUnder35.recommendation === 'under'} />
                </>
              ) : (
                <div style={{ padding: '0.6rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>🔒 Over/Under 3.5 — Plan Pro</div>
              )}
            </div>

            {/* BTTS */}
            <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>🥅 Ambos equipos marcan (BTTS)</h3>
              <MarketRow label="BTTS — Sí" prob={analysis.markets.btts.yes} recommendation="yes" isRec={analysis.markets.btts.recommendation === 'yes'} />
              <MarketRow label="BTTS — No" prob={analysis.markets.btts.no} recommendation="no" isRec={analysis.markets.btts.recommendation === 'no'} />
            </div>

            {/* Handicap */}
            <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                ⚡ Hándicap Asiático ({analysis.markets.handicap.line > 0 ? '+' : ''}{analysis.markets.handicap.line})
              </h3>
              {user?.plan !== 'free' ? (
                <>
                  <MarketRow label={`${match.homeTeam.shortName} (${analysis.markets.handicap.line})`} prob={analysis.markets.handicap.home} recommendation="home" isRec={analysis.markets.handicap.recommendation === 'home'} />
                  <MarketRow label={`${match.awayTeam.shortName} (${analysis.markets.handicap.line > 0 ? '-' : '+'}${Math.abs(analysis.markets.handicap.line)})`} prob={analysis.markets.handicap.away} recommendation="away" isRec={analysis.markets.handicap.recommendation === 'away'} />
                </>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  🔒 Mercado de hándicap disponible en Plan Pro
                </div>
              )}
            </div>
          </div>

          {/* Team form comparison */}
          <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1.2rem' }}>📋 Forma reciente (últimos {analysis.homeStats.form.length} partidos)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {[
                { stats: analysis.homeStats, team: match.homeTeam },
                { stats: analysis.awayStats, team: match.awayTeam },
              ].map(({ stats, team }) => (
                <div key={team.id}>
                  <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.8rem' }}>{team.name}</div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                    {stats.form.map((f, i) => <FormBadge key={i} result={f.result} />)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {[
                      { label: 'Goles/partido', value: stats.goalsScored.toFixed(1), color: 'var(--green)' },
                      { label: 'Encajados/partido', value: stats.goalsConceded.toFixed(1), color: 'var(--red)' },
                      { label: 'BTTS histórico', value: `${stats.btts}%`, color: 'var(--cyan)' },
                      { label: 'Over 2.5 histórico', value: `${stats.over25}%`, color: 'var(--gold)' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--muted)' }}>{item.label}</span>
                        <span style={{ color: item.color, fontWeight: 500 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key factors + Risks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
            <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>🔑 Factores clave</h3>
              {analysis.keyFactors.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: 'var(--text2)' }}>{f}</span>
                </div>
              ))}
            </div>
            <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>⚠️ Factores de riesgo</h3>
              {analysis.risks.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--orange)', fontWeight: 700, flexShrink: 0 }}>!</span>
                  <span style={{ color: 'var(--text2)' }}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ padding: '1rem 1.2rem', background: 'var(--card2)', borderRadius: 12, border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            ⚠️ <strong style={{ color: 'var(--text2)' }}>Aviso legal:</strong> Este análisis es de carácter informativo y no constituye asesoramiento de apuestas. Las predicciones son estimaciones estadísticas. Apostar conlleva riesgo de pérdida económica. Juega con responsabilidad.
          </div>

        </div>
      )}
    </div>
  );
}

// ── ANALYSIS OVERVIEW (from sidebar) ──
export function AnalysisPage() {
  const navigate = useNavigate();
  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>🧠 Análisis IA</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Selecciona un partido desde la sección de Partidos para generar el análisis completo.</p>
      </div>
      <div className="glass" style={{ borderRadius: 16, padding: '4rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🧠</div>
        <h2 style={{ marginBottom: '0.8rem' }}>Motor de predicción listo</h2>
        <p style={{ color: 'var(--muted)', maxWidth: 400, margin: '0 auto 2rem', lineHeight: 1.7 }}>
          Ve a Partidos, elige un enfrentamiento y genera el análisis completo con probabilidades, cuotas estimadas y la mejor apuesta del día.
        </p>
        <button onClick={() => navigate('/matches')} className="btn btn-gold btn-lg">
          📅 Ver partidos disponibles
        </button>
      </div>
    </div>
  );
}
