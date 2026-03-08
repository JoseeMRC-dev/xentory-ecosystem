/**
 * useAuth — Xentory Bet
 * SSO via plain query params from Hub: ?uid=&uemail=&uname=&uplan=&uts=
 *
 * Module-level capture + sessionStorage fallback for iOS Safari / ITP
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { User, Plan } from '../types';

interface AuthContextType {
  user:        User | null;
  isLoading:   boolean;
  logout:      () => void;
  upgradePlan: (plan: Plan) => void;
}

const AuthContext   = createContext<AuthContextType | null>(null);
const HUB_URL       = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';
const USER_KEY      = 'xentory_bet_user';
const SESSION_KEY   = 'xentory_bet_session';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24h

// ── MODULE-LEVEL SSO CAPTURE ──────────────────────────────────────────────────
const _capturedSSO = (() => {
  try {
    const s = window.location.search;
    if (!s.includes('uid=')) return null;
    const qp = new URLSearchParams(s);
    const uid    = qp.get('uid');
    const uemail = qp.get('uemail');
    if (!uid || !uemail) return null;
    const sso = {
      uid,
      uemail,
      uname:  qp.get('uname') ?? uemail.split('@')[0],
      uplan:  qp.get('uplan') ?? 'free',
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...sso, capturedAt: Date.now() }));
    console.log('[Bet] SSO captured at module level:', uemail);
    return sso;
  } catch {
    return null;
  }
})();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]    = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    function buildUser(data: { uid: string; uemail: string; uname: string; uplan: string }): User {
      return {
        id:             data.uid,
        email:          data.uemail,
        name:           data.uname,
        plan:           (data.uplan as Plan) ?? 'free',
        telegramLinked: false,
        createdAt:      new Date().toISOString(),
      };
    }

    function saveUser(u: User) {
      try { localStorage.setItem(USER_KEY, JSON.stringify({ ...u, savedAt: Date.now() })); } catch { /**/ }
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...u, capturedAt: Date.now() })); } catch { /**/ }
    }

    function init() {
      console.log('[Bet] init — URL:', window.location.href);

      // ── 1. Module-level SSO ─────────────────────────────────────
      if (_capturedSSO) {
        const u = buildUser(_capturedSSO);
        saveUser(u);
        window.history.replaceState({}, '', window.location.pathname);
        console.log('[Bet] SSO OK (module capture):', u.email);
        setUser(u);
        setLoading(false);
        return;
      }

      // ── 2. SSO from URL (fallback) ──────────────────────────────
      try {
        const qp = new URLSearchParams(window.location.search);
        const uid    = qp.get('uid');
        const uemail = qp.get('uemail');
        if (uid && uemail) {
          const u = buildUser({
            uid, uemail,
            uname:  qp.get('uname') ?? uemail.split('@')[0],
            uplan:  qp.get('uplan') ?? 'free',
          });
          saveUser(u);
          window.history.replaceState({}, '', window.location.pathname);
          console.log('[Bet] SSO OK (URL fallback):', u.email);
          setUser(u);
          setLoading(false);
          return;
        }
      } catch { /**/ }

      // ── 3. localStorage cache ────────────────────────────────────
      try {
        const stored = localStorage.getItem(USER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const age = Date.now() - (parsed.savedAt ?? 0);
          if (age < CACHE_MAX_AGE && parsed.id && parsed.email) {
            console.log('[Bet] from localStorage:', parsed.email);
            setUser(parsed);
            setLoading(false);
            return;
          }
          localStorage.removeItem(USER_KEY);
        }
      } catch { /**/ }

      // ── 4. sessionStorage cache (iOS Safari / ITP fallback) ─────
      try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.id && parsed.email) {
            console.log('[Bet] from sessionStorage:', parsed.email);
            setUser(parsed);
            setLoading(false);
            return;
          }
          if (parsed.uid && parsed.uemail) {
            const u = buildUser(parsed);
            console.log('[Bet] from sessionStorage SSO:', u.email);
            setUser(u);
            setLoading(false);
            return;
          }
        }
      } catch { /**/ }

      // ── 5. No auth → Hub ─────────────────────────────────────────
      console.warn('[Bet] no auth → Hub');
      setLoading(false);
      window.location.href = HUB_URL;
    }

    init();
  }, []);

  const logout = useCallback(() => {
    // Clear all xentory keys across all platforms
    ['xentory_bet_user','xentory_market_user'].forEach(k => {
      try { localStorage.removeItem(k); } catch { /**/ }
    });
    ['xentory_bet_session','xentory_market_session'].forEach(k => {
      try { sessionStorage.removeItem(k); } catch { /**/ }
    });
    setUser(null);
    // Small delay so React can re-render before redirect
    setTimeout(() => { window.location.replace(HUB_URL); }, 50);
  }, []);

  const upgradePlan = useCallback((plan: Plan) => {
    setUser(u => {
      if (!u) return u;
      const updated = { ...u, plan };
      try { localStorage.setItem(USER_KEY, JSON.stringify({ ...updated, savedAt: Date.now() })); } catch { /**/ }
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
