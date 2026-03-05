import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BLOG_POSTS, CATEGORY_LABELS } from '../../constants';

// ── BLOG LIST ──
export function BlogPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = BLOG_POSTS.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const featured = filtered.filter(p => p.featured);
  const rest = filtered.filter(p => !p.featured);

  return (
    <div style={{ paddingTop: 'calc(var(--nav-h) + 38px)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '4rem 2rem 2rem', background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.04), transparent 55%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.9rem', borderRadius: 100, background: 'var(--cyan-dim)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--cyan)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          📰 Blog & Análisis
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginBottom: '1rem' }}>
          Análisis de mercado & predicciones
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto 2rem', lineHeight: 1.7 }}>
          Contexto técnico semanal sobre cripto, bolsa, forex y deportes. Generado por nuestros motores IA.
        </p>

        {/* Search */}
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <input
            className="input"
            placeholder="Buscar análisis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ textAlign: 'center' }}
          />
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', padding: '1.5rem 2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveCategory('all')}
          style={{
            padding: '0.4rem 1rem', borderRadius: 100, border: 'none', cursor: 'pointer',
            background: activeCategory === 'all' ? 'var(--gold)' : 'var(--card2)',
            color: activeCategory === 'all' ? 'var(--bg)' : 'var(--muted)',
            fontFamily: 'Urbanist', fontWeight: 600, fontSize: '0.8rem',
            transition: 'all 0.2s',
          }}
        >
          Todos
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            style={{
              padding: '0.4rem 1rem', borderRadius: 100, border: 'none', cursor: 'pointer',
              background: activeCategory === key ? `${cat.color}20` : 'var(--card2)',
              color: activeCategory === key ? cat.color : 'var(--muted)',
              fontFamily: 'Urbanist', fontWeight: 600, fontSize: '0.8rem',
              border: activeCategory === key ? `1px solid ${cat.color}40` : '1px solid var(--border)',
              transition: 'all 0.2s',
            }}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 2rem 5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>
            No se encontraron artículos con ese filtro.
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem', marginBottom: '1.5rem' }}>
                {featured.map(post => <BlogCard key={post.id} post={post} large />)}
              </div>
            )}

            {/* Rest */}
            {rest.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {rest.map(post => <BlogCard key={post.id} post={post} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BlogCard({ post, large }: { post: (typeof BLOG_POSTS)[0]; large?: boolean }) {
  const cat = CATEGORY_LABELS[post.category];
  return (
    <Link to={`/blog/${post.slug}`} className="blog-card glass" style={{ display: 'block', textDecoration: 'none', color: 'inherit', borderRadius: 14, overflow: 'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <div style={{ padding: large ? '2rem' : '1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <span style={{ fontSize: '0.7rem', color: cat.color, fontWeight: 500 }}>{cat.emoji} {cat.label}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{post.readTime} min</span>
        </div>
        <div style={{ fontSize: large ? '2.5rem' : '1.8rem', marginBottom: '0.8rem' }}>{post.imageEmoji}</div>
        <h3 style={{ fontSize: large ? '1.15rem' : '0.95rem', lineHeight: 1.35, marginBottom: '0.5rem' }}>{post.title}</h3>
        <p style={{
          color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: large ? 3 : 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
          marginBottom: '1rem',
        }}>
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

// ── BLOG POST DETAIL ──
export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) return (
    <div style={{ paddingTop: 'calc(var(--nav-h) + 38px + 4rem)', textAlign: 'center', color: 'var(--muted)', minHeight: '100vh' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
      <h2>Artículo no encontrado</h2>
      <button onClick={() => navigate('/blog')} className="btn btn-outline" style={{ marginTop: '1.5rem' }}>← Volver al blog</button>
    </div>
  );

  const cat = CATEGORY_LABELS[post.category];
  const related = BLOG_POSTS.filter(p => p.id !== post.id && p.category === post.category).slice(0, 3);

  return (
    <div style={{ paddingTop: 'calc(var(--nav-h) + 38px)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 2rem 5rem' }}>

        {/* Back */}
        <button onClick={() => navigate('/blog')} className="btn btn-ghost btn-sm" style={{ marginBottom: '2rem' }}>
          ← Volver al blog
        </button>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '0.25rem 0.8rem', borderRadius: 100, fontSize: '0.72rem', background: `${cat.color}12`, color: cat.color, border: `1px solid ${cat.color}20` }}>
            {cat.emoji} {cat.label}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{post.readTime} min de lectura</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            {new Date(post.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', marginBottom: '1rem', lineHeight: 1.2 }}>{post.title}</h1>
        <p style={{ color: 'var(--text2)', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: '2rem' }}>{post.excerpt}</p>

        {/* Hero emoji */}
        <div style={{ textAlign: 'center', fontSize: '4rem', padding: '2rem', background: 'var(--card2)', borderRadius: 16, marginBottom: '2rem', border: '1px solid var(--border)' }}>
          {post.imageEmoji}
        </div>

        {/* Content (mock) */}
        <div style={{ color: 'var(--text2)', fontSize: '0.95rem', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <p>Este análisis ha sido generado por el motor IA de {post.author} basándose en datos de mercado en tiempo real y análisis estadístico avanzado.</p>
          <p>El contexto técnico actual muestra una estructura {post.category === 'sports' ? 'estadística' : 'de precio'} relevante que merece atención. Los indicadores analizados sugieren que los niveles clave mencionados en el titular son de especial importancia para el corto-medio plazo.</p>
          <div className="glass" style={{ borderRadius: 12, padding: '1.2rem 1.5rem', borderLeft: `3px solid ${cat.color}` }}>
            <div style={{ fontSize: '0.72rem', color: cat.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>⚠️ Aviso legal</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
              Este contenido es de carácter informativo y no constituye asesoramiento financiero. {post.category === 'sports' ? 'Las predicciones deportivas conllevan incertidumbre inherente.' : 'Invertir conlleva riesgo de pérdida de capital.'}
            </p>
          </div>
          <p>Para acceder al análisis completo con datos en tiempo real y señales actualizadas, activa tu plan Pro en Xentory Market o Xentory Bet.</p>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          {post.tags.map(tag => (
            <span key={tag} style={{ padding: '0.2rem 0.7rem', borderRadius: 100, fontSize: '0.72rem', background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              #{tag}
            </span>
          ))}
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{ marginTop: '3rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>Artículos relacionados</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {related.map(p => (
                <Link key={p.id} to={`/blog/${p.slug}`} style={{
                  display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.9rem 1rem',
                  background: 'var(--card2)', borderRadius: 10, textDecoration: 'none', color: 'inherit',
                  border: '1px solid var(--border)', transition: 'border-color 0.2s',
                }}
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
