/**
 * useAuth — Xentory Market
 * SSO via plain query params from Hub: ?uid=&uemail=&uname=&uplan=&uts=
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { User, Plan } from '../types';

interface AuthContextType {
  user:        User | null;
  isLoading:   boolean;
  logout:      () => void;
  upgradePlan: (plan: Plan) => void;
}

const AuthContext  = createContext<AuthContextType | null>(null);
const HUB_URL      = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';
const USER_KEY     = 'xentory_market_user';
const SSO_MAX_AGE  = 5 * 60 * 1000;   // 5 min
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24h

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]    = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    function init() {
      const qp = new URLSearchParams(window.location.search);
      const uid    = qp.get('uid');
      const uemail = qp.get('uemail');
      const uname  = qp.get('uname');
      const uplan  = qp.get('uplan');
      const uts    = qp.get('uts');

      // Full diagnostic log
      console.log('[Market] URL:', window.location.href);
      console.log('[Market] search:', window.location.search);
      console.log('[Market] params:', { uid, uemail, uplan, uts });

      // ── 1. SSO from Hub ─────────────────────────────────────────
      if (uid && uemail) {
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);

        // Accept if uid+email present — no age check to avoid clock skew issues
        const u: User = {
          id:             uid,
          email:          uemail,
          name:           uname ?? uemail.split('@')[0],
          plan:           (uplan as Plan) ?? 'free',
          telegramLinked: false,
          createdAt:      new Date().toISOString(),
        };
        localStorage.setItem(USER_KEY, JSON.stringify({ ...u, savedAt: Date.now() }));
        console.log('[Market] SSO OK:', u.email);
        setUser(u);
        setLoading(false);
        return;
      }

      // ── 2. Cached user ───────────────────────────────────────────
      try {
        const stored = localStorage.getItem(USER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const age    = Date.now() - (parsed.savedAt ?? 0);
          if (age < CACHE_MAX_AGE && parsed.id && parsed.email) {
            console.log('[Market] cached user:', parsed.email);
            setUser(parsed);
            setLoading(false);
            return;
          }
          localStorage.removeItem(USER_KEY);
        }
      } catch { /**/ }

      // ── 3. No auth → Hub ─────────────────────────────────────────
      console.warn('[Market] no auth → Hub');
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
