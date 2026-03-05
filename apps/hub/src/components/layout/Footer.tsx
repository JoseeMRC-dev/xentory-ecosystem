import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(20px)',
      padding: '4rem 3rem 2rem',
    }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>

          {/* Brand */}
          <div>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.8rem' }}>
              <span className="text-gradient-gold">Xen</span>
              <span style={{ color: 'var(--cyan)' }}>tory</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.7, maxWidth: 260 }}>
              Ecosistema de análisis financiero y deportivo impulsado por inteligencia artificial. Una cuenta, dos plataformas.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.2rem' }}>
              {['₿', '📈', '⚽'].map((e, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--card2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                }}>
                  {e}
                </div>
              ))}
            </div>
          </div>

          {/* Plataformas */}
          <div>
            <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '1.2rem' }}>
              Plataformas
            </h4>
            {['Xentory Market', 'Xentory Bet', 'Bot Telegram', 'API'].map(item => (
              <a key={item} href='#' style={{ display: 'block', color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '0.65rem', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}>
                {item}
              </a>
            ))}
          </div>

          {/* Producto */}
          <div>
            <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '1.2rem' }}>
              Producto
            </h4>
            {[
              { label: 'Precios', to: '/pricing' },
              { label: 'Blog', to: '/blog' },
              { label: 'Cómo funciona', to: '/#how' },
            ].map(item => (
              <Link key={item.label} to={item.to} style={{ display: 'block', color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '0.65rem', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '1.2rem' }}>
              Legal
            </h4>
            {[{label:'Términos de uso', to:'/terminos'}, {label:'Privacidad', to:'/terminos'}, {label:'Aviso legal', to:'/terminos'}, {label:'Cookies', to:'/terminos'}].map(item => (
              <a key={item.label} href={item.to} style={{ display: 'block', color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '0.65rem', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: '2rem', borderTop: '1px solid var(--border)',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            © 2025 Xentory · Análisis generados por IA con fines informativos. No constituyen asesoramiento financiero ni garantizan rentabilidad.
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--muted)', maxWidth: 480, textAlign: 'right' }}>
            Xentory no proporciona asesoramiento financiero ni de apuestas. Toda la información tiene carácter informativo. Invertir y apostar conlleva riesgo de pérdida de capital.
          </p>
        </div>
      </div>
    </footer>
  );
}
