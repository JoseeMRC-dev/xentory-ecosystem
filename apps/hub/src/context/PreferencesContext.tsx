import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

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

function fromStorage(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Preferences>;
    return {
      market: { ...DEFAULTS.market, ...p.market },
      bet:    { ...DEFAULTS.bet,    ...p.bet },
    };
  } catch { return DEFAULTS; }
}

function toStorage(p: Preferences) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /**/ }
}

interface Ctx { prefs: Preferences; setPrefs: (p: Preferences) => Promise<void>; }
const PreferencesCtx = createContext<Ctx | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<Preferences>(fromStorage);

  // On auth change: load from Supabase when user logs in, reset to localStorage on logout
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setState(fromStorage());
        return;
      }
      const { data } = await supabase
        .from('user_preferences')
        .select('market, bet')
        .eq('user_id', session.user.id)
        .single();

      if (data) {
        const merged: Preferences = {
          market: { ...DEFAULTS.market, ...data.market },
          bet:    { ...DEFAULTS.bet,    ...data.bet },
        };
        setState(merged);
        toStorage(merged);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const setPrefs = useCallback(async (p: Preferences) => {
    setState(p);
    toStorage(p);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase
      .from('user_preferences')
      .upsert({ user_id: session.user.id, market: p.market, bet: p.bet }, { onConflict: 'user_id' });
  }, []);

  return <PreferencesCtx.Provider value={{ prefs, setPrefs }}>{children}</PreferencesCtx.Provider>;
}

export const usePreferences = () => {
  const c = useContext(PreferencesCtx);
  if (!c) throw new Error('no PreferencesProvider');
  return c;
};
