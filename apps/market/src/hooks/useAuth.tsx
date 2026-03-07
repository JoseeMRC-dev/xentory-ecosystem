/**
 * useAuth — Xentory Market
 * SSO: Hub passes user as ?xsso=<base64(JSON)>
 * No Supabase token exchange needed.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { User, Plan } from '../types';

interface AuthContextType {
  user:        User | null;
  isLoading:   boolean;
  logout:      () => void;
  upgradePlan: (plan: Plan) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const HUB_URL  = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';
const USER_KEY = 'xentory_market_user';
const MAX_AGE  = 5 * 60 * 1000; // 5 min — SSO payload TTL

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]    = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    function init() {
      // ── 1. SSO payload from Hub (?xsso=) ───────────────────────
      const qp  = new URLSearchParams(window.location.search);
      const sso = qp.get('xsso');

      if (sso) {
        window.history.replaceState({}, '', window.location.pathname);
        try {
          const data = JSON.parse(atob(decodeURIComponent(sso)));
          const age  = Date.now() - (data.ts ?? 0);
          console.log('[Market] SSO payload:', data.email, '| age:', Math.round(age/1000) + 's');

          if (age < MAX_AGE && data.id && data.email) {
            const u: User = {
              id:             data.id,
              email:          data.email,
              name:           data.name ?? data.email.split('@')[0],
              plan:           data.plan ?? 'free',
              telegramLinked: false,
              createdAt:      new Date().toISOString(),
            };
            localStorage.setItem(USER_KEY, JSON.stringify({ ...u, savedAt: Date.now() }));
            setUser(u);
            setLoading(false);
            return;
          }
          console.warn('[Market] SSO payload expired or invalid');
        } catch (e) {
          console.error('[Market] SSO parse error:', e);
        }
      }

      // ── 2. Cached session (returning user) ─────────────────────
      try {
        const stored = localStorage.getItem(USER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const age    = Date.now() - (parsed.savedAt ?? 0);
          // Cache valid for 24h
          if (age < 24 * 60 * 60 * 1000 && parsed.id && parsed.email) {
            console.log('[Market] cached user:', parsed.email);
            setUser(parsed);
            setLoading(false);
            return;
          }
          localStorage.removeItem(USER_KEY);
        }
      } catch { /**/ }

      // ── 3. No auth → Hub ────────────────────────────────────────
      console.warn('[Market] no auth, going to Hub');
      setLoading(false);
      window.location.href = HUB_URL;
    }

    init();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
    window.location.href = HUB_URL;
  }, []);

  const upgradePlan = useCallback((plan: Plan) => {
    setUser(u => {
      if (!u) return u;
      const updated = { ...u, plan };
      localStorage.setItem(USER_KEY, JSON.stringify({ ...updated, savedAt: Date.now() }));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, upgradePlan }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
 
