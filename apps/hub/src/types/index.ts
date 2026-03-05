// ── USER & AUTH (SSO unificado) ──
export type Plan = 'free' | 'pro' | 'elite';
export type Platform = 'market' | 'bets' | 'both';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscriptions: {
    market: Plan;
    bets: Plan;
  };
  telegramLinked: boolean;
  telegramUsername?: string;
  createdAt: string;
  lastLogin: string;
}

// ── SSO TOKEN ──
export interface SSOToken {
  token: string;
  userId: string;
  expiresAt: string;
  platform: Platform;
}

// ── BLOG ──
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: 'crypto' | 'stocks' | 'forex' | 'sports' | 'platform';
  tags: string[];
  author: string;
  publishedAt: string;
  readTime: number;
  imageEmoji: string;
  featured?: boolean;
}

// ── PLANS COMPARISON ──
export interface PlatformPlan {
  id: Plan;
  name: string;
  price: number;
  yearlyPrice: number;
  platform: 'market' | 'bets';
  color: string;
  popular?: boolean;
  features: { label: string; included: boolean; highlight?: boolean }[];
}

// ── SUBSCRIPTION STATUS ──
export interface SubscriptionStatus {
  platform: 'market' | 'bets';
  plan: Plan;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  renewsAt?: string;
  cancelledAt?: string;
}

// ── NOTIFICATIONS ──
export interface HubNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'promo';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  cta?: { label: string; href: string };
}

// ── STATS (dashboard) ──
export interface UserStats {
  marketAnalysesRun: number;
  betsAnalysed: number;
  alertsTriggered: number;
  telegramSignalsReceived: number;
  memberSince: string;
}
