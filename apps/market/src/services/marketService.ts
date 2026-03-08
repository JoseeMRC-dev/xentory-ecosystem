import type { Asset, PricePoint, TechnicalIndicators } from '../types';
import { MOCK_ASSETS } from '../constants';

// ─────────────────────────────────────────────────────────────────
// DATA SOURCES (all free, no API key required):
//
//  CRYPTO  — Binance WebSocket (wss://stream.binance.com)
//            + Binance REST    (https://api.binance.com/api/v3)
//
//  STOCKS  — Yahoo Finance v8 via allorigins.win CORS proxy
//            (no key needed, ~2000 req/day free)
//
//  FOREX   — exchangerate.host (free, no key for basic pairs)
//            or Frankfurter (ECB rates, always free)
//
// All prices update every 5 seconds via polling / WS push.
// ─────────────────────────────────────────────────────────────────

// ══════════════════════════════════════
// TYPES & STATE
// ══════════════════════════════════════
export type PriceCallback = (updates: Partial<Record<string, number>>) => void;

let liveAssets: Asset[] = MOCK_ASSETS.map(a => ({ ...a }));
const subscribers = new Set<PriceCallback>();
let wsConnected = false;
let ws: WebSocket | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

// ══════════════════════════════════════
// BINANCE — CRYPTO WEBSOCKET
// ══════════════════════════════════════
const BINANCE_WS  = 'wss://stream.binance.com:9443/stream';
const BINANCE_REST = 'https://api.binance.com/api/v3';

// Map our asset IDs → Binance symbols
const BINANCE_SYMBOLS: Record<string, string> = {
  'btc':  'BTCUSDT',
  'eth':  'ETHUSDT',
  'sol':  'SOLUSDT',
  'xrp':  'XRPUSDT',
  'bnb':  'BNBUSDT',
  'ada':  'ADAUSDT',
  'doge': 'DOGEUSDT',
  'avax': 'AVAXUSDT',
};

const BINANCE_STREAM_NAMES = Object.values(BINANCE_SYMBOLS)
  .map(s => `${s.toLowerCase()}@miniTicker`)
  .join('/');

