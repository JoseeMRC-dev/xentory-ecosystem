/**
 * useNews — fetches real news from NewsData.io
 * Free plan: 200 requests/day, search by keyword or category
 */
import { useState, useCallback, useRef } from 'react';

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

const API_KEY  = 'pub_e40e28b6298540e78d9247811ba16a6b';
const BASE_URL = 'https://newsdata.io/api/1/news';

// Map app categories to NewsData.io query terms + categories
const CATEGORY_QUERIES: Record<string, { q: string; category: string }> = {
  crypto:   { q: 'bitcoin OR ethereum OR crypto OR blockchain OR BTC OR ETH OR solana OR defi', category: 'technology,business' },
  stocks:   { q: 'stock market OR bolsa OR nasdaq OR sp500 OR wall street OR acciones OR NYSE', category: 'business' },
  forex:    { q: 'forex OR EUR/USD OR divisas OR tipo de cambio OR GBP OR JPY OR dollar', category: 'business' },
  sports:   { q: 'football OR futbol OR champions league OR laliga OR premier league OR NBA OR tenis', category: 'sports' },
  platform: { q: 'fintech OR inteligencia artificial OR trading OR inversión OR apuestas deportivas', category: 'technology,business' },
};

export function useNews() {
  const [articles,  setArticles]  = useState<NewsArticle[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [lastKey,   setLastKey]   = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fetchByParams = useCallback(async (params: URLSearchParams, cacheKey: string) => {
    if (cacheKey === lastKey) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    setLastKey(cacheKey);

    try {
      const res = await fetch(`${BASE_URL}?${params}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.status !== 'success') throw new Error(data.message ?? 'Error en la API');

      const mapped: NewsArticle[] = (data.results ?? [])
        .filter((a: any) => a.title && a.link)
        .map((a: any) => ({
          id:          a.article_id ?? a.link,
          title:       a.title,
          description: a.description ?? null,
          url:         a.link,
          source:      a.source_id ?? a.source_name ?? 'Fuente',
          publishedAt: a.pubDate ?? new Date().toISOString(),
          imageUrl:    a.image_url ?? null,
          category:    Array.isArray(a.category) ? a.category[0] : (a.category ?? 'news'),
          language:    a.language ?? 'en',
        }));

      setArticles(mapped);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError('No se pudieron cargar las noticias.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [lastKey]);

  // Search by free-text query
  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return;
    const params = new URLSearchParams({
      apikey:   API_KEY,
      q:        q,
      language: 'es,en',
      size:     '12',
    });
    await fetchByParams(params, `search:${q}`);
  }, [fetchByParams]);

  // Fetch top news for a given app category ('all' | 'crypto' | 'stocks' | 'forex' | 'sports' | 'platform')
  const fetchCategory = useCallback(async (category: string) => {
    const cacheKey = `cat:${category}`;
    const cfg = CATEGORY_QUERIES[category];

    const params = new URLSearchParams({
      apikey:   API_KEY,
      language: 'es,en',
      size:     '10',
      ...(cfg ? { q: cfg.q, category: cfg.category } : { category: 'business,technology,sports', size: '10' }),
    });

    await fetchByParams(params, cacheKey);
  }, [fetchByParams]);

  const clear = useCallback(() => {
    setArticles([]);
    setError(null);
    setLastKey('');
  }, []);

  return { articles, loading, error, search, fetchCategory, clear, hasResults: articles.length > 0 };
}
