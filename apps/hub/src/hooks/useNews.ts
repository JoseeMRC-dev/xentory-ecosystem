/**
 * useNews — fetches real news from NewsData.io
 * Free plan: 200 requests/day, search by keyword or category
 * Language-aware: fetches Spanish news when lang='es', English when lang='en'
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

const API_KEY  = 'pub_e40e28b6298540e78d9247811ba16a6b';
const BASE_URL = 'https://newsdata.io/api/1/news';

// Bilingual queries per category
const CATEGORY_QUERIES: Record<string, {
  q:        Record<'es' | 'en', string>;
  category: string;
}> = {
  crypto: {
    q: {
      es: 'bitcoin OR ethereum OR criptomoneda OR blockchain OR BTC OR ETH OR solana OR defi',
      en: 'bitcoin OR ethereum OR crypto OR blockchain OR BTC OR ETH OR solana OR defi',
    },
    category: 'technology,business',
  },
  stocks: {
    q: {
      es: 'bolsa OR acciones OR nasdaq OR sp500 OR wall street OR NVDA OR Apple OR Tesla OR mercado bursátil',
      en: 'stock market OR nasdaq OR sp500 OR wall street OR equities OR shares OR earnings OR NVDA OR Apple',
    },
    category: 'business',
  },
  forex: {
    q: {
      es: 'forex OR divisas OR tipo de cambio OR EUR/USD OR dólar OR euro OR libra esterlina',
      en: 'forex OR currency OR exchange rate OR EUR/USD OR dollar OR euro OR pound sterling',
    },
    category: 'business',
  },
  sports: {
    q: {
      es: 'fútbol OR champions league OR laliga OR premier league OR NBA OR tenis OR deporte',
      en: 'football OR champions league OR soccer OR premier league OR NBA OR tennis OR sports',
    },
    category: 'sports',
  },
  platform: {
    q: {
      es: 'fintech OR inteligencia artificial OR trading OR inversión OR apuestas deportivas',
      en: 'fintech OR artificial intelligence OR trading OR investment OR sports betting',
    },
    category: 'technology,business',
  },
};

// Default all-category query
const ALL_QUERIES: Record<'es' | 'en', string> = {
  es: 'bitcoin OR bolsa OR fútbol OR champions OR trading OR criptomoneda OR acciones',
  en: 'bitcoin OR stock market OR football OR champions OR trading OR crypto OR equities',
};

export function useNews() {
  const { lang } = useLang();
  const [articles,  setArticles]  = useState<NewsArticle[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [lastKey,   setLastKey]   = useState('');
  const abortRef     = useRef<AbortController | null>(null);
  // Track the last category/query so we can re-fetch when language changes
  const lastFetchRef = useRef<{ type: 'category' | 'search'; value: string } | null>(null);

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
          language:    a.language ?? lang,
        }));

      setArticles(mapped);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(lang === 'es' ? 'No se pudieron cargar las noticias.' : 'Could not load news.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [lastKey, lang]);

  // Search by free-text query
  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return;
    lastFetchRef.current = { type: 'search', value: q };
    const params = new URLSearchParams({
      apikey:   API_KEY,
      q,
      language: lang,
      size:     '12',
    });
    await fetchByParams(params, `search:${q}:${lang}`);
  }, [fetchByParams, lang]);

  // Fetch top news for a given app category ('all' | 'crypto' | 'stocks' | 'forex' | 'sports' | 'platform')
  const fetchCategory = useCallback(async (category: string) => {
    lastFetchRef.current = { type: 'category', value: category };
    const cacheKey = `cat:${category}:${lang}`;
    const cfg = CATEGORY_QUERIES[category];
    const q   = category === 'all' ? ALL_QUERIES[lang] : cfg?.q[lang as 'es' | 'en'];

    const params = new URLSearchParams({
      apikey:   API_KEY,
      language: lang,
      size:     '12',
      ...(q ? { q, ...(cfg ? { category: cfg.category } : {}) }
            : { category: 'business,technology,sports' }),
    });

    await fetchByParams(params, cacheKey);
  }, [fetchByParams, lang]);

  // Re-fetch automatically when language changes
  useEffect(() => {
    // Reset cache so the next fetch runs even with the same category key
    setLastKey('');
    const last = lastFetchRef.current;
    if (!last) return;
    if (last.type === 'category') {
      // Re-trigger after state update is committed
      const id = setTimeout(() => {
        const cfg = CATEGORY_QUERIES[last.value];
        const q   = last.value === 'all' ? ALL_QUERIES[lang] : cfg?.q[lang as 'es' | 'en'];
        const params = new URLSearchParams({
          apikey:   API_KEY,
          language: lang,
          size:     '12',
          ...(q ? { q, ...(cfg ? { category: cfg.category } : {}) }
                : { category: 'business,technology,sports' }),
        });
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setLoading(true);
        setError(null);
        setLastKey(`cat:${last.value}:${lang}`);
        fetch(`${BASE_URL}?${params}`, { signal: abortRef.current.signal })
          .then(r => r.json())
          .then(data => {
            if (data.status !== 'success') throw new Error(data.message);
            setArticles((data.results ?? []).filter((a: any) => a.title && a.link).map((a: any) => ({
              id:          a.article_id ?? a.link,
              title:       a.title,
              description: a.description ?? null,
              url:         a.link,
              source:      a.source_id ?? a.source_name ?? 'Source',
              publishedAt: a.pubDate ?? new Date().toISOString(),
              imageUrl:    a.image_url ?? null,
              category:    Array.isArray(a.category) ? a.category[0] : (a.category ?? 'news'),
              language:    a.language ?? lang,
            })));
          })
          .catch(e => { if (e.name !== 'AbortError') setError(lang === 'es' ? 'No se pudieron cargar las noticias.' : 'Could not load news.'); })
          .finally(() => setLoading(false));
      }, 0);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const clear = useCallback(() => {
    setArticles([]);
    setError(null);
    setLastKey('');
    lastFetchRef.current = null;
  }, []);

  return { articles, loading, error, search, fetchCategory, clear, hasResults: articles.length > 0 };
}