function connectBinanceWS() {
  if (wsConnected) return;
  try {
    ws = new WebSocket(`${BINANCE_WS}?streams=${BINANCE_STREAM_NAMES}`);

    ws.onopen = () => {
      wsConnected = true;
      console.log('[Xentory Market] Binance WebSocket conectado ✓');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const data = msg.data;
        if (!data || data.e !== '24hrMiniTicker') return;

        const symbol  = data.s as string; // e.g. "BTCUSDT"
        const assetId = Object.entries(BINANCE_SYMBOLS).find(([, s]) => s === symbol)?.[0];
        if (!assetId) return;

        const newPrice = parseFloat(data.c); // close price
        const open24h  = parseFloat(data.o);
        const change   = newPrice - open24h;
        const changePct = (change / open24h) * 100;
        const vol = parseFloat(data.v) * newPrice; // volume in USD

        liveAssets = liveAssets.map(a => {
          if (a.id !== assetId) return a;
          return {
            ...a,
            price:            parseFloat(newPrice.toFixed(a.category === 'forex' ? 5 : 2)),
            change24h:        parseFloat(change.toFixed(2)),
            changePercent24h: parseFloat(changePct.toFixed(2)),
            volume24h:        Math.round(vol),
            lastUpdated:      Date.now(),
          };
        });

        // Notify subscribers
        notify({ [assetId]: newPrice });
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => {
      wsConnected = false;
      ws = null;
      // Retry after 5s
      setTimeout(connectBinanceWS, 5000);
    };

    ws.onclose = () => {
      wsConnected = false;
      ws = null;
      setTimeout(connectBinanceWS, 5000);
    };
  } catch (err) {
    console.warn('[Xentory Market] WebSocket no disponible, usando fallback');
    startPollingFallback();
  }
}

// ── Fetch initial crypto prices from REST ──
async function fetchInitialCryptoPrices() {
  try {
    const symbols = Object.values(BINANCE_SYMBOLS);
    const qs = encodeURIComponent(JSON.stringify(symbols));
    const res = await fetch(`${BINANCE_REST}/ticker/24hr?symbols=${qs}`);
    if (!res.ok) return;
    const data: any[] = await res.json();

    const updates: Partial<Record<string, number>> = {};
    data.forEach(ticker => {
      const assetId = Object.entries(BINANCE_SYMBOLS).find(([, s]) => s === ticker.symbol)?.[0];
      if (!assetId) return;
      const price    = parseFloat(ticker.lastPrice);
      const open24h  = parseFloat(ticker.openPrice);
      const change   = price - open24h;
      const changePct = (change / open24h) * 100;

      liveAssets = liveAssets.map(a => {
        if (a.id !== assetId) return a;
        return {
          ...a,
          price:            parseFloat(price.toFixed(2)),
          change24h:        parseFloat(change.toFixed(2)),
          changePercent24h: parseFloat(changePct.toFixed(2)),
          volume24h:        Math.round(parseFloat(ticker.quoteVolume)),
          high24h:          parseFloat(ticker.highPrice),
          low24h:           parseFloat(ticker.lowPrice),
          lastUpdated:      Date.now(),
        };
      });
      updates[assetId] = price;
    });
    notify(updates);
  } catch (err) {
    console.warn('[Xentory Market] REST inicial crypto fallido:', err);
  }
}

// ══════════════════════════════════════
// YAHOO FINANCE — STOCKS (via proxy)
// ══════════════════════════════════════
const YAHOO_SYMBOLS: Record<string, string> = {
  'nvda':  'NVDA',
  'aapl':  'AAPL',
  'tsla':  'TSLA',
  'msft':  'MSFT',
  'spx':   '^GSPC',
  'googl': 'GOOGL',
  'amzn':  'AMZN',
  'meta':  'META',
};

async function fetchStockPrices() {
  const ids = Object.keys(YAHOO_SYMBOLS);
  try {
    await Promise.all(ids.map(async (assetId) => {
      const symbol = YAHOO_SYMBOLS[assetId];
      // Use allorigins CORS proxy for Yahoo Finance
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return;
      const raw = await res.json();
      const data = JSON.parse(raw.contents);
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return;

      const price     = meta.regularMarketPrice ?? meta.previousClose;
      const prevClose = meta.previousClose ?? price;
      const change    = price - prevClose;
      const changePct = (change / prevClose) * 100;

      liveAssets = liveAssets.map(a => {
        if (a.id !== assetId) return a;
        return {
          ...a,
          price:            parseFloat(price.toFixed(2)),
          change24h:        parseFloat(change.toFixed(2)),
          changePercent24h: parseFloat(changePct.toFixed(2)),
          high24h:          meta.regularMarketDayHigh,
          low24h:           meta.regularMarketDayLow,
          volume24h:        meta.regularMarketVolume,
          lastUpdated:      Date.now(),
        };
      });
      notify({ [assetId]: price });
    }));
  } catch (err) {
    console.warn('[Xentory Market] Yahoo Finance fallido:', err);
  }
}

// ══════════════════════════════════════
// FOREX — Frankfurter (ECB, always free)
// ══════════════════════════════════════
const FOREX_PAIRS: Record<string, { from: string; to: string }> = {
  'eurusd': { from: 'EUR', to: 'USD' },
  'gbpusd': { from: 'GBP', to: 'USD' },
  'usdjpy': { from: 'USD', to: 'JPY' },
  'eurgbp': { from: 'EUR', to: 'GBP' },
};

async function fetchForexPrices() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,JPY,CHF', {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return;
    const data = await res.json();
    const rates = data.rates ?? {};

    const updates: Partial<Record<string, number>> = {};

    if (rates.USD) {
      liveAssets = liveAssets.map(a => a.id === 'eurusd' ? { ...a, price: parseFloat(rates.USD.toFixed(5)), lastUpdated: Date.now() } : a);
      updates['eurusd'] = rates.USD;
    }
    if (rates.GBP) {
      liveAssets = liveAssets.map(a => a.id === 'eurgbp' ? { ...a, price: parseFloat(rates.GBP.toFixed(5)), lastUpdated: Date.now() } : a);
      updates['eurgbp'] = rates.GBP;
    }

    // GBP/USD via cross rate
    if (rates.USD && rates.GBP) {
      const gbpusd = parseFloat((rates.USD / rates.GBP).toFixed(5));
      liveAssets = liveAssets.map(a => a.id === 'gbpusd' ? { ...a, price: gbpusd, lastUpdated: Date.now() } : a);
      updates['gbpusd'] = gbpusd;
    }
    notify(updates);
  } catch (err) {
    console.warn('[Xentory Market] Frankfurter forex fallido:', err);
  }
}

