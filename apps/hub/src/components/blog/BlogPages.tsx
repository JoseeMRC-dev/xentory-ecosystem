import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_LABELS } from '../../constants';
import { useNews } from '../../hooks/useNews';
import { useTrending } from '../../hooks/useTrending';
import { useLang } from '../../context/LanguageContext';
import type { NewsArticle } from '../../hooks/useNews';

const SUGGESTIONS: Record<'es' | 'en', string[]> = {
  es: ['Bitcoin', 'Ethereum', 'EUR/USD', 'Real Madrid', 'NVDA', 'Champions', 'BTC', 'S&P 500', 'Barça', 'Lakers'],
  en: ['Bitcoin', 'Ethereum', 'EUR/USD', 'Real Madrid', 'NVDA', 'Champions', 'BTC', 'S&P 500', 'Barcelona', 'Lakers'],
};

function timeAgo(dateStr: string, lang: 'es' | 'en'): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60_000);
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(diff / 86_400_000);
    if (lang === 'en') {
      if (m < 1)  return 'just now';
      if (m < 60) return `${m}m ago`;
      if (h < 24) return `${h}h ago`;
      return `${d}d ago`;
    }
    if (m < 1)  return 'ahora';
    if (m < 60) return `hace ${m}m`;
    if (h < 24) return `hace ${h}h`;
    return `hace ${d}d`;
  } catch { return '' }
}

