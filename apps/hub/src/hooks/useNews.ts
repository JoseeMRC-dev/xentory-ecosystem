/**
 * useNews — noticias en tiempo real, sin límite práctico de requests
 *
 * Fuentes (todas soportan CORS desde el navegador):
 *   • CryptoCompare News API — crypto / forex         (sin clave, sin límite)
 *   • The Guardian API       — sports / stocks / all  (clave "test", 5000/día)
 *   • Hacker News / Algolia  — fallback tech           (sin clave, sin límite)
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

// ── The Guardian (test key — 5000 req/día, CORS ✓) ────────────────────────
const GU = 'https://content.guardianapis.com/search';
const GU_KEY = 'test';

const GU_SECTION: Record<string, string> = {
  stocks:   'business',
  platform: 'technology',
  sports:   'sport',
  all:      'world',
};
const GU_QUERY: Record<string, Record<'es'|'en', string>> = {
  stocks:   { es: 'bolsa acciones mercado', en: 'stock market shares nasdaq' },
  platform: { es: 'fintech inteligencia artificial trading', en: 'fintech AI trading investment' },
  sports:   { es: 'fútbol champions laliga', en: 'football soccer champions league' },
  all:      { es: 'economia deportes tecnologia', en: 'world news business sport' },
};

function mapGuardian(a: any, category: string): NewsArticle {
  return {
    id:          a.id,
    title:       a.webTitle,
    description: a.fields?.trailText ?? null,
    url:         a.webUrl,
    source:      'The Guardian',
    publishedAt: a.webPublicationDate,
    imageUrl:    a.fields?.thumbnail ?? null,
    category,
    language:    'en',
  };
}

async function fetchGuardian(category: string, lang: 'es'|'en', signal: AbortSignal): Promise<NewsArticle[]> {
  const section = GU_SECTION[category] ?? 'world';
  const q       = GU_QUERY[category]?.[lang] ?? GU_QUERY.all[lang];
  const params  = new URLSearchParams({
    'api-key':    GU_KEY,
    section,
    q,
    'show-fields': 'thumbnail,trailText',
    'page-size':   '12',
    'order-by':    'newest',
  });
  const res  = await fetch(`${GU}?${params}`, { signal });
  if (!res.ok) throw new Error(`Guardian ${res.status}`);
  const data = await res.json();
  if (data.response?.status !== 'ok') throw new Error('Guardian error');
  return (data.response?.results ?? []).map((a: any) => mapGuardian(a, category));
}

// ── CryptoCompare (sin clave, CORS ✓) ────────────────────────────────────
const CC = 'https://min-api.cryptocompare.com/data/v2/news/';
const CC_TAGS: Record<string, string> = {
  crypto: 'BTC,ETH,Blockchain,DeFi,Altcoin',
  forex:  'Forex,USD,EUR,GBP,Currency',
};

function mapCC(a: any, category: string, lang: string): NewsArticle {
  return {
    id:          String(a.id),
    title:       a.title,
    description: a.body ? a.body.slice(0, 200) : null,
    url:         a.url,
    source:      a.source_info?.name ?? a.source ?? 'CryptoCompare',
    publishedAt: new Date(a.published_on * 1000).toISOString(),
    imageUrl:    a.imageurl ?? null,
    category,
    language:    lang,
  };
}

async function fetchCC(category: string, lang: string, signal: AbortSignal): Promise<NewsArticle[]> {
  const params = new URLSearchParams({
    lang:        lang === 'es' ? 'ES' : 'EN',
    extraParams: 'xentory',
  });
  if (CC_TAGS[category]) params.set('categories', CC_TAGS[category]);
  const res  = await fetch(`${CC}?${params}`, { signal });
  if (!res.ok) throw new Error(`CC ${res.status}`);
  const data = await res.json();
  if (data.Response === 'Error') throw new Error(data.Message);
  return (data.Data ?? []).slice(0, 12).map((a: any) => mapCC(a, category, lang));
}

// ── Hacker News via Algolia (sin clave, CORS ✓) — fallback ───────────────
const HN = 'https://hn.algolia.com/api/v1/search';

async function fetchHN(query: string, signal: AbortSignal): Promise<NewsArticle[]> {
  const params = new URLSearchParams({ query, tags: 'story', hitsPerPage: '12' });
  const res    = await fetch(`${HN}?${params}`, { signal });
  if (!res.ok) throw new Error(`HN ${res.status}`);
  const data   = await res.json();
  return (data.hits ?? [])
    .filter((h: any) => h.title && h.url)
    .map((h: any): NewsArticle => ({
      id:          h.objectID,
      title:       h.title,
      description: h.story_text ? h.story_text.slice(0, 200) : null,
      url:         h.url,
      source:      h.url ? new URL(h.url).hostname.replace('www.', '') : 'Hacker News',
      publishedAt: new Date(h.created_at_i * 1000).toISOString(),
      imageUrl:    null,
      category:    'technology',
      language:    'en',
    }));
}

// ── Route by category ─────────────────────────────────────────────────────
// crypto / forex  → CryptoCompare (then Guardian fallback)
// others          → Guardian      (then HN fallback for platform/all)
const CC_CATS  = new Set(['crypto', 'forex']);
const GU_CATS  = new Set(['stocks', 'platform', 'sports', 'all']);

async function fetchForCategory(
  category: string, lang: 'es'|'en', signal: AbortSignal,
): Promise<NewsArticle[]> {
  if (CC_CATS.has(category)) {
    try { return await fetchCC(category, lang, signal); } catch { /**/ }
    // CC failed → Guardian fallback
    const guCat = category === 'crypto' ? 'all' : 'stocks';
    try { return await fetchGuardian(guCat, lang, signal); } catch { /**/ }
  } else if (GU_CATS.has(category)) {
    try { return await fetchGuardian(category, lang, signal); } catch { /**/ }
    // Guardian failed → HN fallback
    const q = GU_QUERY[category]?.[lang] ?? 'world news';
    try { return await fetchHN(q, signal); } catch { /**/ }
  }
  // Default
  try { return await fetchGuardian('all', lang, signal); } catch { /**/ }
  return [];
}

// ── Cache 30 min ──────────────────────────────────────────────────────────
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

// ── Hook ──────────────────────────────────────────────────────────────────
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
      const mapped = await fetchForCategory(category, lang as 'es'|'en', signal);
      if (mapped.length) { writeCache(cacheKey, mapped); setArticles(mapped); }
      else setArticles([]);
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
      // Guardian search first, HN as fallback
      let mapped: NewsArticle[] = [];
      try {
        const params = new URLSearchParams({
          'api-key': GU_KEY, q, 'show-fields': 'thumbnail,trailText',
          'page-size': '12', 'order-by': 'newest',
        });
        const res  = await fetch(`${GU}?${params}`, { signal });
        const data = res.ok ? await res.json() : null;
        if (data?.response?.status === 'ok') {
          mapped = (data.response.results ?? []).map((a: any) => mapGuardian(a, 'search'));
        }
      } catch { /**/ }

      if (!mapped.length) mapped = await fetchHN(q, signal);
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
