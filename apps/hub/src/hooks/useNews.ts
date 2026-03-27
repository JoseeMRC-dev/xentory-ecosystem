/**
 * useNews — noticias en tiempo real, sin API key, sin límite de requests
 *
 * Fuentes:
 *   • CryptoCompare News API — crypto/stocks/forex/platform  (gratis, sin clave)
 *   • Reddit JSON API         — sports + all + fallback       (gratis, sin clave)
 *   • Reddit Search           — búsquedas libres              (gratis, sin clave)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';

export interface NewsArticle {
  id:          string;
  title:       string;
  description: string | null;
  url:         string;
  source:      string;
  publishedAt: string;
  imageUrl:    string | null;
  category:    string;
  language:    string;
}

// ── CryptoCompare News ─────────────────────────────────────────────────────
// https://min-api.cryptocompare.com/data/v2/news  – free, no key, 50 req/s
const CC_URL = 'https://min-api.cryptocompare.com/data/v2/news/';

// Category tags for CryptoCompare
const CC_TAGS: Record<string, string> = {
  crypto:   'BTC,ETH,Blockchain,DeFi',
  stocks:   'Stocks,NASDAQ,Trading,Investing',
  forex:    'Forex,USD,EUR,Currencies',
  platform: 'Trading,Fintech,Regulation',
};

// Language filter IDs for CryptoCompare (EN only; ES content via Reddit)
async function fetchCC(category: string, lang: string, signal: AbortSignal): Promise<NewsArticle[]> {
  const params = new URLSearchParams({ lang: lang === 'es' ? 'ES' : 'EN', extraParams: 'xentory' });
  if (CC_TAGS[category]) params.set('categories', CC_TAGS[category]);
  const res  = await fetch(`${CC_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`CC ${res.status}`);
  const data = await res.json();
  if (data.Response === 'Error') throw new Error(data.Message);
  return (data.Data ?? []).slice(0, 12).map((a: any): NewsArticle => ({
    id:          String(a.id),
    title:       a.title,
    description: a.body ? a.body.slice(0, 200) : null,
    url:         a.url,
    source:      a.source_info?.name ?? a.source ?? 'CryptoCompare',
    publishedAt: new Date(a.published_on * 1000).toISOString(),
    imageUrl:    a.imageurl ?? null,
    category,
    language:    lang,
  }));
}

// ── Reddit JSON API ────────────────────────────────────────────────────────
const RD = 'https://www.reddit.com/r';

const RD_SUBS: Record<string, Record<'es'|'en', string>> = {
  crypto:   { es: 'CryptoCurrency+Bitcoin+ethereum',          en: 'CryptoCurrency+Bitcoin+ethereum' },
  stocks:   { es: 'stocks+investing+StockMarket+bolsa',       en: 'stocks+investing+StockMarket' },
  forex:    { es: 'Forex+investing',                          en: 'Forex+currencies' },
  sports:   { es: 'futbol+laliga+championsleague',            en: 'soccer+sports+nba+tennis' },
  platform: { es: 'technology+fintech+investing',             en: 'technology+fintech' },
  all:      { es: 'es+worldnews+CryptoCurrency+futbol',       en: 'worldnews+news+CryptoCurrency+soccer' },
};

function mapRD(p: any, category: string, lang: string): NewsArticle | null {
  const d = p?.data;
  if (!d?.title || d.stickied || !d.url) return null;
  const preview = d.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&') ?? null;
  const thumb   = d.thumbnail?.startsWith('http') && !d.thumbnail.includes('redd.it') ? d.thumbnail : null;
  // Show real domain as source when available (bbc.com, reuters.com, etc.)
  const domain  = d.domain && !d.domain.startsWith('self.') ? d.domain : `r/${d.subreddit}`;
  return {
    id:          d.id,
    title:       d.title,
    description: d.selftext?.trim() ? d.selftext.slice(0, 200) : null,
    url:         d.url_overridden_by_dest ?? d.url,
    source:      domain,
    publishedAt: new Date(d.created_utc * 1000).toISOString(),
    imageUrl:    preview ?? thumb,
    category,
    language:    lang,
  };
}

async function fetchRD(category: string, lang: 'es'|'en', signal: AbortSignal, sort = 'hot'): Promise<NewsArticle[]> {
  const subs = RD_SUBS[category]?.[lang] ?? RD_SUBS.all[lang];
  const res  = await fetch(`${RD}/${subs}/${sort}.json?limit=15&raw_json=1`, { signal });
  if (!res.ok) throw new Error(`Reddit ${res.status}`);
  const data = await res.json();
  return (data?.data?.children ?? [])
    .map((p: any) => mapRD(p, category, lang))
    .filter(Boolean) as NewsArticle[];
}

// Categories served by CryptoCompare (financial precision matters)
const CC_CATEGORIES = new Set(['crypto', 'stocks', 'forex', 'platform']);

// ── Cache 30 min ───────────────────────────────────────────────────────────
const TTL = 30 * 60 * 1000;

function readCache(key: string): NewsArticle[] | null {
  try {
    const raw = localStorage.getItem(`nc_${key}`);
    if (!raw) return null;
    const { a, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL) { localStorage.removeItem(`nc_${key}`); return null; }
    return a;
  } catch { return null; }
}

function writeCache(key: string, articles: NewsArticle[]) {
  try { localStorage.setItem(`nc_${key}`, JSON.stringify({ a: articles, ts: Date.now() })); } catch {}
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useNews() {
  const { lang } = useLang();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [lastKey,  setLastKey]  = useState('');
  const abortRef     = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<{ type: 'category'|'search'; value: string } | null>(null);

  const doFetch = useCallback(async (category: string, cacheKey: string) => {
    if (cacheKey === lastKey) return;
    const cached = readCache(cacheKey);
    if (cached) { setLastKey(cacheKey); setArticles(cached); setError(null); return; }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setLoading(true); setError(null); setLastKey(cacheKey);

    try {
      let mapped: NewsArticle[] = [];

      if (CC_CATEGORIES.has(category)) {
        // Try CryptoCompare first for financial categories
        try { mapped = await fetchCC(category, lang, signal); } catch { /**/ }
      }

      // Reddit for sports/all, or as fallback
      if (!mapped.length) {
        mapped = await fetchRD(category, lang as 'es'|'en', signal);
      }

      if (mapped.length) { writeCache(cacheKey, mapped); setArticles(mapped); }
      else { setArticles([]); }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(lang === 'es' ? 'No se pudieron cargar las noticias.' : 'Could not load news.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [lastKey, lang]);

  const fetchCategory = useCallback(async (category: string) => {
    lastFetchRef.current = { type: 'category', value: category };
    await doFetch(category, `cat:${category}:${lang}`);
  }, [doFetch, lang]);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return;
    lastFetchRef.current = { type: 'search', value: q };
    const cacheKey = `srch:${q}:${lang}`;
    if (cacheKey === lastKey) return;
    const cached = readCache(cacheKey);
    if (cached) { setLastKey(cacheKey); setArticles(cached); setError(null); return; }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setLoading(true); setError(null); setLastKey(cacheKey);

    try {
      const res  = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=12&raw_json=1`,
        { signal },
      );
      if (!res.ok) throw new Error(`Reddit search ${res.status}`);
      const data   = await res.json();
      const mapped = (data?.data?.children ?? [])
        .map((p: any) => mapRD(p, 'search', lang))
        .filter(Boolean) as NewsArticle[];
      writeCache(cacheKey, mapped);
      setArticles(mapped);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(lang === 'es' ? 'No se pudieron cargar las noticias.' : 'Could not load news.');
        setArticles([]);
      }
    } finally {
      setLoading(false);
    }
  }, [lastKey, lang]);

  // Re-fetch when language changes
  useEffect(() => {
    setLastKey('');
    const last = lastFetchRef.current;
    if (!last) return;
    if (last.type === 'category') {
      const id = setTimeout(() => doFetch(last.value, `cat:${last.value}:${lang}`), 0);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const clear = useCallback(() => {
    setArticles([]); setError(null); setLastKey('');
    lastFetchRef.current = null;
  }, []);

  return { articles, loading, error, search, fetchCategory, clear, hasResults: articles.length > 0 };
}