// ── News card ──────────────────────────────────────────────────────
function NewsCard({ article, lang }: { article: NewsArticle; lang: 'es' | 'en' }) {
  const [imgError, setImgError] = useState(false);
  return (
    <a
      href={article.url} target="_blank" rel="noopener noreferrer"
      className="glass"
      style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', borderRadius: 14, overflow: 'hidden', transition: 'transform 0.2s, border-color 0.2s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {/* Image */}
      {article.imageUrl && !imgError ? (
        <div style={{ height: 155, overflow: 'hidden', background: 'var(--card2)', flexShrink: 0 }}>
          <img src={article.imageUrl} alt="" onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ) : (
        <div style={{ height: 72, background: 'linear-gradient(135deg,var(--gold-dim),var(--cyan-dim))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
          📰
        </div>
      )}

      <div style={{ padding: '1rem 1.1rem 1.1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.4, marginBottom: '0.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.title}
        </h3>
        {article.description && (
          <p style={{ fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '0.7rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {article.description}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
            <img src={`https://www.google.com/s2/favicons?domain=${article.source}&sz=16`} alt=""
              style={{ width: 13, height: 13, borderRadius: 2, flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {article.source}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>{timeAgo(article.publishedAt, lang)}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>↗</span>
          </div>
        </div>
      </div>
    </a>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────
function NewsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ height: 120, background: 'var(--card2)', animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
          <div style={{ padding: '1rem' }}>
            {[100, 80, 55].map((w, j) => (
              <div key={j} style={{ height: 11, background: 'var(--card2)', borderRadius: 6, marginBottom: '0.5rem', width: `${w}%`, animation: `pulse 1.5s ease-in-out ${i * 0.1 + j * 0.08}s infinite` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Trending card (compact horizontal) ─────────────────────────────
function TrendingCard({ article, rank, lang }: { article: NewsArticle; rank: number; lang: 'es'|'en' }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <a
      href={article.url} target="_blank" rel="noopener noreferrer"
      className="glass"
      style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', minWidth: 260, maxWidth: 300, flexShrink: 0, padding: '0.85rem 1rem', borderRadius: 14, textDecoration: 'none', color: 'inherit', transition: 'transform 0.18s, border-color 0.18s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {/* Rank number */}
      <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.4rem', color: rank <= 3 ? 'var(--gold)' : 'var(--border2)', lineHeight: 1, flexShrink: 0, width: 22, textAlign: 'center', paddingTop: 2 }}>{rank}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* Thumbnail */}
        {article.imageUrl && !imgErr && (
          <div style={{ height: 80, borderRadius: 8, overflow: 'hidden', marginBottom: '0.5rem', background: 'var(--card2)' }}>
            <img src={article.imageUrl} alt="" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <p style={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.title}
        </p>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.45rem' }}>
          <span style={{ fontSize: '0.66rem', color: 'var(--cyan)', fontWeight: 600 }}>{article.source}</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>· {timeAgo(article.publishedAt, lang)}</span>
        </div>
      </div>
    </a>
  );
}

// ── Trending section ────────────────────────────────────────────────
function TrendingSection({ lang }: { lang: 'es'|'en' }) {
  const { articles, loading } = useTrending();
  if (loading) return (
    <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
      {[0,1,2,3].map(i => (
        <div key={i} className="glass" style={{ minWidth: 260, height: 140, borderRadius: 14, flexShrink: 0, animation: `pulse 1.5s ease-in-out ${i*0.1}s infinite` }} />
      ))}
    </div>
  );
  if (!articles.length) return null;
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem' }}>
        <span style={{ fontSize: '1.1rem' }}>🔥</span>
        <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.95rem' }}>
          {lang === 'es' ? 'Lo más popular hoy' : 'Trending today'}
        </span>
        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: 'rgba(255,80,80,0.12)', color: '#ff5050', border: '1px solid rgba(255,80,80,0.25)', fontWeight: 600 }}>
          {lang === 'es' ? 'EN VIVO' : 'LIVE'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.75rem', scrollbarWidth: 'thin' }}>
        {articles.slice(0, 8).map((a, i) => (
          <TrendingCard key={a.id} article={a} rank={i + 1} lang={lang} />
        ))}
      </div>
    </div>
  );
}

// ── Main blog page ─────────────────────────────────────────────────
export function BlogPage() {
  const { lang, t } = useLang();
  const [activeCategory,   setActiveCategory]   = useState<string>('all');
  const [search,           setSearch]           = useState('');
  const [newsQuery,        setNewsQuery]         = useState('');
  const [showSuggestions,  setShowSuggestions]  = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { articles, loading, error, search: fetchSearch, fetchCategory, clear, hasResults } = useNews();

  const isSearching = newsQuery.length >= 2;

  // On category change → fetch category news
  useEffect(() => {
    if (isSearching) return;
    fetchCategory(activeCategory);
  }, [activeCategory]);

  // On mount → load "all" news
  useEffect(() => {
    fetchCategory('all');
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!newsQuery || newsQuery.length < 2) {
      clear();
      fetchCategory(activeCategory);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSearch(newsQuery), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [newsQuery]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setNewsQuery(val);
  };

  const handleSuggestion = (s: string) => {
    setSearch(s);
    setNewsQuery(s);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleCategoryClick = (key: string) => {
    setActiveCategory(key);
    if (!isSearching) fetchCategory(key);
  };

  const categoryLabel = (cat: (typeof CATEGORY_LABELS)[string]) =>
    lang === 'es' ? cat.label : (cat.labelEn ?? cat.label);

  return (
    <div style={{ paddingTop: 'calc(var(--bar-h) + 1.5rem)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '2.5rem clamp(1rem,4vw,2rem) 2rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.04), transparent 55%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.9rem', borderRadius: 100, background: 'var(--cyan-dim)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--cyan)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          📰 {t('Blog & Noticias', 'Blog & News')}
        </div>
        <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.6rem)', marginBottom: '0.8rem' }}>
          {t('Noticias y análisis en tiempo real', 'Real-time news & analysis')}
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto 1.8rem', lineHeight: 1.7, fontSize: '0.9rem' }}>
          {t(
            'Filtra por categoría o busca cualquier moneda, criptomoneda, equipo o jugador.',
            'Filter by category or search for any currency, crypto, team or player.'
          )}
        </p>

        {/* Search */}
        <div style={{ maxWidth: 520, margin: '0 auto', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', zIndex: 1 }}>🔍</span>
            <input
              ref={inputRef}
              className="input"
              placeholder={t('Bitcoin, Real Madrid, EUR/USD, NVDA...', 'Bitcoin, Real Madrid, EUR/USD, NVDA...')}
              value={search}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              style={{ paddingLeft: '2.6rem', paddingRight: search ? '2.6rem' : '1rem', width: '100%' }}
            />
            {search && (
              <button onClick={() => handleSearch('')}
                style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', lineHeight: 1 }}>
                ✕
              </button>
            )}
          </div>

          {/* Suggestions */}
          {showSuggestions && !search && (
            <div className="glass-2" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, borderRadius: 12, border: '1px solid var(--border2)', overflow: 'hidden', zIndex: 50, textAlign: 'left' }}>
              <div style={{ padding: '0.5rem 1rem', fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>
                {t('Búsquedas populares', 'Popular searches')}
              </div>
              {SUGGESTIONS[lang].map(s => (
                <button key={s} onMouseDown={() => handleSuggestion(s)}
                  style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '0.85rem', transition: 'background 0.15s', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <span style={{ fontSize: '0.75rem' }}>🔍</span> {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search status */}
        {isSearching && (
          <div style={{ marginTop: '0.8rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
            {loading
              ? <span>{t('Buscando noticias sobre', 'Searching news about')} <strong style={{ color: 'var(--text)' }}>{newsQuery}</strong>...</span>
              : hasResults
                ? <span>{articles.length} {t('noticias sobre', 'articles about')} <strong style={{ color: 'var(--gold)' }}>{newsQuery}</strong></span>
                : null}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 clamp(1rem,4vw,2rem) 5rem' }}>

        {/* Trending section — hidden while searching */}
        {!isSearching && <TrendingSection lang={lang as 'es'|'en'} />}

        {/* Category tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', padding: '1rem 0 1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => handleCategoryClick('all')}
            style={{ padding: '0.4rem 1rem', borderRadius: 100, border: 'none', cursor: 'pointer', background: activeCategory === 'all' ? 'var(--gold)' : 'var(--card2)', color: activeCategory === 'all' ? 'var(--bg)' : 'var(--muted)', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s' }}>
            🌐 {t('Todos', 'All')}
          </button>
          {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'platform').map(([key, cat]) => (
            <button key={key} onClick={() => handleCategoryClick(key)}
              style={{ padding: '0.4rem 1rem', borderRadius: 100, cursor: 'pointer', background: activeCategory === key ? `${cat.color}22` : 'var(--card2)', color: activeCategory === key ? cat.color : 'var(--muted)', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.8rem', border: activeCategory === key ? `1px solid ${cat.color}50` : '1px solid var(--border)', transition: 'all 0.2s' }}>
              {cat.emoji} {categoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', paddingBottom: '0.7rem', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '1.1rem' }}>
            {activeCategory === 'all' ? '🌐' : CATEGORY_LABELS[activeCategory]?.emoji}
          </span>
          <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.95rem' }}>
            {activeCategory === 'all'
              ? t('Últimas noticias', 'Latest news')
              : t(`Noticias de ${CATEGORY_LABELS[activeCategory]?.label}`, `${CATEGORY_LABELS[activeCategory]?.labelEn ?? CATEGORY_LABELS[activeCategory]?.label} news`)}
          </span>
          {!loading && articles.length > 0 && (
            <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              {articles.length} {t('resultados', 'results')}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '0.66rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            {t('En tiempo real', 'Real-time')}
          </span>
        </div>

        {loading ? (
          <NewsSkeleton />
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>⚠️</div>
            <p style={{ fontSize: '0.88rem', marginBottom: '1rem' }}>{error}</p>
            <button className="btn btn-outline btn-sm" onClick={() => isSearching ? fetchSearch(newsQuery) : fetchCategory(activeCategory)}>
              {t('Reintentar', 'Retry')}
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>🔍</div>
            <p style={{ fontSize: '0.88rem' }}>
              {isSearching
                ? t(`Sin noticias para "${newsQuery}"`, `No news for "${newsQuery}"`)
                : t('Sin noticias disponibles en este momento', 'No news available right now')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem', marginBottom: '3rem' }}>
            {articles.map(a => <NewsCard key={a.id} article={a} lang={lang} />)}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Blog post detail — redirects to /blog since all content is live ──
export function BlogPostPage() {
  const navigate    = useNavigate();
  const { t }       = useLang();
  useEffect(() => { navigate('/blog', { replace: true }); }, [navigate]);
  return (
    <div style={{ paddingTop: 'calc(var(--bar-h) + 4rem)', textAlign: 'center', color: 'var(--muted)', minHeight: '100vh' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📰</div>
      <p>{t('Redirigiendo...', 'Redirecting...')}</p>
    </div>
  );
}
