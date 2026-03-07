import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getLiveAssets, formatPrice, subscribePrices } from '../../services/marketService';
import { MOCK_ASSETS } from '../../constants';
import type { Asset } from '../../types';

// ── WATCHLIST PAGE ──
export function WatchlistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(['btc', 'eth', 'nvda']);
  const [searchQ, setSearchQ] = useState('');
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  // Track which assets flashed green/red on update
  const [flashed, setFlashed] = useState<Record<string, 'up' | 'down'>>({});
  const prevPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    // Initial load
    const live = getLiveAssets();
    setAllAssets(live);
    setAssets(live.filter(a => watchlist.includes(a.id)));

    // Subscribe to live price pushes
    const unsub = subscribePrices((updates) => {
      setAllAssets(getLiveAssets());
      setAssets(getLiveAssets().filter(a => watchlist.includes(a.id)));

      // Flash animation for changed prices
      const newFlashes: Record<string, 'up' | 'down'> = {};
      Object.entries(updates).forEach(([id, price]) => {
        if (price === undefined) return;
        const prev = prevPrices.current[id];
        if (prev !== undefined && price !== prev) {
          newFlashes[id] = (price as number) > prev ? 'up' : 'down';
        }
        prevPrices.current[id] = price as number;
      });
      if (Object.keys(newFlashes).length > 0) {
        setFlashed(f => ({ ...f, ...newFlashes }));
        setTimeout(() => setFlashed(f => {
          const cleared = { ...f };
          Object.keys(newFlashes).forEach(k => delete cleared[k]);
          return cleared;
        }), 800);
      }
    });
    return unsub;
  }, [watchlist]);

  const canAdd = user?.plan !== 'free' || watchlist.length < 3;
  const filtered = searchQ ? allAssets.filter(a =>
    a.symbol.toLowerCase().includes(searchQ.toLowerCase()) ||
    a.name.toLowerCase().includes(searchQ.toLowerCase())
  ) : [];

  const toggle = (id: string) => {
    if (watchlist.includes(id)) {
      setWatchlist(w => w.filter(x => x !== id));
    } else if (canAdd) {
      setWatchlist(w => [...w, id]);
    }
  };

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 900, width: '100%' }}>
      <div className="mkt-watchlist-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>⭐ Mi Watchlist</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            {watchlist.length} activos · {user?.plan === 'free' ? `máx. 3 (plan Gratis)` : 'ilimitados'}
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            style={{ width: '100%', paddingRight: '2.5rem' }}
            placeholder="Buscar activo..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          {searchQ && (
            <div className="glass-2" style={{
              position: 'absolute', top: '110%', left: 0, right: 0,
              borderRadius: 10, overflow: 'hidden', zIndex: 100,
              maxHeight: 280, overflowY: 'auto',
            }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center' }}>Sin resultados</div>
              ) : filtered.map(a => (
                <div
                  key={a.id}
                  onClick={() => { toggle(a.id); setSearchQ(''); }}
                  style={{
                    padding: '0.8rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <span style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.9rem' }}>{a.symbol}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{a.name}</span>
                  </div>
                  <span style={{ color: watchlist.includes(a.id) ? 'var(--gold)' : 'var(--muted)', fontSize: '0.8rem' }}>
                    {watchlist.includes(a.id) ? '⭐ Añadido' : '+ Añadir'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⭐</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Tu watchlist está vacía</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Busca activos arriba para añadirlos a tu seguimiento</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {assets.map(asset => {
            const isUp = asset.changePercent24h >= 0;
            return (
              <div
                key={asset.id}
                className="glass"
                style={{
                  borderRadius: 14,
                  padding: '1.2rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ flex: 1 }} onClick={() => navigate(`/market/${asset.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1rem' }}>{asset.symbol}</div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{asset.name}</span>
                  </div>
                </div>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.1rem' }} onClick={() => navigate(`/market/${asset.id}`)}>
                  {formatPrice(asset.price, asset.category)}
                </div>
                <div style={{ color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: 500, minWidth: 70, textAlign: 'right' }} onClick={() => navigate(`/market/${asset.id}`)}>
                  {isUp ? '▲' : '▼'} {Math.abs(asset.changePercent24h).toFixed(2)}%
                </div>
                <button
                  onClick={() => toggle(asset.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--red)', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {user?.plan === 'free' && (
        <div style={{
          marginTop: '1.5rem', padding: '1rem 1.5rem',
          background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>
            Plan Gratis: máximo 3 activos. <strong style={{ color: 'var(--gold)' }}>Pro/Elite</strong>: watchlist ilimitada + alertas.
          </span>
          <button onClick={() => navigate('/plans')} className="btn btn-gold btn-sm">Mejorar</button>
        </div>
      )}
    </div>
  );
}

// ── ALERTS PAGE ──
export function AlertsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([
    { id: '1', symbol: 'BTC', condition: 'above', target: 100000, triggered: false },
    { id: '2', symbol: 'ETH', condition: 'below', target: 3000, triggered: false },
  ]);

  const isPaid = user?.plan !== 'free';

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 800, width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>🔔 Alertas de precio</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Recibe una notificación cuando un activo alcance tu precio objetivo.</p>
      </div>

      {!isPaid ? (
        <div className="glass" style={{ borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔔</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Alertas de precio — Plan Pro</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Configura alertas ilimitadas y recíbelas en la plataforma y en Telegram automáticamente.
          </p>
          <button onClick={() => navigate('/plans')} className="btn btn-gold">💎 Activar Plan Pro</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
            {alerts.map(alert => (
              <div key={alert.id} className="glass" style={{ borderRadius: 12, padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: alert.condition === 'above' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,85,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                }}>
                  {alert.condition === 'above' ? '📈' : '📉'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Urbanist', fontWeight: 700 }}>{alert.symbol}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                    Alerta cuando el precio {alert.condition === 'above' ? 'supere' : 'baje de'} <strong style={{ color: 'var(--text)' }}>${alert.target.toLocaleString()}</strong>
                  </div>
                </div>
                <button onClick={() => setAlerts(a => a.filter(x => x.id !== alert.id))} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>✕</button>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/market')} className="btn btn-outline">
            + Nueva alerta
          </button>
        </>
      )}
    </div>
  );
}

// ── ANALYSIS PAGE ──
export function AnalysisPage() {
  const navigate = useNavigate();

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1000, width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>🧠 Análisis IA</h1>
        <p style={{ color: 'var(--muted)' }}>Selecciona un activo para generar un análisis profundo.</p>
      </div>

      <div className="mkt-analysis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
        {MOCK_ASSETS.map(asset => {
          const isUp = asset.changePercent24h >= 0;
          return (
            <div
              key={asset.id}
              className="glass"
              onClick={() => navigate(`/market/${asset.id}`)}
              style={{ borderRadius: 12, padding: '1.2rem', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <div style={{ fontFamily: 'Urbanist', fontWeight: 700 }}>{asset.symbol}</div>
                <span style={{ color: isUp ? 'var(--green)' : 'var(--red)', fontSize: '0.8rem', fontWeight: 500 }}>
                  {isUp ? '▲' : '▼'} {Math.abs(asset.changePercent24h).toFixed(2)}%
                </span>
              </div>
              <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.2rem' }}>
                {formatPrice(asset.price, asset.category)}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{asset.name} · {asset.category}</div>
              <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                🧠 Analizar →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
