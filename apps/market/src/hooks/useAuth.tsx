/**
 * useAuth — Xentory Market
 * Auth via Supabase session passed as URL params from Hub
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
const HUB_URL    = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';
const REDIRECT   = 'market';

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
        const accessToken  = decodeURIComponent(params.get('sb_access') ?? '');
        const refreshToken = decodeURIComponent(params.get('sb_refresh') ?? '');

        // Clean URL immediately regardless
        if (accessToken) window.history.replaceState({}, '', window.location.pathname);

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });
          if (data.session?.user) {
            console.log('[Xentory Market] SSO OK:', data.session.user.email);
            setUser(sbUserToNexus(data.session.user));
            setLoading(false);
            return;
          }
          if (error) console.warn('[Xentory Market] setSession error:', error.message);
        }

        // Existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(sbUserToNexus(session.user));
          setLoading(false);
          return;
        }

        // No session → back to Hub
        setLoading(false);
        window.location.href = HUB_URL + '?redirect=' + REDIRECT;
      } catch (e) {
        console.error('[Xentory Market] auth error:', e);
        setLoading(false);
        window.location.href = HUB_URL + '?redirect=' + REDIRECT;
      }
    }

    init();

    // Only react to explicit sign-out events, not initial session detection
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(sbUserToNexus(session.user));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
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
