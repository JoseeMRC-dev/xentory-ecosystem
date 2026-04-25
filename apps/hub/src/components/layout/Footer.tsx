import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';

const MARKET_URL = (import.meta as any).env?.VITE_MARKET_URL ?? 'https://xentory-ecosystem-market.vercel.app';
const BET_URL    = (import.meta as any).env?.VITE_BET_URL    ?? 'https://xentory-bet.vercel.app';

export function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  const cols = [
    {
      title: t('footer.platforms'),
      links: [
        { label: t('footer.market'),   href: MARKET_URL },
        { label: t('footer.bet'),      href: BET_URL     },
        { label: t('footer.telegram'), href: 'https://t.me/XentoryBot' },
      ],
    },
    {
      title: t('footer.product'),
      links: [
        { label: t('footer.pricing'),     to: '/pricing'     },
        { label: t('footer.methodology'), to: '/metodologia' },
        { label: t('footer.blog'),        to: '/blog'        },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.terms'),   to: '/terminos' },
        { label: t('footer.privacy'), to: '/terminos' },
        { label: t('footer.cookies'), to: '/terminos' },
      ],
    },
  ];

  const footerStyle = {
    background: '#0F1A14',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  };

  const textMuted  = 'rgba(242,237,228,0.38)';
  const textBody   = 'rgba(242,237,228,0.55)';
  const textHover  = 'rgba(242,237,228,0.85)';

  return (
    <footer style={footerStyle}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.2rem,5vw,2.5rem) 0' }}>

        {/* Grid */}
        <div className="footer-grid" style={{ marginBottom: 'clamp(2rem,4vw,3rem)' }}>

          {/* Brand column */}
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal', fontSize: '1.2rem', marginBottom: '0.9rem', color: '#F2EDE4', letterSpacing: '-0.01em' }}>
              Xentory
            </div>
            <p style={{ color: textBody, fontSize: '0.82rem', lineHeight: 1.75, maxWidth: 240, marginBottom: '1.4rem' }}>
              {t('footer.tagline')}
            </p>
            {/* SSL badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: textMuted, fontSize: '0.65rem', letterSpacing: '0.05em' }}>
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <rect x="1" y="5" width="8" height="6" rx="1"/>
                <path d="M3 5V3.5a2 2 0 0 1 4 0V5"/>
              </svg>
              Stripe SSL · Pagos seguros
            </div>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.title}>
              <h4 style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: textMuted, marginBottom: '1rem', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                {col.title}
              </h4>
              {col.links.map(item => {
                const linkStyle = { display: 'block', color: textBody, fontSize: '0.83rem', marginBottom: '0.6rem', textDecoration: 'none', transition: 'color 0.18s' };
                if ('to' in item) {
                  return (
                    <Link key={item.label} to={item.to!} style={linkStyle}
                      onMouseEnter={e => (e.currentTarget.style.color = textHover)}
                      onMouseLeave={e => (e.currentTarget.style.color = textBody)}
                    >{item.label}</Link>
                  );
                }
                return (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" style={linkStyle}
                    onMouseEnter={e => (e.currentTarget.style.color = textHover)}
                    onMouseLeave={e => (e.currentTarget.style.color = textBody)}
                  >{item.label}</a>
                );
              })}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        {/* Bottom row */}
        <div style={{ padding: 'clamp(1rem,3vw,1.5rem) 0', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.74rem', color: textMuted }}>
            © {year} <span style={{ color: textBody, fontWeight: 500 }}>Xentory</span> · {t('footer.rights')}
          </p>
          <p style={{ fontSize: '0.68rem', color: textMuted, maxWidth: 560, lineHeight: 1.65 }}>
            {t('footer.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
}
