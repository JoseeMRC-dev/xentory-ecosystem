const SITE_NAME = 'Radar IA';
const SITE_TAGLINE = 'Noticias, herramientas y guías de inteligencia artificial, al día';
const SITE_URL = process.env.SITE_URL || 'https://radar-ia.example';
const ADSENSE_CLIENT = process.env.ADSENSE_CLIENT_ID || 'ca-pub-0000000000000000';
const ADSENSE_SLOT_TOP = process.env.ADSENSE_SLOT_TOP || '0000000000';
const ADSENSE_SLOT_INARTICLE = process.env.ADSENSE_SLOT_INARTICLE || '0000000000';
const ADSENSE_SLOT_BOTTOM = process.env.ADSENSE_SLOT_BOTTOM || '0000000000';

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/noticias.html', label: 'Noticias' },
  { href: '/articulos.html', label: 'Guías' },
  { href: '/sobre-nosotros.html', label: 'Sobre nosotros' },
  { href: '/contacto.html', label: 'Contacto' },
];

function nav(activePath) {
  return NAV_LINKS.map(
    (l) =>
      `<a href="${l.href}" class="nav-link${activePath === l.href ? ' active' : ''}">${l.label}</a>`
  ).join('\n');
}

function adSlot({ slotId, format = 'auto', label = 'Publicidad' }) {
  return `
  <div class="ad-slot" aria-label="${label}">
    <span class="ad-label">${label}</span>
    <ins class="adsbygoogle"
      style="display:block"
      data-ad-client="${ADSENSE_CLIENT}"
      data-ad-slot="${slotId}"
      data-ad-format="${format}"
      data-full-width-responsive="true"></ins>
  </div>`;
}

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
}

export function renderPage({
  title,
  description,
  path,
  bodyHtml,
  isArticle = false,
  article = null,
  extraHead = '',
  jsonLdData = null,
}) {
  const fullTitle = title === SITE_NAME ? title : `${title} · ${SITE_NAME}`;
  const canonical = `${SITE_URL}${path}`;
  const ogImage = `${SITE_URL}/img/og-default.svg`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${fullTitle}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonical}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="stylesheet" href="/css/style.css" />

<meta property="og:type" content="${isArticle ? 'article' : 'website'}" />
<meta property="og:title" content="${fullTitle}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${fullTitle}" />
<meta name="twitter:description" content="${description}" />

<meta name="google-adsense-account" content="${ADSENSE_CLIENT}" />
${jsonLdData ? jsonLd(jsonLdData) : ''}
${extraHead}
</head>
<body>
<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="brand">
      <span class="brand-mark">X</span>
      <span class="brand-text">${SITE_NAME}</span>
    </a>
    <button class="nav-toggle" id="navToggle" aria-label="Abrir menú" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <nav class="site-nav" id="siteNav">
      ${nav(path)}
    </nav>
  </div>
</header>

<main>
${bodyHtml}
</main>

<footer class="site-footer">
  <div class="container footer-inner">
    <div class="footer-brand">
      <span class="brand-mark">X</span> ${SITE_NAME}
      <p>${SITE_TAGLINE}</p>
    </div>
    <div class="footer-links">
      <div>
        <h4>Sitio</h4>
        <a href="/articulos.html">Artículos</a>
        <a href="/sobre-nosotros.html">Sobre nosotros</a>
        <a href="/contacto.html">Contacto</a>
      </div>
      <div>
        <h4>Legal</h4>
        <a href="/privacidad.html">Política de privacidad</a>
        <a href="/cookies.html">Política de cookies</a>
        <a href="/terminos.html">Términos de uso</a>
      </div>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>© ${new Date().getFullYear()} ${SITE_NAME}. Todos los derechos reservados.</p>
  </div>
</footer>

<div class="cookie-banner" id="cookieBanner" hidden>
  <p>Usamos cookies propias y de terceros (incluido Google AdSense) para analizar el tráfico y mostrar anuncios personalizados. Puedes leer más en nuestra <a href="/cookies.html">política de cookies</a>.</p>
  <div class="cookie-actions">
    <button id="cookieReject" class="btn btn-ghost">Rechazar</button>
    <button id="cookieAccept" class="btn btn-primary">Aceptar</button>
  </div>
</div>

<button id="backToTop" class="back-to-top" aria-label="Volver arriba" hidden>↑</button>

<script>window.__ADSENSE_CLIENT__ = "${ADSENSE_CLIENT}";</script>
<script src="/js/main.js" defer></script>
</body>
</html>`;
}

export { adSlot, SITE_NAME, SITE_TAGLINE, SITE_URL, ADSENSE_CLIENT, ADSENSE_SLOT_TOP, ADSENSE_SLOT_INARTICLE, ADSENSE_SLOT_BOTTOM };
