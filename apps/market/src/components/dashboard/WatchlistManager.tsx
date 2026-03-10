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

  // Merge catalogue with live prices
  const watchlistAssets = watchlistIds.map(id => {
    const live = liveData.find(a => a.id === id);
    const cat  = ASSET_CATALOGUE.find(a => a.id === id);
    return live ?? (cat ? { ...cat, price: 0, change24h: 0, changePercent24h: 0, volume24h: 0, status: 'neutral' as const } : null);
  }).filter(Boolean) as Asset[];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1rem' }}>⭐</span>
          <span style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1rem' }}>My Watchlist</span>
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
              marginBottom: '0.75rem', fontFamily: 'DM Sans, sans-serif',
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
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'Urbanist' }}>{asset.symbol}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{asset.category}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
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
