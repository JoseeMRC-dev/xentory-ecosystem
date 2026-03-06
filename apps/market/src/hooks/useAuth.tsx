/**
 * useAuth — Xentory Market
 * Auth via Supabase session passed as URL params from Hub
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Plan } from '../types';

interface AuthContextType {
  user:        User | null;
  isLoading:   boolean;
  logout:      () => void;
  upgradePlan: (plan: Plan) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const HUB_URL = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';

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

  useEffect(() => {
    async function init() {
      try {
        const params       = new URLSearchParams(window.location.search);
        const accessToken  = params.get('sb_access');
        const refreshToken = params.get('sb_refresh');

        if (accessToken && refreshToken) {
          // Set the session from Hub's tokens
          const { data, error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });
          // Clean URL immediately
          window.history.replaceState({}, '', window.location.pathname);
          if (data.session?.user) {
            console.log('[Xentory Market] SSO login OK:', data.session.user.email);
            setUser(sbUserToNexus(data.session.user));
            setLoading(false);
            return;
          }
          if (error) console.warn('[Xentory Market] setSession error:', error.message);
        }

        // Check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(sbUserToNexus(session.user));
          setLoading(false);
          return;
        }

        // No session → back to Hub
        setLoading(false);
        setTimeout(() => { window.location.href = HUB_URL + '?redirect=market'; }, 300);
      } catch (e) {
        console.error('[Xentory Market] auth init error:', e);
        setLoading(false);
        setTimeout(() => { window.location.href = HUB_URL + '?redirect=market'; }, 300);
      }
    }
    init();

    // Listen for session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(sbUserToNexus(session.user));
      else setUser(null);
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
