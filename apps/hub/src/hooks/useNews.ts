/**
 * useNews — noticias en tiempo real, idioma-aware
 *
 * ES: RSS feeds españoles via rss2json.com (El País, Marca, CoinTelegraph ES…)
 * EN: The Guardian (test key, 5000/día) + CryptoCompare + Hacker News
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

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|nbsp);/g, ' ').trim();
}

// ── RSS → JSON (rss2json.com — CORS ✓, sin clave, 10k req/mes gratis) ─────
const RSS2J = 'https://api.rss2json.com/v1/api.json';

const ES_FEEDS: Record<string, string> = {
  crypto:   'https://es.cointelegraph.com/rss',
  stocks:   'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/seccion/economia/portada',
  forex:    'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/seccion/economia/portada',
  sports:   'https://www.marca.com/rss/portada.xml',
  platform: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/seccion/tecnologia/portada',
  all:      'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada',
};

async function fetchES(category: string, signal: AbortSignal): Promise<NewsArticle[]> {
  const url    = ES_FEEDS[category] ?? ES_FEEDS.all;
  const params = new URLSearchParams({ rss_url: url, count: '12' });
  const res    = await fetch(`${RSS2J}?${params}`, { signal });
  if (!res.ok) throw new Error(`rss2json ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error('rss2json error');
  const feedName = data.feed?.title ?? '';
  return (data.items ?? [])
    .filter((i: any) => i.title && i.link)
    .map((i: any): NewsArticle => ({
      id:          i.guid ?? i.link,
      title:       stripHtml(i.title),
      description: i.description ? stripHtml(i.description).slice(0, 200) || null : null,
      url:         i.link,
      source:      feedName || i.author || 'Noticias',
      publishedAt: i.pubDate ?? new Date().toISOString(),
      imageUrl:    i.enclosure?.link ?? i.thumbnail ?? null,
      category,
      language:    'es',
    }));
}

// ── The Guardian (test key — 5000 req/día, CORS ✓) ────────────────────────
const GU     = 'https://content.guardianapis.com/search';
const GU_KEY = 'test';

const GU_SECTION: Record<string, string> = {
  stocks:   'business',
  platform: 'technology',
  sports:   'sport',
  all:      'world',
};
const GU_QUERY: Record<string, string> = {
  stocks:   'stock market shares nasdaq earnings',
  platform: 'fintech AI trading investment technology',
  sports:   'football soccer champions league NBA',
  all:      'world news business finance sport',
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

async function fetchGuardian(category: string, signal: AbortSignal): Promise<NewsArticle[]> {
  const section = GU_SECTION[category] ?? 'world';
  const q       = GU_QUERY[category] ?? GU_QUERY.all;
  const params  = new URLSearchParams({
    'api-key': GU_KEY, section, q,
    'show-fields': 'thumbnail,trailText',
    'page-size': '12', 'order-by': 'newest',
  });
  const res  = await fetch(`${GU}?${params}`, { signal });
  if (!res.ok) throw new Error(`Guardian ${res.status}`);
  const data = await res.json();
  if (data.response?.status !== 'ok') throw new Error('Guardian error');
  return (data.response?.results ?? []).map((a: any) => mapGuardian(a, category));
}

// ── CryptoCompare (sin clave, CORS ✓) ─────────────────────────────────────
const CC      = 'https://min-api.cryptocompare.com/data/v2/news/';
const CC_TAGS: Record<string, string> = {
  crypto: 'BTC,ETH,Blockchain,DeFi,Altcoin',
  forex:  'Forex,USD,EUR,GBP,Currency',
};

async function fetchCC(category: string, signal: AbortSignal): Promise<NewsArticle[]> {
  const params = new URLSearchParams({ lang: 'EN', extraParams: 'xentory' });
  if (CC_TAGS[category]) params.set('categories', CC_TAGS[category]);
  const res  = await fetch(`${CC}?${params}`, { signal });
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
    language:    'en',
  }));
}

// ── Hacker News via Algolia (sin clave, CORS ✓) ───────────────────────────
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
      description: null,
      url:         h.url,
      source:      (() => { try { return new URL(h.url).hostname.replace('www.', ''); } catch { return 'HN'; } })(),
      publishedAt: new Date(h.created_at_i * 1000).toISOString(),
      imageUrl:    null,
      category:    'technology',
      language:    'en',
    }));
}

// ── Lógica de selección de fuente ─────────────────────────────────────────
async function fetchForCategory(
  category: string, lang: 'es'|'en', signal: AbortSignal,
): Promise<NewsArticle[]> {
  // Español: intentar RSS feeds españoles primero
  if (lang === 'es') {
    try {
      const esArticles = await fetchES(category, signal);
      if (esArticles.length > 0) return esArticles;
    } catch { /**/ }
  }

  // Inglés (o fallback cuando el RSS español falla / devuelve vacío)
  if (category === 'crypto' || category === 'forex') {
    try { return await fetchCC(category, signal); } catch { /**/ }
  }
  try { return await fetchGuardian(category, signal); } catch { /**/ }
  try { return await fetchHN(GU_QUERY[category] ?? 'world news', signal); } catch { /**/ }
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
  // useRef instead of useState so the guard never triggers re-renders or stale closures
  const inflight = useRef('');   // key of the request currently in-flight
  const abortRef     = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<{ type: 'category'|'search'; value: string } | null>(null);

  const doFetch = useCallback(async (category: string, cacheKey: string) => {
    // Serve from cache if still fresh
    const cached = readCache(cacheKey);
    if (cached) { inflight.current = ''; setArticles(cached); setError(null); return; }
    // Deduplicate: skip only if the exact same request is already in-flight
    if (cacheKey === inflight.current) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    inflight.current = cacheKey;
    setLoading(true); setError(null);

    try {
      const mapped = await fetchForCategory(category, lang as 'es'|'en', signal);
      if (mapped.length) { writeCache(cacheKey, mapped); setArticles(mapped); }
      else setArticles([]);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(lang === 'es' ? 'No se pudieron cargar las noticias.' : 'Could not load news.');
      setArticles([]);
    } finally {
      inflight.current = '';
      setLoading(false);
    }
  }, [lang]);

  const fetchCategory = useCallback(async (category: string) => {
    lastFetchRef.current = { type: 'category', value: category };
    await doFetch(category, `cat:${category}:${lang}`);
  }, [doFetch, lang]);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return;
    lastFetchRef.current = { type: 'search', value: q };
    const cacheKey = `srch:${q}:${lang}`;
    const cached = readCache(cacheKey);
    if (cached) { inflight.current = ''; setArticles(cached); setError(null); return; }
    if (cacheKey === inflight.current) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    inflight.current = cacheKey;
    setLoading(true); setError(null);

    try {
      let mapped: NewsArticle[] = [];
      const params = new URLSearchParams({
        'api-key': GU_KEY, q,
        'show-fields': 'thumbnail,trailText',
        'page-size': '12', 'order-by': 'newest',
      });
      try {
        const res  = await fetch(`${GU}?${params}`, { signal });
        const data = res.ok ? await res.json() : null;
        if (data?.response?.status === 'ok') {
          mapped = (data.response.results ?? []).map((a: any) => mapGuardian(a, 'search'));
        }
      } catch { /**/ }
      if (!mapped.length && lang !== 'es') mapped = await fetchHN(q, signal);
      writeCache(cacheKey, mapped);
      setArticles(mapped);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(lang === 'es' ? 'No se pudieron cargar las noticias.' : 'Could not load news.');
        setArticles([]);
      }
    } finally {
      inflight.current = '';
      setLoading(false);
    }
  }, [lang]);

  // Re-fetch on lang change
  useEffect(() => {
    inflight.current = '';
    const last = lastFetchRef.current;
    if (!last) return;
    if (last.type === 'category') {
      const id = setTimeout(() => doFetch(last.value, `cat:${last.value}:${lang}`), 0);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const clear = useCallback(() => {
    setArticles([]); setError(null); inflight.current = '';
    lastFetchRef.current = null;
  }, []);

  return { articles, loading, error, search, fetchCategory, clear, hasResults: articles.length > 0 };
}
