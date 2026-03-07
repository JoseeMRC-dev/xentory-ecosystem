/**
 * useAuth — Xentory Market
 * SSO via URL hash: #xsso=<base64({"a":access,"r":refresh})>
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
const USER_KEY = 'xentory_bet_user';

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
        // ── 1. Hash SSO from Hub: #xsso=<base64> ──────────────────
        const hash = window.location.hash;
        const match = hash.match(/[#&]xsso=([^&]+)/);
        if (match) {
          // Clean hash immediately so it's not reused on refresh
          window.history.replaceState({}, '', window.location.pathname);
          try {
            const { a: accessToken, r: refreshToken } = JSON.parse(atob(match[1]));
            console.log('[Bet] hash SSO found, calling setSession...');
            const { data, error } = await supabase.auth.setSession({
              access_token:  accessToken,
              refresh_token: refreshToken,
            });
            console.log('[Bet] setSession:', data.session?.user?.email ?? null, '| error:', error?.message ?? null);
            if (data.session?.user) {
              const u = sbUserToNexus(data.session.user);
              localStorage.setItem(USER_KEY, JSON.stringify(u));
              setUser(u);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('[Bet] hash SSO parse error:', e);
          }
        }

        // ── 2. Existing Supabase session ────────────────────────────
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Bet] existing session:', session?.user?.email ?? null);
        if (session?.user) {
          const u = sbUserToNexus(session.user);
          localStorage.setItem(USER_KEY, JSON.stringify(u));
          setUser(u);
          setLoading(false);
          return;
        }

        // ── 3. Cached user (valid repeat visit) ────────────────────
        const stored = localStorage.getItem(USER_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.id && parsed?.email) {
              console.log('[Bet] cached user:', parsed.email);
              // Verify session is still alive
              const { data: { session: s2 } } = await supabase.auth.getSession();
              if (s2?.user) {
                setUser(parsed);
                setLoading(false);
                return;
              }
              // Session expired — clear cache
              localStorage.removeItem(USER_KEY);
            }
          } catch { /**/ }
        }

        // ── 4. No auth → back to Hub ────────────────────────────────
        console.warn('[Bet] no auth, redirecting to Hub');
        setLoading(false);
        window.location.href = HUB_URL;

      } catch (e) {
        console.error('[Bet] init error:', e);
        setLoading(false);
        window.location.href = HUB_URL;
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Bet] auth event:', event);
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
