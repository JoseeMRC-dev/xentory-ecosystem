import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BLOG_POSTS, CATEGORY_LABELS } from '../../constants';
import { useNews } from '../../hooks/useNews';
import type { NewsArticle } from '../../hooks/useNews';

const SUGGESTIONS = [
  'Bitcoin', 'Ethereum', 'EUR/USD', 'Real Madrid', 'NVDA',
  'Champions', 'BTC', 'S&P 500', 'Barça', 'Lakers',
];

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60_000);
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(diff / 86_400_000);
    if (m < 1)   return 'ahora';
    if (m < 60)  return `hace ${m}m`;
    if (h < 24)  return `hace ${h}h`;
    return `hace ${d}d`;
  } catch { return '' }
}

// ── News card ──────────────────────────────────────────────────────
function NewsCard({ article }: { article: NewsArticle }) {
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
            <span style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>{timeAgo(article.publishedAt)}</span>
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

// ── Section header ─────────────────────────────────────────────────
function SectionHeader({ category, count }: { category: string; count: number }) {
  const isAll  = category === 'all';
  const cat    = CATEGORY_LABELS[category];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', paddingBottom: '0.7rem', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '1.1rem' }}>{isAll ? '🌐' : cat?.emoji}</span>
      <span style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.95rem' }}>
        {isAll ? 'Últimas noticias' : `Noticias de ${cat?.label}`}
      </span>
      {count > 0 && (
        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: 100, background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          {count} resultados
        </span>
      )}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: '0.66rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        En tiempo real
      </span>
    </div>
  );
}

