import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('xentory-theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* ignore */ }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('xentory-theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
