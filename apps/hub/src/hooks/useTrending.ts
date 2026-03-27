/**
 * useTrending — artículos más populares del momento
 * Fuentes: The Guardian (most-viewed) + Hacker News (top stories)
 * Sin API key, CORS ✓, caché 15 min
 */
import { useState, useEffect, useRef } from 'react';
import { useLang } from '../context/LanguageContext';
import type { NewsArticle } from './useNews';

const GU  = 'https://content.guardianapis.com/search';
const HN  = 'https://hn.algolia.com/api/v1/search';
const TTL = 15 * 60 * 1000;

async function fetchGuardianTrending(lang: string, signal: AbortSignal): Promise<NewsArticle[]> {
  const q = lang === 'es'
    ? 'economia finanzas deporte tecnologia mundo'
    : 'business sport technology world finance';
  const params = new URLSearchParams({
    'api-key': 'test', q,
    'show-fields': 'thumbnail,trailText',
    'page-size': '8', 'order-by': 'relevance',
  });
  const res  = await fetch(`${GU}?${params}`, { signal });
  if (!res.ok) throw new Error(`Guardian ${res.status}`);
  const data = await res.json();
  if (data.response?.status !== 'ok') throw new Error('Guardian error');
  return (data.response?.results ?? []).map((a: any): NewsArticle => ({
    id:          a.id,
    title:       a.webTitle,
    description: a.fields?.trailText ?? null,
    url:         a.webUrl,
    source:      'The Guardian',
    publishedAt: a.webPublicationDate,
    imageUrl:    a.fields?.thumbnail ?? null,
    category:    a.sectionId,
    language:    'en',
  }));
}

async function fetchHNTrending(signal: AbortSignal): Promise<NewsArticle[]> {
  const params = new URLSearchParams({ tags: 'story', hitsPerPage: '8', numericFilters: `created_at_i>${Math.floor((Date.now() - 86400000) / 1000)}` });
  const res    = await fetch(`${HN}?${params}`, { signal });
  if (!res.ok) throw new Error(`HN ${res.status}`);
  const data   = await res.json();
  return (data.hits ?? [])
    .filter((h: any) => h.title && h.url && h.points > 50)
    .slice(0, 8)
    .map((h: any): NewsArticle => ({
      id:          h.objectID,
      title:       h.title,
      description: null,
      url:         h.url,
      source:      h.url ? new URL(h.url).hostname.replace('www.', '') : 'Hacker News',
      publishedAt: new Date(h.created_at_i * 1000).toISOString(),
      imageUrl:    null,
      category:    'technology',
      language:    'en',
    }));
}

export function useTrending() {
  const { lang } = useLang();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading,  setLoading]  = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cKey = `xentory_trending_${lang}`;
    try {
      const raw = localStorage.getItem(cKey);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < TTL) { setArticles(data); return; }
      }
    } catch {}

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setLoading(true);

    const run = async () => {
      try {
        let mapped = await fetchGuardianTrending(lang, signal);
        if (!mapped.length) mapped = await fetchHNTrending(signal);
        try { localStorage.setItem(cKey, JSON.stringify({ data: mapped, ts: Date.now() })); } catch {}
        setArticles(mapped);
      } catch (e: any) {
        if (e.name !== 'AbortError') setArticles([]);
      } finally {
        setLoading(false);
      }
    };
    run();

    return () => abortRef.current?.abort();
  }, [lang]);

  return { articles, loading };
}
