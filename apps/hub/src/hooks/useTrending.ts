/**
 * useTrending — top posts del día desde Reddit (sin API key, CORS-friendly)
 * Caché 15 min en localStorage.
 */
import { useState, useEffect, useRef } from 'react';
import { useLang } from '../context/LanguageContext';
import type { NewsArticle } from './useNews';

const SUBS = {
  es: 'worldnews+CryptoCurrency+futbol+stocks+technology',
  en: 'worldnews+CryptoCurrency+soccer+stocks+technology',
};
const CACHE_TTL = 15 * 60 * 1000;

function mapPost(p: any): NewsArticle | null {
  const d = p?.data;
  if (!d?.title || d.stickied || !d.url) return null;
  const preview = d.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&') ?? null;
  const thumb   = d.thumbnail?.startsWith('http') && !d.thumbnail.includes('redd.it') ? d.thumbnail : null;
  return {
    id:          d.id,
    title:       d.title,
    description: d.selftext?.trim() ? d.selftext.slice(0, 160) : null,
    url:         d.url_overridden_by_dest ?? d.url,
    source:      `r/${d.subreddit}`,
    publishedAt: new Date(d.created_utc * 1000).toISOString(),
    imageUrl:    preview ?? thumb,
    category:    d.subreddit,
    language:    'en',
  };
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
        if (Date.now() - ts < CACHE_TTL) { setArticles(data); return; }
      }
    } catch {}

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);

    const subs = lang === 'es' ? SUBS.es : SUBS.en;
    fetch(`https://www.reddit.com/r/${subs}/top.json?t=day&limit=10&raw_json=1`, {
      signal: abortRef.current.signal,
    })
      .then(r => r.json())
      .then(data => {
        const mapped = (data?.data?.children ?? [])
          .map(mapPost)
          .filter(Boolean) as NewsArticle[];
        try { localStorage.setItem(cKey, JSON.stringify({ data: mapped, ts: Date.now() })); } catch {}
        setArticles(mapped);
      })
      .catch(e => { if (e.name !== 'AbortError') setArticles([]); })
      .finally(() => setLoading(false));

    return () => abortRef.current?.abort();
  }, [lang]);

  return { articles, loading };
}
