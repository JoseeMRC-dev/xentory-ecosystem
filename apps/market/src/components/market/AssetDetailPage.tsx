import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { getAssetById, generatePriceHistory, computeTechnicalIndicators, formatPrice, formatVolume } from '../../services/marketService';
import { generateAnalysis } from '../../services/aiService';
import { SIGNAL_LABELS, STATUS_CONFIG, TIMEFRAMES } from '../../constants';
import type { Asset, PricePoint, TechnicalIndicators, AIAnalysis, TimeframeOption } from '../../types';

const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY ?? 'demo';

function IndicatorBadge({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: '0.9rem 1rem',
      background: highlight ? 'rgba(201,168,76,0.06)' : 'var(--card)',
      border: `1px solid ${highlight ? 'rgba(201,168,76,0.2)' : 'var(--border)'}`,
      borderRadius: 10,
    }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.1rem', color: highlight ? 'var(--gold)' : 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  return (
    <div className="glass-2" style={{ padding: '0.7rem 1rem', borderRadius: 10, fontSize: '0.8rem' }}>
      <div style={{ color: 'var(--muted)', marginBottom: '0.3rem' }}>{d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      <div style={{ fontFamily: 'Outfit', fontWeight: 700, color: 'var(--gold)' }}>{payload[0].value.toFixed(4)}</div>
    </div>
  );
};

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('4H');
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    if (!id) return;
    const a = getAssetById(id);
    if (!a) { navigate('/market'); return; }
    setAsset(a);
    const h = generatePriceHistory(a, 60);
    setHistory(h);
    setIndicators(computeTechnicalIndicators(h));
  }, [id, navigate]);

  const runAnalysis = useCallback(async () => {
    if (!asset || !indicators) return;
    if (user?.plan === 'free' && analysis) return; // free: 1 analysis only demo
    setIsAnalyzing(true);
    try {
      const result = await generateAnalysis(asset, indicators, user?.plan ?? 'free', API_KEY);
      setAnalysis(result);
    } finally {
      setIsAnalyzing(false);
    }
  }, [asset, indicators, user, analysis]);

  if (!asset) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="animate-spin" style={{ width: 32, height: 32, border: '2px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%' }} />
    </div>
  );

  // Forex is locked for free users
  if (asset.category === 'forex' && user?.plan === 'free') {
    return (
      <div style={{ maxWidth: 500, margin: '6rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, marginBottom: '0.5rem' }}>{asset.name}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Los activos Forex están incluidos en el plan Pro. Actualiza para acceder a EUR/USD, GBP/USD, XAU/USD y más en tiempo real.
        </p>
        <button onClick={() => navigate('/plans')} className="btn btn-gold" style={{ margin: '0 auto' }}>
          💎 Ver planes Pro →
        </button>
      </div>
    );
  }

  const isUp = asset.changePercent24h >= 0;
  const chartColor = isUp ? '#00ff88' : '#ff4455';
  const chartData = history.map(p => ({ time: p.timestamp, price: p.close, volume: p.volume }));

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1200, width: '100%' }}>

      {/* Back + header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--card2)', border: '1px solid var(--border2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.9rem',
            }}>
              {asset.symbol.slice(0, 2)}
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', marginBottom: '0.15rem' }}>{asset.name}
                <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 300 }}>{asset.symbol}</span>
              </h1>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{
                  padding: '0.15rem 0.6rem', borderRadius: 100, fontSize: '0.7rem',
                  background: `${STATUS_CONFIG[asset.status].color}15`,
                  color: STATUS_CONFIG[asset.status].color,
                  border: `1px solid ${STATUS_CONFIG[asset.status].color}20`,
                }}>
                  {STATUS_CONFIG[asset.status].emoji} {STATUS_CONFIG[asset.status].label}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Vol. 24h: {formatVolume(asset.volume24h)}
                </span>
              </div>
            </div>
          </div>

          <div className="mkt-detail-actions" style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              onClick={() => setInWatchlist(w => !w)}
              className={`btn ${inWatchlist ? 'btn-gold' : 'btn-outline'}`}
            >
              {inWatchlist ? '⭐ En Watchlist' : '☆ Añadir'}
            </button>
            <button onClick={runAnalysis} className="btn btn-gold" disabled={isAnalyzing}>
              {isAnalyzing ? <span className="animate-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #050810', borderTopColor: 'transparent', borderRadius: '50%' }} /> : '🧠'}
              {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* Price Hero */}
      <div className="glass" style={{ borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '2.8rem', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {formatPrice(asset.price, asset.category)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
              <span style={{ color: isUp ? 'var(--green)' : 'var(--red)', fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem' }}>
                {isUp ? '▲' : '▼'} {formatPrice(Math.abs(asset.change24h), asset.category)} ({Math.abs(asset.changePercent24h).toFixed(2)}%)
              </span>
              <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>últimas 24h</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontFamily: 'Outfit',
                  fontWeight: 600,
                  background: timeframe === tf ? 'var(--gold)' : 'var(--card2)',
                  color: timeframe === tf ? '#050810' : 'var(--muted)',
                  transition: 'all 0.15s',
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={asset.price} stroke={chartColor} strokeDasharray="3 3" strokeOpacity={0.3} />
              <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: chartColor }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* High/Low */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Máx 24h: <span style={{ color: 'var(--green)', fontWeight: 500 }}>{formatPrice(asset.high24h, asset.category)}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Mín 24h: <span style={{ color: 'var(--red)', fontWeight: 500 }}>{formatPrice(asset.low24h, asset.category)}</span>
          </div>
          {asset.marketCap && (
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Cap. mercado: <span style={{ color: 'var(--text)', fontWeight: 500 }}>{formatVolume(asset.marketCap)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Indicators + Analysis Grid */}
      <div className="mkt-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Technical Indicators */}
        {indicators && (
          <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>📐 Indicadores técnicos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
              <IndicatorBadge label="RSI (14)" value={indicators.rsi.toFixed(1)}
                sub={indicators.rsi < 30 ? '⚠️ Sobrevendido' : indicators.rsi > 70 ? '⚠️ Sobrecomprado' : 'Zona neutral'}
                highlight={indicators.rsi < 30 || indicators.rsi > 70}
              />
              <IndicatorBadge label="MACD" value={indicators.macd.value.toFixed(4)}
                sub={`Hist: ${indicators.macd.histogram > 0 ? '+' : ''}${indicators.macd.histogram.toFixed(4)}`}
              />
              <IndicatorBadge label="EMA 20" value={formatPrice(indicators.ema20, asset.category)}
                sub={asset.price > indicators.ema20 ? '✅ Precio sobre EMA' : '❌ Precio bajo EMA'}
              />
              <IndicatorBadge label="EMA 50" value={formatPrice(indicators.ema50, asset.category)}
                sub={asset.price > indicators.ema50 ? '✅ Tendencia positiva' : '❌ Tendencia negativa'}
              />
              <IndicatorBadge label="BB Superior" value={formatPrice(indicators.bollingerBands.upper, asset.category)} />
              <IndicatorBadge label="BB Inferior" value={formatPrice(indicators.bollingerBands.lower, asset.category)} />
              <IndicatorBadge label="ATR (14)" value={formatPrice(indicators.atr, asset.category)} sub="Volatilidad media" />
              <IndicatorBadge label="Vol. Avg 20" value={formatVolume(indicators.volumeAvg20)} sub="Promedio 20 velas" />
            </div>
          </div>
        )}

        {/* AI Analysis */}
        <div className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1rem' }}>🧠 AI Analysis</h2>
            {analysis && (
              <span style={{
                padding: '0.2rem 0.7rem', borderRadius: 100, fontSize: '0.7rem',
                background: analysis.tier === 'pro' ? 'var(--gold-dim)' : 'var(--card2)',
                color: analysis.tier === 'pro' ? 'var(--gold)' : 'var(--muted)',
                border: `1px solid ${analysis.tier === 'pro' ? 'rgba(201,168,76,0.2)' : 'var(--border)'}`,
              }}>
                {analysis.tier === 'pro' ? '⚡ Pro + Grounding' : '⚡ Flash'}
              </span>
            )}
          </div>

          {!analysis && !isAnalyzing && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 3rem)', gap: '1rem', padding: '2rem 0', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem' }}>🤖</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Pulsa el botón "AI Analysis" para que Gemini analice este activo en profundidad.
                {user?.plan === 'free' && <><br /><span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>Plan Free: análisis básico. Pro/Elite: Google Grounding en vivo.</span></>}
              </div>
              <button onClick={runAnalysis} className="btn btn-gold">
                🧠 Analizar ahora
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 3rem)', gap: '1rem' }}>
              <div className="animate-spin" style={{ width: 32, height: 32, border: '2px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%' }} />
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                {user?.plan !== 'free' ? 'Gemini analizando con Google Grounding...' : 'Gemini Flash analizando...'}
              </p>
            </div>
          )}

          {analysis && !isAnalyzing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Signal */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.8rem 1rem',
                borderRadius: 10,
                background: `${SIGNAL_LABELS[analysis.signal]?.bg ?? 'var(--card2)'}`,
                border: `1px solid ${SIGNAL_LABELS[analysis.signal]?.color ?? 'var(--border)'}25`,
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Señal técnica</div>
                  <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: SIGNAL_LABELS[analysis.signal]?.color }}>
                    {SIGNAL_LABELS[analysis.signal]?.label}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Confianza</div>
                  <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.2rem', color: SIGNAL_LABELS[analysis.signal]?.color }}>
                    {analysis.confidence}%
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Resumen</div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text2)' }}>{analysis.summary}</p>
              </div>

              {/* Technical */}
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Contexto técnico</div>
                <p style={{ fontSize: '0.83rem', lineHeight: 1.6, color: 'var(--text2)' }}>{analysis.technicalContext}</p>
              </div>

              {/* Key levels */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div style={{ padding: '0.7rem 0.9rem', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--green)', marginBottom: '0.3rem', letterSpacing: '0.06em' }}>SOPORTES</div>
                  {analysis.keyLevels.support.map((s, i) => (
                    <div key={i} style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.85rem' }}>{formatPrice(s, asset.category)}</div>
                  ))}
                </div>
                <div style={{ padding: '0.7rem 0.9rem', background: 'rgba(255,68,85,0.05)', border: '1px solid rgba(255,68,85,0.1)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--red)', marginBottom: '0.3rem', letterSpacing: '0.06em' }}>RESISTENCIAS</div>
                  {analysis.keyLevels.resistance.map((r, i) => (
                    <div key={i} style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.85rem' }}>{formatPrice(r, asset.category)}</div>
                  ))}
                </div>
              </div>

              {/* Risks & Opps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--red)', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>⚠️ RIESGOS</div>
                  {analysis.risks.map((r, i) => <div key={i} style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.3rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(255,68,85,0.3)' }}>{r}</div>)}
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--green)', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>✅ OPORTUNIDADES</div>
                  {analysis.opportunities.map((o, i) => <div key={i} style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.3rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(0,255,136,0.3)' }}>{o}</div>)}
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                Horizonte: {analysis.timeframe} · Generado: {new Date(analysis.createdAt).toLocaleTimeString('es-ES')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
