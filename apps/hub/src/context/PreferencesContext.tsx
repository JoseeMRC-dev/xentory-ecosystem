import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface MarketPrefs {
  crypto: string[];
  forex:  string[];
  stocks: string[];
}
export interface BetPrefs {
  favoriteTeam:    string;
  favoriteLeagues: string[];
}
export interface Preferences {
  market: MarketPrefs;
  bet:    BetPrefs;
}

const DEFAULTS: Preferences = {
  market: { crypto: ['BTC', 'ETH', 'SOL'], forex: ['EUR/USD'], stocks: ['NVDA'] },
  bet:    { favoriteTeam: '', favoriteLeagues: [] },
};

const KEY = 'xentory-preferences';

function load(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      market: { ...DEFAULTS.market, ...parsed.market },
      bet:    { ...DEFAULTS.bet,    ...parsed.bet },
    };
  } catch { return DEFAULTS; }
}

interface Ctx { prefs: Preferences; setPrefs: (p: Preferences) => void; }
const PreferencesCtx = createContext<Ctx | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<Preferences>(load);

  const setPrefs = useCallback((p: Preferences) => {
    setState(p);
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /**/ }
  }, []);

  return <PreferencesCtx.Provider value={{ prefs, setPrefs }}>{children}</PreferencesCtx.Provider>;
}

export const usePreferences = () => {
  const c = useContext(PreferencesCtx);
  if (!c) throw new Error('no PreferencesProvider');
  return c;
};
