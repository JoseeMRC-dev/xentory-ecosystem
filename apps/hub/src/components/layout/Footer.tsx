import { Link } from 'react-router-dom';

const LOGO_BLUE = '#4d9fff';

export function Footer() {
  const year = new Date().getFullYear();

  const cols = [
    {
      title: 'Plataformas',
      links: [
        { label: 'Xentory Market', to: '#' },
        { label: 'Xentory Bet',    to: '#' },
        { label: 'Bot Telegram',   to: '#' },
      ],
    },
    {
      title: 'Producto',
      links: [
        { label: 'Precios',        to: '/pricing' },
        { label: 'Metodología',    to: '/metodologia' },
        { label: 'Blog',           to: '/blog' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Términos de uso', to: '/terminos' },
        { label: 'Privacidad',      to: '/terminos' },
        { label: 'Cookies',         to: '/terminos' },
      ],
    },
  ];

  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: 'clamp(2rem,5vw,4rem) clamp(1.2rem,5vw,3rem) 0' }}>

        {/* Top grid — brand + cols */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: 'clamp(1.5rem,4vw,3rem)',
          marginBottom: 'clamp(1.5rem,4vw,3rem)',
        }}>

          {/* Brand */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ fontFamily: 'Urbanist', fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.8rem' }}>
              <span className="text-gradient-gold">Xen</span>
              <span style={{ color: LOGO_BLUE }}>tory</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.7, maxWidth: 240 }}>
              Análisis financiero y deportivo con IA. Una cuenta, dos plataformas.
            </p>
            {/* Icons */}
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
              {['₿', '📈', '⚽'].map((e, i) => (
                <div key={i} style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: 'var(--card2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
                }}>
                  {e}
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.title}>
              <h4 style={{
                fontSize: '0.7rem', textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--muted)',
                marginBottom: '1rem', fontWeight: 600,
              }}>
                {col.title}
              </h4>
              {col.links.map(item => (
                item.to.startsWith('/') ? (
                  <Link key={item.label} to={item.to} style={{
                    display: 'block', color: 'var(--text2)', fontSize: '0.83rem',
                    marginBottom: '0.6rem', textDecoration: 'none', transition: 'color 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.label} href={item.to} style={{
                    display: 'block', color: 'var(--text2)', fontSize: '0.83rem',
                    marginBottom: '0.6rem', textDecoration: 'none', transition: 'color 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
                  >
                    {item.label}
                  </a>
                )
              ))}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Bottom — copyright + disclaimer */}
        <div style={{
          padding: 'clamp(1rem,3vw,1.5rem) 0',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          alignItems: 'center', textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            © {year} <span style={{ color: 'var(--text2)', fontWeight: 500 }}>Xentory</span> · Todos los derechos reservados
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--muted)', maxWidth: 560, lineHeight: 1.6 }}>
            Los análisis generados por IA tienen carácter informativo y no constituyen asesoramiento financiero. Invertir y apostar conlleva riesgo de pérdida de capital.
          </p>
        </div>

      </div>
    </footer>
  );
}
