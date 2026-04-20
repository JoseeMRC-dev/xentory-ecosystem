/**
 * CurrencyContext
 *
 * - Persiste la moneda elegida en localStorage
 * - Expone `currency`, `setCurrency`, `format(value)` y `convert(usdValue)`
 * - El tipo de cambio EUR/USD se obtiene de Frankfurter al montar
 *   y se actualiza cada 60 minutos (mismo endpoint que el ticker)
 * - `format(value)` aplica la moneda activa y el símbolo correcto
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react';

export type Currency = 'USD' | 'EUR';

interface CurrencyContextType {
  currency:    Currency;
  setCurrency: (c: Currency) => void;
  rate:        number;          // EUR/USD rate (e.g. 0.92 means 1 USD = 0.92 EUR)
  rateReady:   boolean;
  /** Converts a USD value to the active currency */
  convert: (usdValue: number) => number;
  /** Formats a USD value into a localized string with symbol */
  format:  (usdValue: number, decimals?: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = 'xentory_currency';
const SYMBOLS: Record<Currency, string> = { USD: '$', EUR: '€' };

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored === 'EUR' || stored === 'USD') ? stored : 'USD';
    } catch { return 'USD'; }
  });

  // EUR/USD rate: how many EUR per 1 USD
  const [rate, setRate] = useState(0.92); // sensible default
  const [rateReady, setRateReady] = useState(false);

  // Fetch rate from Frankfurter (ECB data, free, no key)
  const fetchRate = useCallback(async () => {
    try {
      const res = await fetch(
        'https://api.frankfurter.app/latest?from=USD&to=EUR',
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      const eur = data?.rates?.EUR as number | undefined;
      if (eur && eur > 0) {
        setRate(eur);
        setRateReady(true);
      }
    } catch { /* use default */ }
  }, []);

  useEffect(() => {
    fetchRate();
    const id = setInterval(fetchRate, 60 * 60 * 1000); // refresh every hour
    return () => clearInterval(id);
  }, [fetchRate]);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
  }, []);

  const convert = useCallback((usdValue: number): number => {
    return currency === 'EUR' ? usdValue * rate : usdValue;
  }, [currency, rate]);

  const format = useCallback((usdValue: number, decimals?: number): string => {
    const value = convert(usdValue);
    const sym   = SYMBOLS[currency];
    const dec   = decimals ?? (value >= 1000 ? 0 : value >= 1 ? 2 : 4);
    const formatted = value >= 1000
      ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : value.toFixed(dec);
    return currency === 'EUR'
      ? `${formatted} ${sym}`   // European convention: 1.234 €
      : `${sym}${formatted}`;   // US convention: $1,234
  }, [convert, currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rate, rateReady, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be inside CurrencyProvider');
  return ctx;
}