// ── Main blog page ─────────────────────────────────────────────────
export function BlogPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search,         setSearch]         = useState('');
  const [newsQuery,      setNewsQuery]       = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { articles, loading, error, search: fetchSearch, fetchCategory, clear, hasResults } = useNews();

  const isSearching = newsQuery.length >= 2;

  // On category change → fetch category news (unless user is searching)
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
      // Return to category view
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

  // Static blog posts filtered by category (shown below news)
  const staticFiltered = BLOG_POSTS.filter(p =>
    activeCategory === 'all' || p.category === activeCategory
  );

  return (
    <div style={{ paddingTop: 'calc(var(--bar-h) + 1.5rem)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '2.5rem clamp(1rem,4vw,2rem) 2rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.04), transparent 55%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.9rem', borderRadius: 100, background: 'var(--cyan-dim)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--cyan)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          📰 Blog & Noticias
        </div>
        <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.6rem)', marginBottom: '0.8rem' }}>
          Noticias y análisis en tiempo real
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto 1.8rem', lineHeight: 1.7, fontSize: '0.9rem' }}>
          Filtra por categoría o busca cualquier moneda, criptomoneda, equipo o jugador.
        </p>

        {/* Search */}
        <div style={{ maxWidth: 520, margin: '0 auto', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', zIndex: 1 }}>🔍</span>
            <input
              ref={inputRef}
              className="input"
              placeholder="Bitcoin, Real Madrid, EUR/USD, NVDA..."
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
                Búsquedas populares
              </div>
              {SUGGESTIONS.map(s => (
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
              ? <span>Buscando noticias sobre <strong style={{ color: 'var(--text)' }}>{newsQuery}</strong>...</span>
              : hasResults
                ? <span>{articles.length} noticias sobre <strong style={{ color: 'var(--gold)' }}>{newsQuery}</strong></span>
                : null}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 clamp(1rem,4vw,2rem) 5rem' }}>

        {/* Category tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', padding: '1rem 0 1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => handleCategoryClick('all')}
            style={{ padding: '0.4rem 1rem', borderRadius: 100, border: 'none', cursor: 'pointer', background: activeCategory === 'all' ? 'var(--gold)' : 'var(--card2)', color: activeCategory === 'all' ? 'var(--bg)' : 'var(--muted)', fontFamily: 'Urbanist', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s' }}>
            🌐 Todos
          </button>
          {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'platform').map(([key, cat]) => (
            <button key={key} onClick={() => handleCategoryClick(key)}
              style={{ padding: '0.4rem 1rem', borderRadius: 100, cursor: 'pointer', background: activeCategory === key ? `${cat.color}22` : 'var(--card2)', color: activeCategory === key ? cat.color : 'var(--muted)', fontFamily: 'Urbanist', fontWeight: 600, fontSize: '0.8rem', border: activeCategory === key ? `1px solid ${cat.color}50` : '1px solid var(--border)', transition: 'all 0.2s' }}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* News grid — always visible (search or category) */}
        <SectionHeader
          category={isSearching ? 'all' : activeCategory}
          count={loading ? 0 : articles.length}
        />

        {loading ? (
          <NewsSkeleton />
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>⚠️</div>
            <p style={{ fontSize: '0.88rem', marginBottom: '1rem' }}>{error}</p>
            <button className="btn btn-outline btn-sm" onClick={() => isSearching ? fetchSearch(newsQuery) : fetchCategory(activeCategory)}>
              Reintentar
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>🔍</div>
            <p style={{ fontSize: '0.88rem' }}>
              {isSearching ? `Sin noticias para "${newsQuery}"` : 'Sin noticias disponibles en este momento'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem', marginBottom: '3rem' }}>
            {articles.map(a => <NewsCard key={a.id} article={a} />)}
          </div>
        )}

        {/* Static blog posts — always shown below news */}
        {!isSearching && staticFiltered.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', paddingBottom: '0.7rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.1rem' }}>✍️</span>
              <span style={{ fontFamily: 'Urbanist', fontWeight: 700, fontSize: '0.95rem' }}>Análisis del equipo Xentory</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
              {staticFiltered.map(post => <BlogCard key={post.id} post={post} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Static blog card ───────────────────────────────────────────────
function BlogCard({ post, large }: { post: (typeof BLOG_POSTS)[0]; large?: boolean }) {
  const cat = CATEGORY_LABELS[post.category];
  return (
    <Link to={`/blog/${post.slug}`} className="blog-card glass"
      style={{ display: 'block', textDecoration: 'none', color: 'inherit', borderRadius: 14, overflow: 'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <div style={{ padding: large ? '2rem' : '1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <span style={{ fontSize: '0.7rem', color: cat.color, fontWeight: 500 }}>{cat.emoji} {cat.label}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{post.readTime} min</span>
        </div>
        <div style={{ fontSize: large ? '2.5rem' : '1.8rem', marginBottom: '0.8rem' }}>{post.imageEmoji}</div>
        <h3 style={{ fontSize: large ? '1.15rem' : '0.95rem', lineHeight: 1.35, marginBottom: '0.5rem' }}>{post.title}</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: large ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '1rem' }}>
          {post.excerpt}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            {new Date(post.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
          </span>
          <span style={{ fontSize: '0.75rem', color: cat.color }}>Leer →</span>
        </div>
      </div>
    </Link>
  );
}

// ── Blog post detail ───────────────────────────────────────────────
export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) return (
    <div style={{ paddingTop: 'calc(var(--bar-h) + 4rem)', textAlign: 'center', color: 'var(--muted)', minHeight: '100vh' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
      <h2>Artículo no encontrado</h2>
      <button onClick={() => navigate('/blog')} className="btn btn-outline" style={{ marginTop: '1.5rem' }}>← Volver al blog</button>
    </div>
  );

  const cat     = CATEGORY_LABELS[post.category];
  const related = BLOG_POSTS.filter(p => p.id !== post.id && p.category === post.category).slice(0, 3);

  return (
    <div style={{ paddingTop: 'calc(var(--bar-h) + 1.5rem)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem clamp(1rem,4vw,2rem) 5rem' }}>
        <button onClick={() => navigate('/blog')} className="btn btn-ghost btn-sm" style={{ marginBottom: '2rem' }}>
          ← Volver al blog
        </button>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '0.25rem 0.8rem', borderRadius: 100, fontSize: '0.72rem', background: `${cat.color}12`, color: cat.color, border: `1px solid ${cat.color}20` }}>
            {cat.emoji} {cat.label}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{post.readTime} min de lectura</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            {new Date(post.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.4rem)', marginBottom: '1rem', lineHeight: 1.2 }}>{post.title}</h1>
        <p style={{ color: 'var(--text2)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '2rem' }}>{post.excerpt}</p>
        <div style={{ textAlign: 'center', fontSize: '4rem', padding: '2rem', background: 'var(--card2)', borderRadius: 16, marginBottom: '2rem', border: '1px solid var(--border)' }}>
          {post.imageEmoji}
        </div>
        <div style={{ color: 'var(--text2)', fontSize: '0.95rem', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <p>Este análisis ha sido generado por el motor IA de {post.author} basándose en datos de mercado en tiempo real y análisis estadístico avanzado.</p>
          <p>El contexto técnico actual muestra una estructura {post.category === 'sports' ? 'estadística' : 'de precio'} relevante que merece atención.</p>
          <div className="glass" style={{ borderRadius: 12, padding: '1.2rem 1.5rem', borderLeft: `3px solid ${cat.color}` }}>
            <div style={{ fontSize: '0.72rem', color: cat.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>⚠️ Aviso legal</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
              Este contenido es de carácter informativo y no constituye asesoramiento financiero. {post.category === 'sports' ? 'Las predicciones deportivas conllevan incertidumbre inherente.' : 'Invertir conlleva riesgo de pérdida de capital.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          {post.tags.map(tag => (
            <span key={tag} style={{ padding: '0.2rem 0.7rem', borderRadius: 100, fontSize: '0.72rem', background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              #{tag}
            </span>
          ))}
        </div>
        {related.length > 0 && (
          <div style={{ marginTop: '3rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>Artículos relacionados</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {related.map(p => (
                <Link key={p.id} to={`/blog/${p.slug}`}
                  style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.9rem 1rem', background: 'var(--card2)', borderRadius: 10, textDecoration: 'none', color: 'inherit', border: '1px solid var(--border)', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <span style={{ fontSize: '1.4rem' }}>{p.imageEmoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{p.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{p.readTime} min</div>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
