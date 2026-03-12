/**
 * WatchlistManager — Asset Search & Custom Dashboard
 * Allows users to search any asset and pin it to their dashboard.
 * Persists selection in localStorage (upgradeable to Supabase).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLiveAssets, formatPrice } from '../../services/marketService';
import type { Asset } from '../../types';

const STORAGE_KEY = 'xentory_watchlist_v2';

// ── Extended asset catalogue (search pool) ──────────────────────
const ASSET_CATALOGUE = [
  // Crypto
  { id: 'btc',  symbol: 'BTC',   name: 'Bitcoin',        category: 'crypto' },
  { id: 'eth',  symbol: 'ETH',   name: 'Ethereum',       category: 'crypto' },
  { id: 'sol',  symbol: 'SOL',   name: 'Solana',         category: 'crypto' },
  { id: 'xrp',  symbol: 'XRP',   name: 'XRP',            category: 'crypto' },
  { id: 'bnb',  symbol: 'BNB',   name: 'BNB',            category: 'crypto' },
  { id: 'ada',  symbol: 'ADA',   name: 'Cardano',        category: 'crypto' },
  { id: 'doge', symbol: 'DOGE',  name: 'Dogecoin',       category: 'crypto' },
  { id: 'avax', symbol: 'AVAX',  name: 'Avalanche',      category: 'crypto' },
  { id: 'dot',  symbol: 'DOT',   name: 'Polkadot',       category: 'crypto' },
  { id: 'link', symbol: 'LINK',  name: 'Chainlink',      category: 'crypto' },
  { id: 'uni',  symbol: 'UNI',   name: 'Uniswap',        category: 'crypto' },
  { id: 'shib', symbol: 'SHIB',  name: 'Shiba Inu',      category: 'crypto' },
  { id: 'pepe', symbol: 'PEPE',  name: 'Pepe',           category: 'crypto' },
  { id: 'wif',  symbol: 'WIF',   name: 'dogwifhat',      category: 'crypto' },
  // Stocks
  { id: 'nvda',  symbol: 'NVDA',  name: 'NVIDIA',        category: 'stocks' },
  { id: 'aapl',  symbol: 'AAPL',  name: 'Apple',         category: 'stocks' },
  { id: 'tsla',  symbol: 'TSLA',  name: 'Tesla',         category: 'stocks' },
  { id: 'msft',  symbol: 'MSFT',  name: 'Microsoft',     category: 'stocks' },
  { id: 'amzn',  symbol: 'AMZN',  name: 'Amazon',        category: 'stocks' },
  { id: 'googl', symbol: 'GOOGL', name: 'Alphabet',      category: 'stocks' },
  { id: 'meta',  symbol: 'META',  name: 'Meta',          category: 'stocks' },
  { id: 'nflx',  symbol: 'NFLX',  name: 'Netflix',       category: 'stocks' },
  { id: 'spx',   symbol: 'SPX',   name: 'S&P 500',       category: 'indices' },
  // Forex
  { id: 'eurusd', symbol: 'EUR/USD', name: 'Euro/US Dollar',          category: 'forex' },
  { id: 'gbpusd', symbol: 'GBP/USD', name: 'British Pound/US Dollar', category: 'forex' },
  { id: 'usdjpy', symbol: 'USD/JPY', name: 'US Dollar/Japanese Yen',  category: 'forex' },
  { id: 'eurgbp', symbol: 'EUR/GBP', name: 'Euro/British Pound',      category: 'forex' },
  // Commodities
  { id: 'gold',   symbol: 'XAU/USD', name: 'Gold',             category: 'commodities' },
  { id: 'silver', symbol: 'XAG/USD', name: 'Silver',           category: 'commodities' },
  { id: 'oil',    symbol: 'WTI',     name: 'Crude Oil (WTI)',  category: 'commodities' },
];

// Realistic price reference for assets not yet in live feed
const PRICE_REF: Record<string, { price: number; change24h: number; changePercent24h: number; category: string }> = {
  btc:    { price: 83400,  change24h: 1240,   changePercent24h: 1.51,  category: 'crypto' },
  eth:    { price: 1940,   change24h: -28,    changePercent24h: -1.42, category: 'crypto' },
  sol:    { price: 133,    change24h: 2.1,    changePercent24h: 1.6,   category: 'crypto' },
  xrp:    { price: 2.18,   change24h: 0.08,   changePercent24h: 3.8,   category: 'crypto' },
  bnb:    { price: 580,    change24h: 6.2,    changePercent24h: 1.08,  category: 'crypto' },
  ada:    { price: 0.71,   change24h: -0.03,  changePercent24h: -4.2,  category: 'crypto' },
  doge:   { price: 0.155,  change24h: 0.004,  changePercent24h: 2.6,   category: 'crypto' },
  avax:   { price: 21.8,   change24h: 0.6,    changePercent24h: 2.8,   category: 'crypto' },
  dot:    { price: 4.2,    change24h: -0.1,   changePercent24h: -2.3,  category: 'crypto' },
  link:   { price: 13.4,   change24h: 0.4,    changePercent24h: 3.1,   category: 'crypto' },
  uni:    { price: 5.8,    change24h: -0.2,   changePercent24h: -3.3,  category: 'crypto' },
  shib:   { price: 0.0000123, change24h: 0.0000003, changePercent24h: 2.5, category: 'crypto' },
  pepe:   { price: 0.0000082, change24h: -0.0000002, changePercent24h: -2.4, category: 'crypto' },
  wif:    { price: 0.92,   change24h: 0.05,   changePercent24h: 5.7,   category: 'crypto' },
  nvda:   { price: 118.5,  change24h: -2.1,   changePercent24h: -1.74, category: 'stocks' },
  aapl:   { price: 213.4,  change24h: 1.28,   changePercent24h: 0.6,   category: 'stocks' },
  tsla:   { price: 258.1,  change24h: -3.14,  changePercent24h: -1.2,  category: 'stocks' },
  msft:   { price: 415.6,  change24h: 3.32,   changePercent24h: 0.81,  category: 'stocks' },
  amzn:   { price: 198.9,  change24h: -1.8,   changePercent24h: -0.9,  category: 'stocks' },
  googl:  { price: 174.8,  change24h: 2.1,    changePercent24h: 1.22,  category: 'stocks' },
  meta:   { price: 587.2,  change24h: 8.4,    changePercent24h: 1.45,  category: 'stocks' },
  nflx:   { price: 912.5,  change24h: 11.2,   changePercent24h: 1.24,  category: 'stocks' },
  spx:    { price: 5614,   change24h: -28,    changePercent24h: -0.5,  category: 'indices' },
  eurusd: { price: 1.0842, change24h: 0.0018, changePercent24h: 0.17,  category: 'forex' },
  gbpusd: { price: 1.2641, change24h: -0.003, changePercent24h: -0.25, category: 'forex' },
  usdjpy: { price: 149.82, change24h: 0.54,   changePercent24h: 0.36,  category: 'forex' },
  eurgbp: { price: 0.8562, change24h: 0.001,  changePercent24h: 0.12,  category: 'forex' },
  gold:   { price: 2932,   change24h: 18,     changePercent24h: 0.62,  category: 'commodities' },
  silver: { price: 32.4,   change24h: 0.3,    changePercent24h: 0.93,  category: 'commodities' },
  oil:    { price: 70.8,   change24h: -0.9,   changePercent24h: -1.26, category: 'commodities' },
};

const CATEGORY_COLORS: Record<string, string> = {
  crypto:      '#c9a84c',
  stocks:      '#00d4ff',
  forex:       '#00ff88',
  commodities: '#f97316',
  indices:     '#a855f7',
};

const CATEGORY_ICONS: Record<string, string> = {
  crypto: '₿', stocks: '📈', forex: '💱', commodities: '🪙', indices: '📊',
};

// ── Persist helpers ──────────────────────────────────────────────
function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : ['btc', 'eth', 'nvda', 'eurusd'];
  } catch { return ['btc', 'eth', 'nvda', 'eurusd']; }
}

function saveWatchlist(ids: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /**/ }
}

