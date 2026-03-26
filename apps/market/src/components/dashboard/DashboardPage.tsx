import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getLiveAssets, dataReady, formatPrice } from '../../services/marketService';
import { WatchlistManager } from './WatchlistManager';
import { SIGNAL_LABELS, STATUS_CONFIG, CATEGORY_LABELS } from '../../constants';
import { useLang } from '../../context/LanguageContext';
import type { Asset } from '../../types';

// Fear & Greed labels
const FNG_LABELS: Record<number, { es: string; en: string }> = {
  0:  { es: 'Miedo extremo', en: 'Extreme Fear' },
  25: { es: 'Miedo',         en: 'Fear'          },
  46: { es: 'Neutral',       en: 'Neutral'        },
  55: { es: 'Codicia',       en: 'Greed'          },
  76: { es: 'Codicia extrema', en: 'Extreme Greed' },
};
function fngLabel(value: number) {
  const key = [76, 55, 46, 25, 0].find(k => value >= k) ?? 0;
  return FNG_LABELS[key];
}

async function fetchMarketMeta(): Promise<{ btcDominance: number; fearGreed: number }> {
  try {
    const [cgRes, fngRes] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/global', { signal: AbortSignal.timeout(5000) }),
      fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(5000) }),
    ]);
    const [cgData, fngData] = await Promise.all([cgRes.json(), fngRes.json()]);
    const btcDominance = parseFloat((cgData?.data?.market_cap_percentage?.btc ?? 54).toFixed(1));
    const fearGreed = parseInt(fngData?.data?.[0]?.value ?? '50', 10);
    return { btcDominance, fearGreed };
  } catch {
    return { btcDominance: 54, fearGreed: 50 };
  }
}

