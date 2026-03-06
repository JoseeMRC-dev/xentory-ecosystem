/**
 * useAuth — Xentory Market
 * SSO via URL param ?xsso=<base64 encoded user payload>
 * Cross-domain safe — no shared localStorage needed
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, Plan } from '../types';

interface AuthContextType {
  user:        User | null;
  isLoading:   boolean;
  logout:      () => void;
  upgradePlan: (plan: Plan) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = 'xentory_bet_user';
const HUB_URL  = (import.meta as any).env?.VITE_HUB_URL ?? 'https://x-eight-beryl.vercel.app';

function redirectToHub() {
  window.location.href = HUB_URL + '?redirect=bet';
}

function validateAndLoadUser(): User | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const xsso   = params.get('xsso');

    if (xsso) {
      // New cross-domain SSO: full user payload encoded in URL
      const payload = JSON.parse(decodeURIComponent(atob(xsso)));
      if (payload.exp && payload.exp > Date.now()) {
        const u: User = {
          id:             payload.id,
          email:          payload.email,
          name:           payload.name,
          plan:           payload.subscriptions?.bets ?? 'free',
          telegramLinked: payload.telegramLinked ?? false,
          createdAt:      payload.createdAt,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        window.history.replaceState({}, '', window.location.pathname);
        return u;
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  } catch { /* */ }

  // Existing session
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* */ }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const u = validateAndLoadUser();
    setUser(u);
    setLoading(false);
    if (!u) setTimeout(redirectToHub, 300);
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else      localStorage.removeItem(USER_KEY);
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    window.location.href = HUB_URL;
  }, []);

  const upgradePlan = useCallback((plan: Plan) => {
    setUser(u => {
      if (!u) return u;
      const updated = { ...u, plan };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
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
