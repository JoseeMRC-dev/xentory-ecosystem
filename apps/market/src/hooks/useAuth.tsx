/**
 * useAuth — Xentory Market
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
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

function sbUserToNexus(sbUser: any): User {
  return {
    id:             sbUser.id,
    email:          sbUser.email ?? '',
    name:           sbUser.user_metadata?.full_name ?? sbUser.user_metadata?.name ?? sbUser.email?.split('@')[0] ?? 'Usuario',
    plan:           'free' as Plan,
    telegramLinked: false,
    createdAt:      sbUser.created_at ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]    = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    async function init() {
      try {
        const params       = new URLSearchParams(window.location.search);
        const accessToken  = decodeURIComponent(params.get('sb_access')  ?? '');
        const refreshToken = decodeURIComponent(params.get('sb_refresh') ?? '');

        // Clean URL immediately
        if (accessToken) window.history.replaceState({}, '', window.location.pathname);

        // ── 1. Try SSO tokens from Hub ──────────────────────────────
        if (accessToken && refreshToken) {
          console.log('[Market] received SSO tokens, calling setSession...');
          const { data, error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });
          console.log('[Market] setSession result — user:', data.session?.user?.email ?? null, '| error:', error?.message ?? null);

          if (data.session?.user) {
            const u = sbUserToNexus(data.session.user);
            localStorage.setItem(USER_KEY, JSON.stringify(u));
            setUser(u);
            setLoading(false);
            return;
          }
          // setSession failed — try to use the token directly to get user
          if (accessToken) {
            const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
            console.log('[Market] getUser result:', userData.user?.email ?? null, userErr?.message ?? null);
            if (userData.user) {
              const u = sbUserToNexus(userData.user);
              localStorage.setItem(USER_KEY, JSON.stringify(u));
              setUser(u);
              setLoading(false);
              return;
            }
          }
        }

        // ── 2. Existing Supabase session ────────────────────────────
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Market] existing session:', session?.user?.email ?? null);
        if (session?.user) {
          const u = sbUserToNexus(session.user);
          localStorage.setItem(USER_KEY, JSON.stringify(u));
          setUser(u);
          setLoading(false);
          return;
        }

        // ── 3. Cached user in localStorage (avoid redirect loop) ────
        try {
          const stored = localStorage.getItem(USER_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.id && parsed?.email) {
              console.log('[Market] using cached user:', parsed.email);
              setUser(parsed);
              setLoading(false);
              return;
            }
          }
        } catch { /* */ }

        // ── 4. No auth at all → back to Hub ────────────────────────
        console.warn('[Market] no auth found, redirecting to Hub');
        setLoading(false);
        window.location.href = HUB_URL + '?redirect=market';

      } catch (e) {
        console.error('[Market] auth init error:', e);
        setLoading(false);
        window.location.href = HUB_URL + '?redirect=market';
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Market] auth event:', event);
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const u = sbUserToNexus(session.user);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        setUser(u);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    window.location.href = HUB_URL;
  }, []);

  const upgradePlan = useCallback((plan: Plan) => {
    setUser(u => u ? { ...u, plan } : u);
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