function StatCard({ title, value, sub, color }: { title: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass" style={{ borderRadius: 14, padding: '1.4rem' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.8rem', letterSpacing: '-0.03em', color: color ?? 'var(--text)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  );
}

function AssetRow({ asset, onClick }: { asset: Asset; onClick: () => void }) {
  const isUp = asset.changePercent24h >= 0;
  return (
    <div onClick={onClick}
      style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.8fr', alignItems: 'center', padding: '0.9rem 1.2rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s', gap: '0.5rem', minWidth: 0 }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${asset.category === 'crypto' ? '#c9a84c' : asset.category === 'stocks' ? '#00d4ff' : '#00ff88'}22, transparent)`, border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.62rem', color: 'var(--text2)' }}>
          {asset.symbol.slice(0, 2)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.symbol}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
        </div>
      </div>
      <div style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.88rem' }}>{formatPrice(asset.price, asset.category)}</div>
      <div style={{ color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: 500, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
        {isUp ? '▲' : '▼'} {Math.abs(asset.changePercent24h).toFixed(2)}%
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{CATEGORY_LABELS[asset.category]}</div>
      <div>
        {STATUS_CONFIG[asset.status] && (
          <span style={{ padding: '0.2rem 0.5rem', borderRadius: 100, fontSize: '0.65rem', whiteSpace: 'nowrap', background: `${STATUS_CONFIG[asset.status].color}12`, color: STATUS_CONFIG[asset.status].color, border: `1px solid ${STATUS_CONFIG[asset.status].color}20` }}>
            {STATUS_CONFIG[asset.status].label}
          </span>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [btcDominance, setBtcDominance] = useState<number | null>(null);
  const [fearGreed, setFearGreed]     = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let id: ReturnType<typeof setInterval>;
    dataReady.then(() => {
      setAssets(getLiveAssets());
      id = setInterval(() => setAssets(getLiveAssets()), 4000);
    });
    return () => { if (id) clearInterval(id); };
  }, []);

  // Fetch BTC dominance + Fear & Greed once on mount
  useEffect(() => {
    fetchMarketMeta().then(({ btcDominance: d, fearGreed: f }) => {
      setBtcDominance(d);
      setFearGreed(f);
    });
  }, []);

  const filtered = activeCategory === 'all' ? assets : assets.filter(a => a.category === activeCategory);
  const hour = new Date().getHours();
  const greeting = lang === 'es'
    ? (hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

  const CAT_FILTERS = [
    { key: 'all',     label: t('Todo',    'All')    },
    { key: 'crypto',  label: t('Cripto',  'Crypto') },
    { key: 'stocks',  label: t('Bolsa',   'Stocks') },
    { key: 'forex',   label: 'Forex'                },
  ];

  return (
    <div className="animate-fadeUp" style={{ maxWidth: 1200, width: '100%' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.3rem' }}>
          {greeting}, <span className="text-gradient-gold">{user?.name.split(' ')[0]}</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
          {t('Resumen del mercado en tiempo real.', 'Real-time market overview.')}
        </p>
      </div>

      {(() => {
        const bullishCount = assets.filter(a => a.status === 'bullish').length;
        const totalCount   = assets.length || 16;
        const fng          = fearGreed ?? null;
        const fngLbl       = fng !== null ? fngLabel(fng)[lang === 'es' ? 'es' : 'en'] : '…';
        return (
          <div className="mkt-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard title={t('Activos alcistas', 'Bullish assets')} value={assets.length ? `${bullishCount}/${totalCount}` : '…'} sub={t('en tendencia alcista', 'in uptrend')} color="var(--green)" />
            <StatCard title="BTC Dominance" value={btcDominance !== null ? `${btcDominance}%` : '…'} sub={t('del mercado crypto', 'of crypto market')} color="var(--gold)" />
            <StatCard title="Fear & Greed" value={fng !== null ? String(fng) : '…'} sub={fngLbl} color="#f97316" />
            <StatCard
              title={t('Tu plan', 'Your plan')}
              value={user?.plan === 'free' ? t('Básico', 'Basic') : user?.plan === 'pro' ? 'Pro' : 'Elite'}
              sub={user?.plan === 'free' ? t('Actualiza para más funciones', 'Upgrade for more features') : t('Acceso completo activo', 'Full access active')}
              color={user?.plan === 'free' ? 'var(--muted)' : user?.plan === 'pro' ? 'var(--gold)' : 'var(--cyan)'}
            />
          </div>
        );
      })()}

      <div className="glass" style={{ borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem', width: '100%' }}>
        <WatchlistManager />
      </div>

      <div className="glass" style={{ borderRadius: 16, overflow: 'hidden', width: '100%' }}>
        <div style={{ padding: '1rem 1rem 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1rem' }}>{t('Mercados en vivo', 'Live Markets')}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
              <span className="live-dot" />
              <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{t('Actualizando cada 4s', 'Updating every 4s')}</span>
            </div>
          </div>
          <div className="mkt-cat-filter" style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {CAT_FILTERS.map(cat => (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                style={{ padding: '0.4rem 0.9rem', borderRadius: '7px 7px 0 0', border: 'none', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0, background: activeCategory === cat.key ? 'var(--bg3)' : 'transparent', color: activeCategory === cat.key ? 'var(--text)' : 'var(--muted)', borderBottom: activeCategory === cat.key ? '2px solid var(--gold)' : '2px solid transparent', transition: 'all 0.2s' }}
              >{cat.label}</button>
            ))}
          </div>
        </div>

        <div className="mkt-col-headers" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.8fr', padding: '0.6rem 1.2rem', gap: '0.5rem', fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)', background: 'var(--card2)' }}>
          <div>{t('Activo', 'Asset')}</div>
          <div>{t('Precio', 'Price')}</div>
          <div>{t('Cambio 24h', '24h Change')}</div>
          <div>{t('Categoría', 'Category')}</div>
          <div>{t('Estado', 'Status')}</div>
        </div>

        {filtered.map(asset => {
          const isForexLocked = asset.category === 'forex' && user?.plan === 'free';
          return isForexLocked ? (
            <div
              key={asset.id}
              onClick={() => navigate('/plans')}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 0.8fr', alignItems: 'center', padding: '0.9rem 1.2rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s', gap: '0.5rem', opacity: 0.45, filter: 'blur(0.5px)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title={t('Requiere plan Pro', 'Requires Pro plan')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--card2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>🔒</div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{asset.symbol}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{asset.name}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.88rem', filter: 'blur(4px)', userSelect: 'none' }}>{'$' + asset.price.toFixed(4)}</div>
              <div style={{ filter: 'blur(4px)', userSelect: 'none', fontSize: '0.82rem' }}>±0.00%</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Forex</div>
              <div><span style={{ padding: '0.2rem 0.5rem', borderRadius: 100, fontSize: '0.65rem', background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)' }}>Pro</span></div>
            </div>
          ) : (
            <AssetRow key={asset.id} asset={asset} onClick={() => navigate(`/market/${asset.id}`)} />
          );
        })}
      </div>

      {user?.plan === 'free' && (
        <div onClick={() => navigate('/plans')} style={{ marginTop: '1.5rem', padding: '1.2rem 1.5rem', background: 'linear-gradient(135deg, rgba(201,168,76,0.07), rgba(0,212,255,0.04))', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 700, marginBottom: '0.2rem', fontSize: '0.95rem' }}>
              {t('Upgrade al Plan Pro — Análisis IA en profundidad', 'Upgrade to Pro Plan — Deep AI Analysis')}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
              {t('Análisis ilimitados, alertas de precio y canal Telegram exclusivo desde 29€/mes', 'Unlimited analysis, price alerts and exclusive Telegram channel from €29/month')}
            </div>
          </div>
          <button className="btn btn-gold" style={{ flexShrink: 0, marginLeft: '1rem' }}>{t('Ver planes', 'View plans')} →</button>
        </div>
      )}
    </div>
  );
}
