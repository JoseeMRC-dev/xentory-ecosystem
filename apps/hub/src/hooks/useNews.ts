/**
 * useNews — noticias reales de dos fuentes:
 *   1. NewsData.io (/api/1/latest) — prioridad, 200 req/día gratuitas
 *   2. Reddit JSON API  — fallback automático, sin clave, sin límite
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

// ── NewsData.io ────────────────────────────────────────────────────────────
const ND_KEY  = 'pub_e40e28b6298540e78d9247811ba16a6b';
const ND_URL  = 'https://newsdata.io/api/1/latest';

const ND_QUERIES: Record<string, { q: Record<'es'|'en', string>; category: string }> = {
  crypto:   { q: { es: 'bitcoin OR ethereum OR criptomoneda OR blockchain OR BTC', en: 'bitcoin OR ethereum OR crypto OR blockchain OR BTC' }, category: 'technology,business' },
  stocks:   { q: { es: 'bolsa OR acciones OR nasdaq OR sp500 OR wall street OR NVDA', en: 'stock market OR nasdaq OR sp500 OR wall street OR NVDA' }, category: 'business' },
  forex:    { q: { es: 'forex OR divisas OR EUR/USD OR dólar OR euro', en: 'forex OR currency OR EUR/USD OR dollar OR euro' }, category: 'business' },
  sports:   { q: { es: 'fútbol OR champions OR laliga OR premier league OR NBA', en: 'football OR champions OR soccer OR premier league OR NBA' }, category: 'sports' },
  platform: { q: { es: 'fintech OR inteligencia artificial OR trading OR inversión', en: 'fintech OR artificial intelligence OR trading OR investment' }, category: 'technology,business' },
};
const ND_ALL: Record<'es'|'en', string> = {
  es: 'bitcoin OR bolsa OR fútbol OR champions OR trading OR criptomoneda',
  en: 'bitcoin OR stock market OR football OR champions OR trading OR crypto',
};

function mapND(a: any, lang: string): NewsArticle {
  return {
    id:          a.article_id ?? a.link,
    title:       a.title,
    description: a.description ?? null,
    url:         a.link,
    source:      a.source_id ?? a.source_name ?? 'NewsData',
    publishedAt: a.pubDate ?? new Date().toISOString(),
    imageUrl:    a.image_url ?? null,
    category:    Array.isArray(a.category) ? a.category[0] : (a.category ?? 'news'),
    language:    a.language ?? lang,
  };
}

// ── Reddit fallback ────────────────────────────────────────────────────────
const RD_BASE = 'https://www.reddit.com/r';

const RD_SUBS: Record<string, Record<'es'|'en', string>> = {
  crypto:   { es: 'CryptoCurrency+Bitcoin+ethereum', en: 'CryptoCurrency+Bitcoin+ethereum' },
  stocks:   { es: 'stocks+investing+StockMarket',    en: 'stocks+investing+StockMarket' },
  forex:    { es: 'Forex+investing',                 en: 'Forex+currencies' },
  sports:   { es: 'futbol+soccer+sports',            en: 'soccer+sports+nba' },
  platform: { es: 'technology+fintech',              en: 'technology+fintech' },
  all:      { es: 'worldnews+CryptoCurrency+futbol', en: 'worldnews+news+CryptoCurrency+soccer' },
};

function mapRD(p: any, category: string): NewsArticle | null {
  const d = p?.data;
  if (!d?.title || d.stickied) return null;
  const preview = d.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&') ?? null;
  const thumb   = d.thumbnail?.startsWith('http') && !d.thumbnail.includes('redd.it') ? d.thumbnail : null;
  return {
    id:          d.id,
    title:       d.title,
    description: d.selftext?.trim() ? d.selftext.slice(0, 180) : null,
    url:         d.url_overridden_by_dest ?? d.url ?? '',
    source:      `r/${d.subreddit}`,
    publishedAt: new Date(d.created_utc * 1000).toISOString(),
    imageUrl:    preview ?? thumb,
    category,
    language:    'en',
  };
}

async function fetchReddit(category: string, lang: 'es'|'en', signal: AbortSignal): Promise<NewsArticle[]> {
  const subs = RD_SUBS[category]?.[lang] ?? RD_SUBS.all[lang];
  const res  = await fetch(`${RD_BASE}/${subs}/hot.json?limit=15&raw_json=1`, { signal });
  if (!res.ok) throw new Error(`Reddit ${res.status}`);
  const data = await res.json();
  return (data?.data?.children ?? []).map((p: any) => mapRD(p, category)).filter(Boolean) as NewsArticle[];
}

// ── Cache ──────────────────────────────────────────────────────────────────
const CACHE_TTL = 30 * 60 * 1000;

function readCache(key: string): NewsArticle[] | null {
  try {
    const raw = localStorage.getItem(`news_cache_${key}`);
    if (!raw) return null;
    const { articles, ts } = JSON.parse(raw) as { articles: NewsArticle[]; ts: number };
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`news_cache_${key}`); return null; }
    return articles;
  } catch { return null; }
}

function writeCache(key: string, articles: NewsArticle[]) {
  try { localStorage.setItem(`news_cache_${key}`, JSON.stringify({ articles, ts: Date.now() })); } catch {}
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useNews() {
  const { lang } = useLang();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [lastKey,  setLastKey]  = useState('');
  const abortRef    = useRef<AbortController | null>(null);
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
      // Primary: NewsData.io
      const cfg = ND_QUERIES[category];
      const q   = category === 'all' ? ND_ALL[lang as 'es'|'en'] : cfg?.q[lang as 'es'|'en'];
      const params = new URLSearchParams({
        apikey: ND_KEY, language: lang, size: '12',
        ...(q ? { q, ...(cfg ? { category: cfg.category } : {}) }
              : { category: 'business,technology,sports' }),
      });
      const res  = await fetch(`${ND_URL}?${params}`, { signal });
      const data = res.ok ? await res.json() : null;

      if (data?.status === 'success' && data.results?.length) {
        const mapped = data.results.filter((a: any) => a.title && a.link).map((a: any) => mapND(a, lang));
        writeCache(cacheKey, mapped);
        setArticles(mapped);
        return;
      }
      throw new Error('nd_fallback');
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      // Fallback: Reddit
      try {
        const mapped = await fetchReddit(category, lang as 'es'|'en', signal);
        if (mapped.length) { writeCache(cacheKey, mapped); setArticles(mapped); setError(null); return; }
      } catch (re: any) {
        if (re.name === 'AbortError') return;
      }
      setError(lang === 'es' ? 'No se pudieron cargar las noticias.' : 'Could not load news.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [lastKey, lang]);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return;
    lastFetchRef.current = { type: 'search', value: q };
    const cacheKey = `search:${q}:${lang}`;

    const cached = readCache(cacheKey);
    if (cacheKey === lastKey) return;
    if (cached) { setLastKey(cacheKey); setArticles(cached); setError(null); return; }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setLoading(true); setError(null); setLastKey(cacheKey);

    try {
      const params = new URLSearchParams({ apikey: ND_KEY, q, language: lang, size: '12' });
      const res  = await fetch(`${ND_URL}?${params}`, { signal });
      const data = res.ok ? await res.json() : null;
      if (data?.status === 'success' && data.results?.length) {
        const mapped = data.results.filter((a: any) => a.title && a.link).map((a: any) => mapND(a, lang));
        writeCache(cacheKey, mapped); setArticles(mapped);
      } else {
        // Reddit search fallback
        const rRes = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=hot&limit=12&raw_json=1`, { signal });
        const rData = rRes.ok ? await rRes.json() : null;
        const mapped = (rData?.data?.children ?? []).map((p: any) => mapRD(p, 'search')).filter(Boolean) as NewsArticle[];
        if (mapped.length) { writeCache(cacheKey, mapped); setArticles(mapped); }
        else setArticles([]);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') { setError(lang === 'es' ? 'No se pudieron cargar las noticias.' : 'Could not load news.'); setArticles([]); }
    } finally {
      setLoading(false);
    }
  }, [lastKey, lang]);

  const fetchCategory = useCallback(async (category: string) => {
    lastFetchRef.current = { type: 'category', value: category };
    await doFetch(category, `cat:${category}:${lang}`);
  }, [doFetch, lang]);

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
