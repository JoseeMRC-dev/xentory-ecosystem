import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLiveAssets, formatPrice } from '../../services/marketService';
import type { Asset } from '../../types';

export function Topbar() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setAssets(getLiveAssets());
    const id = setInterval(() => setAssets(getLiveAssets()), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <header style={{
      position: 'fixed', top: 0, left: 'var(--sidebar-w)', right: 0,
      height: 'var(--topbar-h)',
      background: 'rgba(5,8,16,0.92)',
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(20px)',
      zIndex: 40, display: 'flex', alignItems: 'center', overflow: 'hidden',
    }} className="mkt-topbar">
      {/* Ticker tape */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', animation: 'ticker 18s linear infinite', whiteSpace: 'nowrap' }}>
          {[...assets, ...assets].map((asset, i) => (
            <span key={i} onClick={() => navigate(`/market/${asset.id}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0 1.8rem', cursor: 'pointer', fontSize: '0.8rem', borderRight: '1px solid var(--border)' }}
            >
              <span style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.03em' }}>{asset.symbol}</span>
              <span style={{ color: 'var(--text)' }}>{formatPrice(asset.price, asset.category)}</span>
              <span style={{ color: asset.changePercent24h >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '0.75rem' }}>
                {asset.changePercent24h >= 0 ? '▲' : '▼'} {Math.abs(asset.changePercent24h).toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.2rem', borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={() => navigate('/alerts')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.1rem', padding: '0.4rem', borderRadius: 6, transition: 'color 0.2s', position: 'relative' }}>
          🔔
          <span style={{ position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', border: '1px solid var(--bg)' }} />
        </button>
        <button onClick={() => navigate('/plans')} className="btn btn-gold btn-sm" style={{ letterSpacing: '0.04em' }}>
          💎 Upgrade
        </button>
      </div>

      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (max-width: 768px) { .mkt-topbar { left: 0; top: 52px; } }
      `}</style>
    </header>
  );
}