// ══════════════════════════════════════
// POLLING FALLBACK — simulated jitter
// ══════════════════════════════════════
function startPollingFallback() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    const updates: Partial<Record<string, number>> = {};
    liveAssets = liveAssets.map(asset => {
      const vol = asset.category === 'forex' ? 0.0008 : 0.003;
      const newPrice = asset.price * (1 + (Math.random() - 0.5) * vol);
      const rounded  = parseFloat(newPrice.toFixed(asset.category === 'forex' ? 5 : 2));
      updates[asset.id] = rounded;
      return { ...asset, price: rounded, lastUpdated: Date.now() };
    });
    notify(updates);
  }, 3000);
}

// ══════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════

/** Subscribe to live price updates */
export function subscribePrices(cb: PriceCallback): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function notify(updates: Partial<Record<string, number>>) {
  subscribers.forEach(cb => cb(updates));
}

/** Initialize all live data sources */
export async function initLiveData() {
  // 1. Fetch initial prices immediately
  await Promise.allSettled([
    fetchInitialCryptoPrices(),
    fetchStockPrices(),
    fetchForexPrices(),
  ]);

  // 2. Connect Binance WebSocket for real-time crypto
  connectBinanceWS();

  // 3. Poll stocks + forex every 30s (Yahoo/Frankfurter limits)
  setInterval(async () => {
    await Promise.allSettled([fetchStockPrices(), fetchForexPrices()]);
  }, 30_000);
}

/** Get current snapshot of all assets */
export function getLiveAssets(): Asset[] {
  return liveAssets;
}

export function getAssetById(id: string): Asset | undefined {
  return liveAssets.find(a => a.id === id);
}

