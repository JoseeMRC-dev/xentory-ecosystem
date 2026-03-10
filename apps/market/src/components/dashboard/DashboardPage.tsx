import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getLiveAssets, dataReady, formatPrice } from '../../services/marketService';
import { WatchlistManager } from './WatchlistManager';
import { SIGNAL_LABELS, STATUS_CONFIG, CATEGORY_LABELS } from '../../constants';
import type { Asset } from '../../types';

const MARKET_SUMMARY_MOCK = {
  bullish: 8, neutral: 4, bearish: 4, totalAssets: 16,
  btcDominance: 54.2, fearGreed: 68, fearGreedLabel: 'Greed',
};

function StatCard({ title, value, sub, color, icon }: { title: string; value: string; sub?: string; color?: string; icon: string }) {
  return (
    <div className="glass" style={{ borderRadius: 14, padding: '1.4rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '1.5rem', opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.8rem', letterSpacing: '-0.03em', color: color ?? 'var(--text)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  );
}

function AssetRow({ asset, onClick }: { asset: Asset; onClick: () => void }) {
  const isUp = asset.changePercent24h >= 0;
  return (
    <div
      onClick={onClick}
      className="mkt-table-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.8fr',
        alignItems: 'center',
        padding: '0.9rem 1.2rem',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.15s',
        gap: '0.5rem',
        minWidth: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${asset.category === 'crypto' ? '#c9a84c' : asset.category === 'stocks' ? '#00d4ff' : '#00ff88'}30, transparent)`,
          border: '1px solid var(--border2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.65rem', color: 'var(--text2)',
        }}>
          {asset.symbol.slice(0, 2)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.symbol}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
        </div>
      </div>
      <div style={{ fontFamily: 'Urbanist', fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {formatPrice(asset.price, asset.category)}
      </div>
      <div style={{ color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: 500, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
        {isUp ? '▲' : '▼'} {Math.abs(asset.changePercent24h).toFixed(2)}%
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {CATEGORY_LABELS[asset.category]}
      </div>
      <div>
        <span style={{
          ...STATUS_CONFIG[asset.status] ? {
            padding: '0.2rem 0.5rem', borderRadius: 100, fontSize: '0.68rem', whiteSpace: 'nowrap',
            background: `${STATUS_CONFIG[asset.status].color}15`,
            color: STATUS_CONFIG[asset.status].color,
            border: `1px solid ${STATUS_CONFIG[asset.status].color}25`,
          } : {},
        }}>
          {STATUS_CONFIG[asset.status]?.emoji} {STATUS_CONFIG[asset.status]?.label}
        </span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    let id: ReturnType<typeof setInterval>;
    // Wait for initial Binance REST prices before first render
    dataReady.then(() => {
      setAssets(getLiveAssets());
      id = setInterval(() => setAssets(getLiveAssets()), 4000);
    });
    return () => { if (id) clearInterval(id); };
  }, []);

  const filtered = activeCategory === 'all' ? assets : assets.filter(a => a.category === activeCategory);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1200, width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.3rem' }}>
          {greeting}, <span className="text-gradient-gold">{user?.name.split(' ')[0]}</span> 👋
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Aquí tienes el resumen del mercado en tiempo real.
        </p>
      </div>

      {/* Stats — 4 cols desktop, 2x2 móvil */}
      <div className="mkt-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="Bullish assets" value={`${MARKET_SUMMARY_MOCK.bullish}/${MARKET_SUMMARY_MOCK.totalAssets}`} sub="in uptrend" color="var(--green)" icon="🟢" />
        <StatCard title="BTC Dominance" value={`${MARKET_SUMMARY_MOCK.btcDominance}%`} sub="of crypto market" color="var(--gold)" icon="₿" />
        <StatCard title="Fear & Greed" value={`${MARKET_SUMMARY_MOCK.fearGreed}`} sub={MARKET_SUMMARY_MOCK.fearGreedLabel} color="#f97316" icon="😤" />
        <StatCard
          title="Tu plan"
          value={user?.plan === 'free' ? 'Gratis' : user?.plan === 'pro' ? 'Pro' : 'Elite'}
          sub={user?.plan === 'free' ? 'Mejora para más funciones' : 'Acceso completo activo'}
          color={user?.plan === 'free' ? 'var(--muted)' : user?.plan === 'pro' ? 'var(--gold)' : 'var(--cyan)'}
          icon="💎"
        />
      </div>

      {/* Market table */}
      {/* Custom Watchlist */}
      <div className="glass" style={{ borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem', width: '100%' }}>
        <WatchlistManager />
      </div>

      <div className="glass" style={{ borderRadius: 16, overflow: 'hidden', width: '100%' }}>

        {/* Table header */}
        <div style={{ padding: '1rem 1rem 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1rem' }}>Live Markets</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
              <span className="live-dot" />
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Actualizando cada 4s</span>
            </div>
          </div>

          {/* Category filter — scrollable on mobile */}
          <div className="mkt-cat-filter" style={{ display: 'flex', gap: '0.3rem', marginBottom: '0', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'crypto', label: '₿ Cripto' },
              { key: 'stocks', label: '📈 Bolsa' },
              { key: 'forex', label: '💱 Forex' },
            ].map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  padding: '0.4rem 0.9rem', borderRadius: '8px 8px 0 0', border: 'none',
                  cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0,
                  background: activeCategory === cat.key ? 'var(--bg3)' : 'transparent',
                  color: activeCategory === cat.key ? 'var(--text)' : 'var(--muted)',
                  borderBottom: activeCategory === cat.key ? '2px solid var(--gold)' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Column headers */}
        <div className="mkt-col-headers" style={{
          display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.8fr',
          padding: '0.6rem 1.2rem', gap: '0.5rem',
          fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase',
          letterSpacing: '0.08em', borderBottom: '1px solid var(--border)', background: 'var(--card2)',
        }}>
          <div>Asset</div>
          <div>Price</div>
          <div>24h Change</div>
          <div>Category</div>
          <div>Status</div>
        </div>

        {/* Rows */}
        {filtered.map(asset => (
          <AssetRow key={asset.id} asset={asset} onClick={() => navigate(`/market/${asset.id}`)} />
        ))}
      </div>

      {/* Plan upgrade banner */}
      {user?.plan === 'free' && (
        <div
          onClick={() => navigate('/plans')}
          className="mkt-upgrade-banner"
          style={{
            marginTop: '1.5rem', padding: '1.2rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(0,212,255,0.05))',
            border: '1px solid rgba(201,168,76,0.2)', borderRadius: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 700, marginBottom: '0.2rem', fontSize: '0.95rem' }}>
              🚀 Upgrade to Pro Plan — Deep AI Analysis
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
              Accede a análisis ilimitados, alerts de precio y canal Telegram exclusivo desde 29€/mes
            </div>
          </div>
          <button className="btn btn-gold" style={{ flexShrink: 0, marginLeft: '1rem' }}>
            Ver planes →
          </button>
        </div>
      )}
    </div>
  );
}
