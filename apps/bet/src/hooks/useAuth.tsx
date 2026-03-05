/**
 * useAuth — Xentory Bet
 *
 * SEGURIDAD:
 * - Solo acepta sesiones que vengan del Hub via SSO token
 * - El SSO token tiene TTL de 5 minutos y solo se usa una vez
 * - Sin token válido del Hub → redirige al Hub para login
 * - No se puede acceder a ninguna ruta protegida solo con la URL
 * - localStorage solo persiste el usuario ya validado, no se acepta
 *   un usuario inyectado manualmente sin que venga de un SSO válido
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, Plan } from '../types';

interface AuthContextType {
  user:           User | null;
  isLoading:      boolean;
  logout:         () => void;
  upgradePlan:    (plan: Plan) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY  = 'nexus_bet_user';   // clave específica de bet, no compartida
const SSO_KEY   = 'xentory_sso_token';  // token generado por Hub
const HUB_URL   = (import.meta as any).env?.VITE_HUB_URL ?? 'http://localhost:4000';

function redirectToHub() {
  window.location.href = HUB_URL + '?redirect=bet';
}

function validateAndLoadUser(): User | null {
  // ── 1. SSO token en la URL (viene del Hub) ─────────────────────────────
  try {
    const params = new URLSearchParams(window.location.search);
    const ssoParam = params.get('sso');
    const uid      = params.get('uid');

    if (ssoParam && uid) {
      // Buscar el token en localStorage (generado por Hub)
      const stored = localStorage.getItem(SSO_KEY);
      if (stored) {
        const ssoToken = JSON.parse(stored);
        // Validar: token coincide, usuario coincide, no expirado, plataforma correcta
        if (
          ssoToken.token === ssoParam &&
          ssoToken.userId === decodeURIComponent(uid) &&
          new Date(ssoToken.expiresAt) > new Date() &&
          (ssoToken.platform === 'bets' || ssoToken.platform === 'both')
        ) {
          // Token válido — cargar usuario del Hub desde localStorage
          const hubUser = localStorage.getItem('xentory_user');
          if (hubUser) {
            const hu = JSON.parse(hubUser);
            const u: User = {
              id:            hu.id,
              email:         hu.email,
              name:          hu.name,
              plan:          hu.subscriptions?.bets ?? 'free',
              telegramLinked: hu.telegramLinked ?? false,
              createdAt:     hu.createdAt,
            };
            // Guardar en bet-específico y limpiar SSO de URL
            localStorage.setItem(USER_KEY, JSON.stringify(u));
            localStorage.removeItem(SSO_KEY); // token de un solo uso
            window.history.replaceState({}, '', window.location.pathname);
            return u;
          }
        }
      }
      // SSO inválido o expirado → limpiar URL y redirigir
      window.history.replaceState({}, '', window.location.pathname);
    }
  } catch { /* fallo silencioso */ }

  // ── 2. Sesión existente en localStorage de bet ─────────────────────────
  // Solo válida si el usuario del Hub sigue logado
  try {
    const betUser  = localStorage.getItem(USER_KEY);
    const hubUser  = localStorage.getItem('xentory_user');

    // Si no hay usuario en Hub, la sesión de bet es inválida
    if (!hubUser) {
      localStorage.removeItem(USER_KEY);
      return null;
    }

    if (betUser) {
      const u = JSON.parse(betUser);
      const h = JSON.parse(hubUser);
      // Verificar que el ID coincide con el del Hub (no manipulado)
      if (u.id === h.id) return u;
      // IDs no coinciden → sesión comprometida
      localStorage.removeItem(USER_KEY);
      return null;
    }
  } catch { /* fallo silencioso */ }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const u = validateAndLoadUser();
    setUser(u);
    setLoading(false);
    // Si no hay usuario válido, redirigir al Hub
    if (!u) {
      // Pequeño delay para no hacer flash antes del redirect
      setTimeout(redirectToHub, 300);
    }
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else      localStorage.removeItem(USER_KEY);
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('xentory_user');
    window.location.href = HUB_URL;
  }, []);

  const upgradePlan = useCallback((plan: Plan) => {
    setUser(u => {
      if (!u) return u;
      const updated = { ...u, plan };
      // Sync back to hub user
      try {
        const h = localStorage.getItem('xentory_user');
        if (h) {
          const hu = JSON.parse(h);
          hu.subscriptions = { ...hu.subscriptions, bets: plan };
          localStorage.setItem('xentory_user', JSON.stringify(hu));
        }
      } catch { /* */ }
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
