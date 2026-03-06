/**
 * AuthContext — autenticación real con Supabase
 *
 * Flujos implementados:
 * - Email + contraseña  (bcrypt en Supabase, nunca vemos la contraseña)
 * - Google OAuth        (PKCE flow, token nunca en URL)
 * - Magic Link          (enlace de un solo uso, TTL 1h)
 *
 * Si VITE_SUPABASE_URL no está configurado → modo mock para desarrollo local.
 */

import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react';
import { getSupabase } from '../lib/supabase';
import type { User, Plan, SSOToken } from '../types';

interface AuthContextType {
  user:             User | null;
  isLoading:        boolean;
  ssoToken:         SSOToken | null;
  login:            (email: string, password: string) => Promise<void>;
  loginWithGoogle:  () => Promise<void>;
  register:         (email: string, password: string, name: string) => Promise<void>;
  sendMagicLink:    (email: string) => Promise<void>;
  logout:           () => Promise<void>;
  upgradeMarket:    (plan: Plan) => void;
  upgradeBets:      (plan: Plan) => void;
  generateSSOToken: (platform: 'market' | 'bets') => SSOToken;
  launchPlatform:   (platform: 'market' | 'bets') => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SSO_KEY     = 'xentory_sso_token';
const USER_KEY    = 'xentory_user';

const PLATFORM_URLS: Record<string, string> = {
  market: import.meta.env.VITE_MARKET_URL ?? 'http://localhost:3000',
  bets:   import.meta.env.VITE_BETS_URL   ?? 'http://localhost:3001',
};

// ── Helpers ───────────────────────────────────────────────────────────────
function sbToNexus(sbUser: any, prev?: User | null): User {
  return {
    id:    sbUser.id,
    email: sbUser.email ?? '',
    name:  sbUser.user_metadata?.full_name ?? sbUser.user_metadata?.name
        ?? prev?.name ?? sbUser.email?.split('@')[0] ?? 'Usuario',
    avatar:           sbUser.user_metadata?.avatar_url,
    subscriptions:    prev?.subscriptions ?? { market: 'free', bets: 'free' },
    telegramLinked:   prev?.telegramLinked   ?? false,
    telegramUsername: prev?.telegramUsername,
    createdAt:        sbUser.created_at ?? new Date().toISOString(),
    lastLogin:        new Date().toISOString(),
  };
}

function loadStoredUser(): User | null {
  try { const s = localStorage.getItem(USER_KEY); return s ? JSON.parse(s) : null; }
  catch { return null; }
}

// Mock para desarrollo sin Supabase
const MOCK_BASE: User = {
  id: 'mock_001', email: 'demo@xentory.io', name: 'Demo User',
  subscriptions: { market: 'free', bets: 'free' },
  telegramLinked: false, createdAt: '2025-01-01T00:00:00Z',
  lastLogin: new Date().toISOString(),
};
const delay = (ms = 1000) => new Promise(r => setTimeout(r, ms));

// ──────────────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(loadStoredUser);
  const [isLoading, setLoading] = useState(false);
  const [ssoToken, setSso]      = useState<SSOToken | null>(null);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else      localStorage.removeItem(USER_KEY);
  }, [user]);

  // Bootstrap session on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      const sb = await getSupabase();
      if (!sb) { setLoading(false); return; }

      const { data: { session } } = await sb.auth.getSession();
      if (session?.user && alive) setUser(sbToNexus(session.user, loadStoredUser()));

      const { data: { subscription } } = sb.auth.onAuthStateChange((_e: string, sess: any) => {
        if (!alive) return;
        if (sess?.user) setUser(sbToNexus(sess.user, loadStoredUser()));
        else setUser(null);
      });

      if (alive) setLoading(false);
      return () => subscription.unsubscribe();
    })();
    return () => { alive = false; };
  }, []);

  // ── Login email/password ───────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const sb = await getSupabase();
      if (!sb) { await delay(); setUser({ ...MOCK_BASE, email }); return; }
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (data.user) setUser(sbToNexus(data.user, loadStoredUser()));
    } finally { setLoading(false); }
  }, []);

  // ── Google OAuth ───────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    const sb = await getSupabase();
    if (!sb) {
      setLoading(true);
      await delay(900);
      setUser({ ...MOCK_BASE, name: 'Google User' });
      setLoading(false);
      return;
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw new Error(error.message);
    // Browser redirects to Google — nothing else runs
  }, []);

  // ── Register ───────────────────────────────────────────────────────────
  const register = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const sb = await getSupabase();
      if (!sb) {
        await delay(1200);
        setUser({ ...MOCK_BASE, email, name, createdAt: new Date().toISOString() });
        return;
      }
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw new Error(error.message);
      // Email confirmation pending
      if (data.user && !data.session) throw new Error('CONFIRM_EMAIL');
      if (data.user) setUser(sbToNexus(data.user));
    } finally { setLoading(false); }
  }, []);

  // ── Magic Link ─────────────────────────────────────────────────────────
  const sendMagicLink = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const sb = await getSupabase();
      if (!sb) { await delay(800); return; }
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) throw new Error(error.message);
    } finally { setLoading(false); }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const sb = await getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null); setSso(null);
    localStorage.removeItem(SSO_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // ── Plan helpers ───────────────────────────────────────────────────────
  const upgradeMarket = useCallback((plan: Plan) =>
    setUser(u => u ? { ...u, subscriptions: { ...u.subscriptions, market: plan } } : u), []);
  const upgradeBets = useCallback((plan: Plan) =>
    setUser(u => u ? { ...u, subscriptions: { ...u.subscriptions, bets: plan } } : u), []);

  // ── SSO for sub-apps ───────────────────────────────────────────────────
  const generateSSOToken = useCallback((platform: 'market' | 'bets'): SSOToken => {
    if (!user) throw new Error('Not authenticated');
    const rnd = crypto.getRandomValues(new Uint32Array(2));
    const token: SSOToken = {
      token:     `sso_${Date.now()}_${rnd[0].toString(36)}${rnd[1].toString(36)}`,
      userId:    user.id,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      platform,
    };
    setSso(token);
    localStorage.setItem(SSO_KEY, JSON.stringify(token));
    return token;
  }, [user]);

  const launchPlatform = useCallback((platform: 'market' | 'bets') => {
    if (!user) return;
    try {
      // Encode the full user payload in the URL so cross-domain SSO works
      // without relying on shared localStorage (different domains can't share it)
      const payload = {
        id:            user.id,
        email:         user.email,
        name:          user.name,
        subscriptions: user.subscriptions,
        telegramLinked: user.telegramLinked,
        createdAt:     user.createdAt,
        exp:           Date.now() + 5 * 60_000, // 5 min expiry
      };
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
      const url = `${PLATFORM_URLS[platform]}?xsso=${encoded}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(PLATFORM_URLS[platform], '_blank', 'noopener,noreferrer');
    }
  }, [user, generateSSOToken]);

  return (
    <AuthContext.Provider value={{
      user, isLoading, ssoToken,
      login, loginWithGoogle, register, sendMagicLink, logout,
      upgradeMarket, upgradeBets, generateSSOToken, launchPlatform,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
