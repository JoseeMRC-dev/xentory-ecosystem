import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';
interface Ctx { theme: Theme; toggle: () => void; }
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('xentory-theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') return saved;
      try { localStorage.removeItem('xentory_theme'); } catch { /**/ }
    } catch { /* ignore */ }
    return 'light';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('xentory-theme', theme); } catch { /**/ }
  }, [theme]);
  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => { const c = useContext(ThemeCtx); if (!c) throw new Error('no ThemeProvider'); return c; };
