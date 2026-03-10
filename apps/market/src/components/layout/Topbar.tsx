import { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribePrices, getLiveAssets, formatPrice, dataReady } from '../../services/marketService';
import type { Asset } from '../../types';

// ── Memoized ticker item — only re-renders when its own price changes ──
const TickerItem = memo(function TickerItem({ asset, onClick }: { asset: Asset; onClick: () => void }) {
  const isUp = asset.changePercent24h >= 0;
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        padding: '0 1.6rem', cursor: 'pointer', fontSize: '0.8rem',
        borderRight: '1px solid var(--border)', flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.03em' }}>
        {asset.symbol}
      </span>
      <span style={{ color: 'var(--text)' }}>{formatPrice(asset.price, asset.category)}</span>
      <span style={{ color: isUp ? 'var(--green)' : 'var(--red)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
        {isUp ? '▲' : '▼'} {Math.abs(asset.changePercent24h).toFixed(2)}%
      </span>
    </span>
  );
});

export function Topbar() {
  const [assets, setAssets] = useState<Asset[]>(() => getLiveAssets()); // immediate mock data
  const navigate = useNavigate();
  const assetsRef = useRef(assets);

  useEffect(() => {
    // 1. Subscribe to real-time price updates (push model — no polling)
    const unsub = subscribePrices(() => {
      const fresh = getLiveAssets();
      assetsRef.current = fresh;
      setAssets(fresh);
    });

    // 2. Also load real prices as soon as dataReady resolves
    dataReady.then(() => {
      const fresh = getLiveAssets();
      assetsRef.current = fresh;
      setAssets(fresh);
    });

    return unsub;
  }, []);

  const doubled = [...assets, ...assets];

  return (
    <header
      className="mkt-topbar"
      style={{
        position: 'fixed', top: 0, left: 'var(--sidebar-w)', right: 0,
        height: 'var(--topbar-h)',
        background: 'rgba(5,8,16,0.92)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        zIndex: 40, display: 'flex', alignItems: 'center', overflow: 'hidden',
        willChange: 'transform', // GPU layer hint
      }}
    >
      {/* Ticker tape */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          className="mkt-ticker-track"
          style={{
            display: 'flex',
            animation: 'ticker 18s linear infinite',
            whiteSpace: 'nowrap',
            willChange: 'transform',
          }}
        >
          {doubled.map((asset, i) => (
            <TickerItem
              key={`${asset.id}-${i}`}
              asset={asset}
              onClick={() => navigate(`/market/${asset.id}`)}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0 1.2rem', borderLeft: '1px solid var(--border)', flexShrink: 0,
      }}>
        <button
          onClick={() => navigate('/alerts')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: '1.1rem', padding: '0.4rem',
            borderRadius: 6, transition: 'color 0.2s', position: 'relative',
          }}
          title="Alerts"
        >
          🔔
          <span style={{
            position: 'absolute', top: 2, right: 2, width: 7, height: 7,
            borderRadius: '50%', background: 'var(--gold)', border: '1px solid var(--bg)',
          }} />
        </button>
        <button
          onClick={() => navigate('/plans')}
          className="btn btn-gold btn-sm"
          style={{ letterSpacing: '0.04em' }}
        >
          💎 Upgrade
        </button>
      </div>

      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (max-width: 768px) {
          .mkt-topbar { left: 0 !important; top: 52px !important; }
        }
      `}</style>
    </header>
  );
}