/** Fetch Binance klines for chart history */
export async function fetchPriceHistory(assetId: string, interval = '4h', limit = 60): Promise<PricePoint[]> {
  const symbol = BINANCE_SYMBOLS[assetId];
  if (!symbol) return generatePriceHistory(getAssetById(assetId) ?? liveAssets[0], limit);

  try {
    const res = await fetch(
      `${BINANCE_REST}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error('klines failed');
    const raw: any[][] = await res.json();
    return raw.map(k => ({
      timestamp: k[0],
      open:      parseFloat(k[1]),
      high:      parseFloat(k[2]),
      low:       parseFloat(k[3]),
      close:     parseFloat(k[4]),
      volume:    parseFloat(k[5]),
    }));
  } catch {
    return generatePriceHistory(getAssetById(assetId) ?? liveAssets[0], limit);
  }
}

/** Keep backward-compat with old generatePriceHistory call */
export function generatePriceHistory(asset: Asset, points = 60): PricePoint[] {
  const history: PricePoint[] = [];
  let price = asset.price * 0.85;
  const now = Date.now();
  const interval = 4 * 60 * 60 * 1000;

  for (let i = points; i >= 0; i--) {
    const volatility = asset.category === 'forex' ? 0.004 : 0.025;
    const trend = Math.sin(i / 8) * 0.01;
    const move  = (Math.random() - 0.48 + trend) * volatility;
    const open  = price;
    price = price * (1 + move);
    const high = Math.max(open, price) * (1 + Math.random() * 0.008);
    const low  = Math.min(open, price) * (1 - Math.random() * 0.008);
    history.push({
      timestamp: now - i * interval,
      open:   parseFloat(open.toFixed(asset.category === 'forex' ? 5 : 2)),
      high:   parseFloat(high.toFixed(asset.category === 'forex' ? 5 : 2)),
      low:    parseFloat(low.toFixed(asset.category === 'forex' ? 5 : 2)),
      close:  parseFloat(price.toFixed(asset.category === 'forex' ? 5 : 2)),
      volume: Math.round(asset.volume24h * (0.02 + Math.random() * 0.06)),
    });
  }
  return history;
}

// Technical indicators — unchanged, fully local computation
export function computeTechnicalIndicators(history: PricePoint[]): TechnicalIndicators {
  const closes = history.map(p => p.close);
  const n = closes.length;

  let gains = 0, losses = 0;
  for (let i = n - 14; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  const rs  = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  const ema = (period: number) => {
    const k = 2 / (period + 1);
    let val = closes[n - period];
    for (let i = n - period + 1; i < n; i++) val = closes[i] * k + val * (1 - k);
    return val;
  };

  const ema20  = ema(20);
  const ema50  = n >= 50 ? ema(50) : ema20 * 0.98;
  const ema200 = n >= 60 ? ema(Math.min(60, n)) * 0.97 : ema50 * 0.95;

  const slice20 = closes.slice(-20);
  const mean    = slice20.reduce((a, b) => a + b, 0) / 20;
  const stdDev  = Math.sqrt(slice20.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20);

  const ema12       = ema(12);
  const ema26       = n >= 26 ? ema(26) : ema12 * 0.98;
  const macdValue   = ema12 - ema26;
  const macdSignal  = macdValue * 0.85;
  const volumeAvg20 = history.slice(-20).reduce((a, b) => a + b.volume, 0) / 20;
  const atr         = history.slice(-14).reduce((sum, p) => sum + (p.high - p.low), 0) / 14;

  return {
    rsi: parseFloat(rsi.toFixed(2)),
    macd: {
      value:     parseFloat(macdValue.toFixed(4)),
      signal:    parseFloat(macdSignal.toFixed(4)),
      histogram: parseFloat((macdValue - macdSignal).toFixed(4)),
    },
    bollingerBands: {
      upper:  parseFloat((mean + 2 * stdDev).toFixed(4)),
      middle: parseFloat(mean.toFixed(4)),
      lower:  parseFloat((mean - 2 * stdDev).toFixed(4)),
    },
    ema20:       parseFloat(ema20.toFixed(4)),
    ema50:       parseFloat(ema50.toFixed(4)),
    ema200:      parseFloat(ema200.toFixed(4)),
    volumeAvg20: Math.round(volumeAvg20),
    atr:         parseFloat(atr.toFixed(4)),
  };
}

export function formatPrice(price: number, category: string): string {
  if (category === 'forex') return price.toFixed(5);
  if (price >= 1000) return price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)    return price.toFixed(2);
  return price.toFixed(5);
}

export function formatVolume(vol: number): string {
  if (vol >= 1e12) return `${(vol / 1e12).toFixed(2)}T`;
  if (vol >= 1e9)  return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6)  return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3)  return `${(vol / 1e3).toFixed(2)}K`;
  return vol.toString();
}

// Auto-init on import — export promise so consumers can await initial data
export const dataReady: Promise<void> = initLiveData().catch(() => startPollingFallback());
