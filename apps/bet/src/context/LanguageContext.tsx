import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Lang = 'es' | 'en';
interface Ctx { lang: Lang; toggle: () => void; t: (es: string, en: string) => string; }
const LangCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem('xentory_lang') as Lang) ?? 'es'; } catch { return 'es'; }
  });
  const toggle = useCallback(() => setLang(l => {
    const next = l === 'es' ? 'en' : 'es';
    try { localStorage.setItem('xentory_lang', next); } catch { /**/ }
    return next;
  }), []);
  const t = useCallback((es: string, en: string) => lang === 'es' ? es : en, [lang]);
  return <LangCtx.Provider value={{ lang, toggle, t }}>{children}</LangCtx.Provider>;
}
export const useLang = () => { const c = useContext(LangCtx); if (!c) throw new Error('no LanguageProvider'); return c; };
