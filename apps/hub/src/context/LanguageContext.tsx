import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { translations, type TKey } from '../i18n/translations';

export type Lang = 'es' | 'en';

interface LangCtx {
  lang:       Lang;
  toggleLang: () => void;
  /**
   * Two overloads:
   *   t('nav.signin')           → looks up translations file
   *   t('Texto ES', 'Text EN') → inline, no file needed
   */
  t:  {
    (key: TKey):                string;
    (es: string, en: string):   string;
  };
  ti: (es: string, en: string) => string;
}

const LangContext = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem('xentory_lang') as Lang) ?? 'en'; }
    catch { return 'es'; }
  });

  const toggleLang = useCallback(() => {
    setLang(l => {
      const next = l === 'es' ? 'en' : 'es';
      try { localStorage.setItem('xentory_lang', next); } catch { /**/ }
      return next;
    });
  }, []);

  // Handles both signatures at runtime
  const t = useCallback((keyOrEs: string, en?: string): string => {
    if (en !== undefined) {
      // 2-arg inline: t('Texto ES', 'Text EN')
      return lang === 'es' ? keyOrEs : en;
    }
    // 1-arg key: t('nav.signin')
    const entry = translations[keyOrEs as TKey];
    if (!entry) {
      console.warn(`[i18n] Missing key: "${keyOrEs}"`);
      return keyOrEs;
    }
    return entry[lang];
  }, [lang]) as LangCtx['t'];

  const ti = useCallback(
    (es: string, en: string): string => lang === 'es' ? es : en,
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, toggleLang, t, ti }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LanguageProvider');
  return ctx;
}
