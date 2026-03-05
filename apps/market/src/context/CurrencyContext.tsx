import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type Currency = 'USD' | 'EUR';
interface Ctx { currency: Currency; setCurrency: (c: Currency) => void; rate: number; convert: (usd: number) => number; fmt: (usd: number, dec?: number) => string; }
const CurrCtx = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    try { return (localStorage.getItem('xentory_currency') as Currency) ?? 'USD'; } catch { return 'USD'; }
  });
  const [rate, setRate] = useState(0.92);

  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?from=USD&to=EUR')
      .then(r => r.json()).then(d => { if (d?.rates?.EUR) setRate(d.rates.EUR); }).catch(() => {});
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem('xentory_currency', c); } catch { /**/ }
  }, []);

  const convert = useCallback((usd: number) => currency === 'EUR' ? usd * rate : usd, [currency, rate]);

  const fmt = useCallback((usd: number, dec?: number) => {
    const v = convert(usd);
    const d = dec ?? (v >= 1000 ? 0 : v >= 1 ? 2 : 4);
    const n = v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v.toFixed(d);
    return currency === 'EUR' ? `${n} €` : `$${n}`;
  }, [convert, currency]);

  return <CurrCtx.Provider value={{ currency, setCurrency, rate, convert, fmt }}>{children}</CurrCtx.Provider>;
}
export const useCurrency = () => { const c = useContext(CurrCtx); if (!c) throw new Error('no CurrencyProvider'); return c; };
