import type { PlanConfig, Asset } from '../types';

// ── PLANS ──
export const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Explorador',
    price: 0,
    period: 'Gratis para siempre',
    description: 'Empieza a entender los mercados',
    color: '#6b7294',
    features: [
      { label: '3 activos en watchlist', included: true },
      { label: 'Análisis rápido IA (Flash)', included: true },
      { label: 'Dashboard de precios básico', included: true },
      { label: 'Indicadores técnicos básicos', included: true },
      { label: 'Análisis Pro (Google Grounding)', included: false },
      { label: 'Alertas de precio', included: false },
      { label: 'Canal Telegram premium', included: false },
      { label: 'Historial de análisis', included: false },
      { label: 'Activos Forex', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    period: 'por mes',
    description: 'Para el inversor serio',
    color: '#c9a84c',
    popular: true,
    features: [
      { label: 'Activos ilimitados en watchlist', included: true },
      { label: 'Análisis Pro con Google Grounding', included: true, highlight: true },
      { label: 'Todos los indicadores técnicos', included: true },
      { label: 'Alertas de precio ilimitadas', included: true },
      { label: 'Canal Telegram PRO', included: true, highlight: true },
      { label: 'Historial de análisis (30 días)', included: true },
      { label: 'Cripto + Bolsa + Forex', included: true },
      { label: 'Señales automáticas Telegram', included: true },
      { label: 'Soporte prioritario', included: false },
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 59,
    period: 'por mes',
    description: 'Acceso total sin límites',
    color: '#00d4ff',
    features: [
      { label: 'Todo el Plan Pro incluido', included: true },
      { label: 'Análisis a demanda ilimitado', included: true, highlight: true },
      { label: 'Canal Telegram ELITE exclusivo', included: true, highlight: true },
      { label: 'Historial ilimitado', included: true },
      { label: 'API de datos para uso personal', included: true },
      { label: 'Alertas multi-activo avanzadas', included: true },
      { label: 'Informes PDF semanales', included: true },
      { label: 'Soporte prioritario 24/7', included: true },
      { label: 'Acceso anticipado a funciones', included: true },
    ],
  },
];

// ── MOCK ASSETS ──
export const MOCK_ASSETS: Asset[] = [
  // CRYPTO
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin', category: 'crypto', price: 95240, change24h: 2280, changePercent24h: 2.45, volume24h: 38500000000, marketCap: 1870000000000, high24h: 96100, low24h: 92800, status: 'bullish' },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', category: 'crypto', price: 3182, change24h: 57, changePercent24h: 1.82, volume24h: 18200000000, marketCap: 382000000000, high24h: 3240, low24h: 3105, status: 'bullish' },
  { id: 'sol', symbol: 'SOL', name: 'Solana', category: 'crypto', price: 198.5, change24h: -1.8, changePercent24h: -0.9, volume24h: 4100000000, marketCap: 93000000000, high24h: 204, low24h: 195, status: 'neutral' },
  { id: 'xrp', symbol: 'XRP', name: 'XRP', category: 'crypto', price: 2.41, change24h: 0.12, changePercent24h: 5.24, volume24h: 9800000000, marketCap: 138000000000, high24h: 2.48, low24h: 2.28, status: 'bullish' },
  { id: 'bnb', symbol: 'BNB', name: 'BNB', category: 'crypto', price: 420, change24h: 4.6, changePercent24h: 1.1, volume24h: 1900000000, marketCap: 61000000000, high24h: 428, low24h: 413, status: 'neutral' },
  { id: 'ada', symbol: 'ADA', name: 'Cardano', category: 'crypto', price: 0.89, change24h: -0.06, changePercent24h: -6.3, volume24h: 1200000000, marketCap: 31000000000, high24h: 0.96, low24h: 0.87, status: 'bearish' },
  // STOCKS
  { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA', category: 'stocks', price: 142.3, change24h: 4.28, changePercent24h: 3.1, volume24h: 320000000, high24h: 144.5, low24h: 138.2, status: 'bullish' },
  { id: 'aapl', symbol: 'AAPL', name: 'Apple', category: 'stocks', price: 213.4, change24h: 1.28, changePercent24h: 0.6, volume24h: 58000000, high24h: 214.9, low24h: 211.5, status: 'neutral' },
  { id: 'tsla', symbol: 'TSLA', name: 'Tesla', category: 'stocks', price: 258.1, change24h: -3.14, changePercent24h: -1.2, volume24h: 112000000, high24h: 265.4, low24h: 255.8, status: 'bearish' },
  { id: 'msft', symbol: 'MSFT', name: 'Microsoft', category: 'stocks', price: 415.6, change24h: 3.32, changePercent24h: 0.81, volume24h: 24000000, high24h: 418.2, low24h: 412.1, status: 'bullish' },
  { id: 'amzn', symbol: 'AMZN', name: 'Amazon', category: 'stocks', price: 198.9, change24h: -1.8, changePercent24h: -0.9, volume24h: 43000000, high24h: 201.5, low24h: 197.2, status: 'neutral' },
  { id: 'googl', symbol: 'GOOGL', name: 'Alphabet', category: 'stocks', price: 174.8, change24h: 2.1, changePercent24h: 1.22, volume24h: 27000000, high24h: 176.1, low24h: 172.5, status: 'bullish' },
  // FOREX
  { id: 'eurusd', symbol: 'EUR/USD', name: 'Euro / Dólar', category: 'forex', price: 1.0842, change24h: 0.0018, changePercent24h: 0.17, volume24h: 0, high24h: 1.0868, low24h: 1.0821, status: 'neutral' },
  { id: 'gbpusd', symbol: 'GBP/USD', name: 'Libra / Dólar', category: 'forex', price: 1.2641, change24h: -0.0032, changePercent24h: -0.25, volume24h: 0, high24h: 1.2691, low24h: 1.2628, status: 'bearish' },
  { id: 'usdjpy', symbol: 'USD/JPY', name: 'Dólar / Yen', category: 'forex', price: 149.82, change24h: 0.54, changePercent24h: 0.36, volume24h: 0, high24h: 150.21, low24h: 149.18, status: 'bullish' },
  { id: 'xauusd', symbol: 'XAU/USD', name: 'Oro / Dólar', category: 'forex', price: 2041.5, change24h: 4.1, changePercent24h: 0.20, volume24h: 0, high24h: 2048.0, low24h: 2034.2, status: 'neutral' },
];

// ── GEMINI MODELS ──
export const GEMINI_FLASH = 'gemini-2.0-flash';
export const GEMINI_PRO = 'gemini-2.5-pro';

// ── TIMEFRAMES ──
export const TIMEFRAMES = ['1H', '4H', '1D', '1W', '1M'] as const;

// ── SIGNAL LABELS ──
export const SIGNAL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  strong_buy:  { label: 'Compra Fuerte', color: '#00ff88', bg: 'rgba(0,255,136,0.1)' },
  buy:         { label: 'Comprar',       color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  neutral:     { label: 'Neutral',       color: '#6b7294', bg: 'rgba(107,114,148,0.1)' },
  sell:        { label: 'Vender',        color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  strong_sell: { label: 'Venta Fuerte',  color: '#ff4455', bg: 'rgba(255,68,85,0.1)' },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  bullish: { label: 'Alcista', color: '#00ff88', emoji: '🟢' },
  neutral: { label: 'Neutral', color: '#f59e0b', emoji: '🟡' },
  bearish: { label: 'Bajista', color: '#ff4455', emoji: '🔴' },
};

export const CATEGORY_LABELS: Record<string, string> = {
  crypto: 'Criptomonedas',
  stocks: 'Bolsa',
  forex: 'Forex',
};
