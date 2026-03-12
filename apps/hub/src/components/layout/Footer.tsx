import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';

const LOGO_CYAN = 'var(--cyan)';

export function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  const cols = [
    {
      title: t('footer.platforms'),
      links: [
        { label: t('footer.market'),    to: '#' },
        { label: t('footer.bet'),       to: '#' },
        { label: t('footer.telegram'),  to: '#' },
      ],
    },
    {
      title: t('footer.product'),
      links: [
        { label: t('footer.pricing'),      to: '/pricing'    },
        { label: t('footer.methodology'),  to: '/metodologia' },
        { label: t('footer.blog'),         to: '/blog'        },
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

  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.2rem,5vw,2.5rem) 0' }}>

        {/* Grid */}
        <div className="footer-grid" style={{ marginBottom: 'clamp(2rem,4vw,3rem)' }}>

          {/* Brand column */}
          <div>
            {/* Logo */}
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.9rem', letterSpacing: '-0.04em' }}>
              <span className="text-gradient-gold">Xen</span>
              <span style={{ color: LOGO_CYAN }}>tory</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.75, maxWidth: 240, marginBottom: '1.2rem' }}>
              {t('footer.tagline')}
            </p>
            {/* Icon row — abstract data marks, no emojis */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                <svg key="m" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                <svg key="t" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
                <svg key="b" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
              ].map((icon, i) => (
                <div key={i} style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--card2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                  {icon}
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.title}>
              <h4 style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '1rem', fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
                {col.title}
              </h4>
              {col.links.map(item => (
                item.to.startsWith('/') ? (
                  <Link key={item.label} to={item.to} style={{ display: 'block', color: 'var(--text2)', fontSize: '0.83rem', marginBottom: '0.6rem', textDecoration: 'none', transition: 'color 0.18s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
                  >{item.label}</Link>
                ) : (
                  <a key={item.label} href={item.to} style={{ display: 'block', color: 'var(--text2)', fontSize: '0.83rem', marginBottom: '0.6rem', textDecoration: 'none', transition: 'color 0.18s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
                  >{item.label}</a>
                )
              ))}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Bottom */}
        <div style={{ padding: 'clamp(1rem,3vw,1.5rem) 0', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
            © {year} <span style={{ color: 'var(--text2)', fontWeight: 500 }}>Xentory</span> · {t('footer.rights')}
          </p>
          <p style={{ fontSize: '0.68rem', color: 'var(--muted)', maxWidth: 560, lineHeight: 1.65 }}>
            {t('footer.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
}