// ── Main component ───────────────────────────────────────────────
export function WatchlistManager() {
  const [watchlistIds, setWatchlistIds] = useState<string[]>(loadWatchlist);
  const [query, setQuery]               = useState('');
  const [showSearch, setShowSearch]     = useState(false);
  const [liveData, setLiveData]         = useState<Asset[]>(() => getLiveAssets());
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Live price updates
  useEffect(() => {
    const id = setInterval(() => setLiveData(getLiveAssets()), 3000);
    return () => clearInterval(id);
  }, []);

  // Persist on change
  useEffect(() => { saveWatchlist(watchlistIds); }, [watchlistIds]);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showSearch]);

  const addAsset = useCallback((id: string) => {
    setWatchlistIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setQuery('');
    setShowSearch(false);
  }, []);

  const removeAsset = useCallback((id: string) => {
    setWatchlistIds(prev => prev.filter(x => x !== id));
  }, []);

  // Search results
  const results = query.length >= 1
    ? ASSET_CATALOGUE.filter(a =>
        a.symbol.toLowerCase().includes(query.toLowerCase()) ||
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : ASSET_CATALOGUE.slice(0, 8);

  // Merge catalogue with live prices — fallback to PRICE_REF so price is never 0
  const watchlistAssets = watchlistIds.map(id => {
    const live = liveData.find(a => a.id === id);
    if (live && live.price > 0) return live;
    const cat = ASSET_CATALOGUE.find(a => a.id === id);
    if (!cat) return null;
    const ref = PRICE_REF[id];
    return {
      ...cat,
      price:            ref?.price           ?? 0,
      change24h:        ref?.change24h        ?? 0,
      changePercent24h: ref?.changePercent24h ?? 0,
      volume24h:        0,
      status:           ref ? (ref.changePercent24h >= 0 ? 'bullish' : 'bearish') : 'neutral',
    } as Asset;
  }).filter(Boolean) as Asset[];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1rem' }}>⭐</span>
          <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem' }}>My Watchlist</span>
          <span style={{
            background: 'var(--card2)', borderRadius: 100, padding: '0.15rem 0.5rem',
            fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 500,
          }}>
            {watchlistIds.length} assets
          </span>
        </div>
        <button
          onClick={() => setShowSearch(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.45rem 0.9rem', borderRadius: 8, border: '1px solid var(--border)',
            background: showSearch ? 'var(--gold-dim)' : 'var(--card2)',
            color: showSearch ? 'var(--gold)' : 'var(--text2)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
            transition: 'all 0.18s',
          }}
        >
          {showSearch ? '✕ Close' : '+ Add asset'}
        </button>
      </div>

      {/* Search panel */}
      {showSearch && (
        <div style={{
          background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 12,
          padding: '1rem', marginBottom: '1rem', animation: 'fadeSlideDown 0.18s ease',
        }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, symbol or category…"
            style={{
              width: '100%', padding: '0.65rem 1rem', borderRadius: 8,
              border: '1px solid var(--border2)', background: 'var(--bg2)',
              color: 'var(--text)', fontSize: '0.88rem', outline: 'none',
              marginBottom: '0.75rem', fontFamily: 'Figtree, sans-serif',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {results.map(asset => {
              const already = watchlistIds.includes(asset.id);
              const color = CATEGORY_COLORS[asset.category] ?? 'var(--gold)';
              return (
                <button
                  key={asset.id}
                  onClick={() => !already && addAsset(asset.id)}
                  disabled={already}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.8rem', borderRadius: 8, border: 'none',
                    background: already ? 'var(--card)' : 'transparent',
                    cursor: already ? 'default' : 'pointer',
                    color: 'var(--text)', textAlign: 'left', width: '100%',
                    transition: 'background 0.15s',
                    opacity: already ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = 'var(--card)'; }}
                  onMouseLeave={e => { if (!already) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: `${color}18`, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem',
                  }}>
                    {CATEGORY_ICONS[asset.category] ?? '◆'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{asset.symbol}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
                  </div>
                  <span style={{
                    fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: 100,
                    background: `${color}15`, color,
                  }}>
                    {asset.category}
                  </span>
                  {already && <span style={{ fontSize: '0.75rem', color: 'var(--green)' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Watchlist grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
        {watchlistAssets.map(asset => {
          const isUp  = asset.changePercent24h >= 0;
          const color = CATEGORY_COLORS[asset.category] ?? 'var(--gold)';
          return (
            <div
              key={asset.id}
              className="glass"
              style={{
                borderRadius: 12, padding: '1rem',
                cursor: 'pointer', transition: 'transform 0.15s, border-color 0.15s',
                border: `1px solid ${color}20`, position: 'relative',
              }}
              onClick={() => navigate(`/market/${asset.id}`)}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {/* Remove button */}
              <button
                onClick={e => { e.stopPropagation(); removeAsset(asset.id); }}
                style={{
                  position: 'absolute', top: 6, right: 6, width: 20, height: 20,
                  borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'var(--card2)', color: 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', opacity: 0.6,
                  transition: 'opacity 0.15s',
                }}
                title="Remove from watchlist"
              >✕</button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: `${color}18`, border: `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', flexShrink: 0,
                }}>
                  {CATEGORY_ICONS[asset.category] ?? '◆'}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'Outfit' }}>{asset.symbol}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{asset.category}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                {asset.price > 0 ? formatPrice(asset.price, asset.category) : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                {isUp ? '▲' : '▼'} {Math.abs(asset.changePercent24h).toFixed(2)}%
              </div>
            </div>
          );
        })}

        {/* Add more CTA */}
        <div
          className="glass"
          onClick={() => setShowSearch(true)}
          style={{
            borderRadius: 12, padding: '1rem',
            cursor: 'pointer', border: '1px dashed var(--border2)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            minHeight: 110, opacity: 0.5, transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          <span style={{ fontSize: '1.3rem' }}>+</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Add asset</span>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
