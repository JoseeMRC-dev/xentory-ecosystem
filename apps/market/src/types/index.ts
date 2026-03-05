// ── USER & AUTH ──
export type Plan = 'free' | 'pro' | 'elite';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: Plan;
  planExpiresAt?: string;
  telegramLinked: boolean;
  createdAt: string;
}

// ── MARKET DATA ──
export type AssetCategory = 'crypto' | 'stocks' | 'forex';
export type MarketStatus = 'bullish' | 'neutral' | 'bearish';
export type SignalStrength = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap?: number;
  high24h: number;
  low24h: number;
  status: MarketStatus;
  logoUrl?: string;
}

export interface PricePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  ema20: number;
  ema50: number;
  ema200: number;
  volumeAvg20: number;
  atr: number;
}

// ── AI ANALYSIS ──
export type AnalysisPlanTier = 'flash' | 'pro';

export interface AIAnalysis {
  id: string;
  assetId: string;
  assetSymbol: string;
  tier: AnalysisPlanTier;
  signal: SignalStrength;
  confidence: number; // 0-100
  summary: string;
  technicalContext: string;
  macroContext?: string;
  risks: string[];
  opportunities: string[];
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  timeframe: string;
  createdAt: string;
}

// ── WATCHLIST ──
export interface WatchlistItem {
  assetId: string;
  addedAt: string;
  alertPrice?: number;
  notes?: string;
}

// ── PLANS ──
export interface PlanFeature {
  label: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanConfig {
  id: Plan;
  name: string;
  price: number;
  period: string;
  description: string;
  features: PlanFeature[];
  stripeProductId?: string;
  stripePriceId?: string;
  color: string;
  popular?: boolean;
}

// ── TELEGRAM ──
export interface TelegramSignal {
  id: string;
  type: 'market' | 'alert' | 'analysis';
  assetSymbol: string;
  assetCategory: AssetCategory;
  signal: SignalStrength;
  message: string;
  confidence: number;
  sentAt: string;
}

// ── ALERTS ──
export interface PriceAlert {
  id: string;
  assetId: string;
  assetSymbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
}

// ── UI STATE ──
export type TimeframeOption = '1H' | '4H' | '1D' | '1W' | '1M';
export type ViewMode = 'grid' | 'list';

export interface MarketFilter {
  category: AssetCategory | 'all';
  status: MarketStatus | 'all';
  sortBy: 'name' | 'price' | 'change' | 'volume';
  sortDir: 'asc' | 'desc';
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}
