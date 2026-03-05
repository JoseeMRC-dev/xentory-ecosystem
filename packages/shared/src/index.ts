// ── SHARED TYPES ──
export type Plan = 'free' | 'pro' | 'elite';
export type Platform = 'market' | 'bets' | 'both';

// ── SSO TOKEN ── (shared between hub, market and bet)
export interface SSOToken {
  token: string;
  userId: string;
  email: string;
  name: string;
  plan: { market: Plan; bets: Plan };
  expiresAt: string;
}

// ── PLATFORM URLS ──
export const PLATFORM_PORTS = {
  hub:    4000,
  market: 3000,
  bet:    3001,
} as const;

// ── PLAN COLORS ──
export const PLAN_COLORS: Record<Plan, string> = {
  free:  '#6b7294',
  pro:   '#c9a84c',
  elite: '#00d4ff',
};

export const PLAN_LABELS: Record<Plan, string> = {
  free:  'Explorador',
  pro:   'Pro',
  elite: 'Elite',
};

// ── SSO HELPERS ──
export const SSO_KEY   = 'nexus_sso';
export const USER_KEY  = 'nexus_user';
export const TOKEN_TTL = 5 * 60 * 1000; // 5 min

export function createSSOToken(userId: string, email: string, name: string, plan: { market: Plan; bets: Plan }): SSOToken {
  return {
    token: `sso_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId,
    email,
    name,
    plan,
    expiresAt: new Date(Date.now() + TOKEN_TTL).toISOString(),
  };
}

export function isTokenValid(token: SSOToken): boolean {
  return new Date(token.expiresAt) > new Date();
}

export function parseSSOFromUrl(): SSOToken | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('sso');
    if (!raw) return null;
    const token: SSOToken = JSON.parse(atob(raw));
    if (!isTokenValid(token)) return null;
    return token;
  } catch {
    return null;
  }
}

export function encodeSSOToken(token: SSOToken): string {
  return btoa(JSON.stringify(token));
}
