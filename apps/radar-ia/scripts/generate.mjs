import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage, adSlot, SITE_NAME, SITE_URL, ADSENSE_CLIENT, ADSENSE_SLOT_TOP, ADSENSE_SLOT_INARTICLE, ADSENSE_SLOT_BOTTOM } from '../templates/layout.mjs';
import { articles, CATEGORIES, getArticlesByCategory } from '../content/articles.mjs';
import { fetchAiNews } from '../lib/fetchNews.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');

function write(filePath, content) {
  const full = path.join(DIST, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

function articleCard(a) {
  return `
  <article class="card">
    <a href="/articulos/${a.slug}.html" class="card-link">
      <span class="card-category">${a.category}</span>
      <h3>${a.title}</h3>
      <p>${a.description}</p>
      <span class="card-meta">${formatDate(a.date)} · ${a.readTime} min de lectura</span>
    </a>
  </article>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function newsItemHtml(item) {
  let date = '';
  if (item.pubDate) {
    const d = new Date(item.pubDate);
    if (!Number.isNaN(d.getTime())) date = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
  return `
  <li class="news-item">
    <a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
    <span class="news-meta">${escapeHtml(item.source || 'Fuente externa')}${date ? ' · ' + date : ''}</span>
  </li>`;
}

function relatedArticles(current) {
  const others = articles.filter((a) => a.slug !== current.slug && a.category === current.category);
  const pool = others.length ? others : articles.filter((a) => a.slug !== current.slug);
  return pool.slice(0, 3);
}

// ---------- Home page ----------
function buildHome(newsItems) {
  const latest = [...articles].sort((a, b) => new Date(b.date) - new Date(a.date));
  const featured = latest.slice(0, 3);
  const rest = latest.slice(3);
  const homeNews = newsItems.slice(0, 6);

  const newsSection = homeNews.length
    ? `
<section class="container news-home">
  <div class="news-home-header">
    <h2 class="section-title">Últimas noticias de IA</h2>
    <a href="/noticias.html" class="btn btn-ghost">Ver todas</a>
  </div>
  <ul class="news-list">
    ${homeNews.map(newsItemHtml).join('\n')}
  </ul>
</section>`
    : '';

  const body = `
<section class="hero">
  <div class="container">
    <h1>Inteligencia artificial al día: noticias, herramientas y guías prácticas</h1>
    <p class="hero-sub">Titulares de IA actualizados automáticamente varias veces al día, además de guías escritas para aplicarse el mismo día que las lees.</p>
    <div class="hero-actions">
      <a href="/noticias.html" class="btn btn-primary">Ver noticias de hoy</a>
      <a href="#articulos" class="btn btn-ghost">Ver guías</a>
    </div>
  </div>
</section>

${adSlot({ slotId: ADSENSE_SLOT_TOP, label: 'Publicidad' })}

${newsSection}

<section class="container" id="articulos">
  <h2 class="section-title">Guías destacadas</h2>
  <div class="card-grid">
    ${featured.map(articleCard).join('\n')}
  </div>

  <h2 class="section-title">Más guías</h2>
  <div class="card-grid">
    ${rest.map(articleCard).join('\n')}
  </div>
</section>

<section class="container categories">
  <h2 class="section-title">Explora por categoría</h2>
  <div class="category-grid">
    ${CATEGORIES.map(
      (c) => `<a class="category-pill" href="/articulos.html#${encodeURIComponent(c)}">${c}</a>`
    ).join('\n')}
  </div>
</section>
`;

  write(
    'index.html',
    renderPage({
      title: SITE_NAME,
      description: 'Noticias de inteligencia artificial actualizadas al día, además de guías prácticas de IA, productividad y automatización.',
      path: '/',
      bodyHtml: body,
      jsonLdData: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
      },
    })
  );
}

// ---------- Noticias (auto-actualizadas) ----------
function buildNoticias(newsItems) {
  const buildDate = new Date().toISOString();
  const listHtml = newsItems.length
    ? newsItems.map(newsItemHtml).join('\n')
    : '<li class="news-item news-empty">Cargando titulares en directo… si no aparecen, vuelve a cargar la página en unos segundos.</li>';

  const body = `
<section class="container page-header">
  <h1>Noticias de IA al día</h1>
  <p>Titulares recientes sobre inteligencia artificial, recopilados automáticamente desde medios externos. Haz clic en cualquier titular para leer la noticia completa en la fuente original.</p>
  <p class="news-status" id="live-news-status">${
    newsItems.length ? 'Última actualización del contenido estático: ' + formatDate(buildDate) : 'Buscando la actualización más reciente…'
  }</p>
</section>

${adSlot({ slotId: ADSENSE_SLOT_TOP, label: 'Publicidad' })}

<section class="container">
  <ul class="news-list" id="live-news-list">
    ${listHtml}
  </ul>
</section>

${adSlot({ slotId: ADSENSE_SLOT_BOTTOM, label: 'Publicidad' })}
`;

  write(
    'noticias.html',
    renderPage({
      title: 'Noticias de IA al día',
      description: 'Titulares de actualidad sobre inteligencia artificial, actualizados automáticamente varias veces al día desde medios externos.',
      path: '/noticias.html',
      bodyHtml: body,
      extraHead: '<script src="/js/news.js" defer></script>',
      jsonLdData: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Noticias de IA al día',
        url: `${SITE_URL}/noticias.html`,
      },
    })
  );
}

// ---------- Article listing page ----------
function buildArticlesList() {
  const sections = CATEGORIES.map((cat) => {
    const items = getArticlesByCategory(cat);
    if (!items.length) return '';
    return `
    <div class="category-section" id="${encodeURIComponent(cat)}">
      <h2 class="section-title">${cat}</h2>
      <div class="card-grid">
        ${items.map(articleCard).join('\n')}
      </div>
    </div>`;
  }).join('\n');

  const body = `
<section class="container page-header">
  <h1>Todos los artículos</h1>
  <p>Guías organizadas por categoría sobre IA, productividad y negocio.</p>
</section>
${adSlot({ slotId: ADSENSE_SLOT_TOP })}
<section class="container">
  ${sections}
</section>
`;

  write(
    'articulos.html',
    renderPage({
      title: 'Todos los artículos',
      description: 'Índice completo de artículos sobre inteligencia artificial, productividad y automatización, organizados por categoría.',
      path: '/articulos.html',
      bodyHtml: body,
    })
  );
}

// ---------- Article pages ----------
function buildArticles() {
  for (const a of articles) {
    const related = relatedArticles(a);
    const body = `
<article class="container article">
  <header class="article-header">
    <span class="card-category">${a.category}</span>
    <h1>${a.title}</h1>
    <p class="article-meta">Publicado el ${formatDate(a.date)} · ${a.readTime} min de lectura · Por el equipo de ${SITE_NAME}</p>
  </header>

  ${adSlot({ slotId: ADSENSE_SLOT_TOP, label: 'Publicidad' })}

  <div class="article-body">
    ${a.html}
  </div>

  ${adSlot({ slotId: ADSENSE_SLOT_INARTICLE, label: 'Publicidad' })}

  <footer class="article-footer">
    <p class="article-share">
      Comparte este artículo:
      <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(SITE_URL + '/articulos/' + a.slug + '.html')}&text=${encodeURIComponent(a.title)}" target="_blank" rel="noopener noreferrer">X / Twitter</a>
      ·
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL + '/articulos/' + a.slug + '.html')}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      ·
      <a href="mailto:?subject=${encodeURIComponent(a.title)}&body=${encodeURIComponent(SITE_URL + '/articulos/' + a.slug + '.html')}">Correo</a>
    </p>
  </footer>
</article>

<section class="container related">
  <h2 class="section-title">Quizá también te interese</h2>
  <div class="card-grid">
    ${related.map(articleCard).join('\n')}
  </div>
</section>

${adSlot({ slotId: ADSENSE_SLOT_BOTTOM, label: 'Publicidad' })}
`;

    write(
      `articulos/${a.slug}.html`,
      renderPage({
        title: a.title,
        description: a.description,
        path: `/articulos/${a.slug}.html`,
        bodyHtml: body,
        isArticle: true,
        jsonLdData: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.title,
          description: a.description,
          datePublished: a.date,
          author: { '@type': 'Organization', name: SITE_NAME },
          publisher: { '@type': 'Organization', name: SITE_NAME },
          mainEntityOfPage: `${SITE_URL}/articulos/${a.slug}.html`,
        },
      })
    );
  }
}

// ---------- Static pages ----------
function buildStaticPages() {
  write(
    'sobre-nosotros.html',
    renderPage({
      title: 'Sobre nosotros',
      description: `Quiénes somos y por qué escribimos en ${SITE_NAME} sobre inteligencia artificial y productividad.`,
      path: '/sobre-nosotros.html',
      bodyHtml: `
<section class="container page-header">
  <h1>Sobre ${SITE_NAME}</h1>
</section>
<section class="container prose">
  <p>${SITE_NAME} es un medio digital independiente dedicado a seguir de cerca la actualidad de la inteligencia artificial: noticias del día, herramientas nuevas y guías prácticas para aplicarlas en el trabajo diario, sin depender de ninguna otra marca o producto.</p>
  <h2>Nuestro enfoque editorial</h2>
  <ul>
    <li>Las guías son contenido original, escrito y revisado por el equipo editorial, sin publicar texto generado por IA sin revisión humana.</li>
    <li>La sección de noticias recopila titulares de medios externos con enlace directo a la fuente original; no reproducimos artículos completos de terceros.</li>
    <li>Explicamos también las limitaciones y riesgos de las herramientas que cubrimos, no solo sus ventajas.</li>
    <li>Actualizamos el contenido cuando queda desactualizado por la rapidez con la que evoluciona este sector.</li>
  </ul>
  <h2>Contacto</h2>
  <p>Si detectas un error en algún artículo o quieres proponer un tema, escríbenos desde la <a href="/contacto.html">página de contacto</a>.</p>
</section>
`,
    })
  );

  write(
    'contacto.html',
    renderPage({
      title: 'Contacto',
      description: `Ponte en contacto con el equipo de ${SITE_NAME}.`,
      path: '/contacto.html',
      bodyHtml: `
<section class="container page-header">
  <h1>Contacto</h1>
</section>
<section class="container prose">
  <p>¿Tienes una pregunta, una corrección o una propuesta de colaboración? Escríbenos directamente:</p>
  <p><a class="btn btn-primary" href="mailto:hola@radar-ia.example">hola@radar-ia.example</a></p>
  <p>Respondemos en un plazo de 2 a 5 días laborables.</p>
</section>
`,
    })
  );

  write(
    'privacidad.html',
    renderPage({
      title: 'Política de privacidad',
      description: `Política de privacidad de ${SITE_NAME}: qué datos recogemos, con qué finalidad y cómo usamos Google AdSense.`,
      path: '/privacidad.html',
      bodyHtml: `
<section class="container page-header">
  <h1>Política de privacidad</h1>
  <p class="article-meta">Última actualización: ${formatDate(new Date().toISOString())}</p>
</section>
<section class="container prose">
  <h2>1. Responsable del sitio</h2>
  <p>${SITE_NAME} es un blog editorial. Para cualquier consulta sobre esta política, escribe a <a href="mailto:hola@radar-ia.example">hola@radar-ia.example</a>.</p>

  <h2>2. Datos que recogemos</h2>
  <p>Este sitio no requiere registro para leer sus contenidos. Podemos recoger datos de navegación de forma anónima o pseudonimizada (páginas visitadas, tiempo de permanencia, tipo de dispositivo) con fines estadísticos y de mejora del contenido.</p>

  <h2>3. Publicidad y Google AdSense</h2>
  <p>Este sitio muestra anuncios a través de Google AdSense. Google, como proveedor externo, utiliza cookies (incluida la cookie DART) para mostrar anuncios basados en las visitas de un usuario a este sitio y a otros sitios en internet. Puedes inhabilitar el uso de la cookie DART visitando la <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">política de anuncios de Google</a> y gestionar tus preferencias de anuncios personalizados en <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>.</p>
  <p>Terceros proveedores, entre ellos Google, pueden mostrar anuncios de este sitio en otros sitios de internet. Más información sobre cómo Google usa los datos en <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">policies.google.com/technologies/partner-sites</a>.</p>

  <h2>4. Cookies</h2>
  <p>Consulta el detalle completo en nuestra <a href="/cookies.html">política de cookies</a>. En resumen: solo cargamos cookies de publicidad y analítica una vez que aceptas el aviso de cookies mostrado en la parte inferior de la pantalla.</p>

  <h2>5. Tus derechos</h2>
  <p>Si resides en el Espacio Económico Europeo, tienes derecho a acceder, rectificar, eliminar y limitar el uso de tus datos personales. Puedes ejercerlos escribiendo al correo de contacto indicado arriba.</p>

  <h2>6. Cambios en esta política</h2>
  <p>Podemos actualizar esta política para reflejar cambios legales o en nuestras prácticas. Recomendamos revisarla periódicamente.</p>
</section>
`,
    })
  );

  write(
    'cookies.html',
    renderPage({
      title: 'Política de cookies',
      description: `Qué cookies utiliza ${SITE_NAME}, con qué finalidad y cómo puedes gestionarlas.`,
      path: '/cookies.html',
      bodyHtml: `
<section class="container page-header">
  <h1>Política de cookies</h1>
</section>
<section class="container prose">
  <h2>¿Qué son las cookies?</h2>
  <p>Las cookies son pequeños archivos de texto que un sitio web guarda en tu navegador para recordar información sobre tu visita.</p>

  <h2>Cookies que utilizamos</h2>
  <ul>
    <li><strong>Cookies técnicas:</strong> necesarias para el funcionamiento básico del sitio, como recordar tu elección sobre el aviso de cookies.</li>
    <li><strong>Cookies de publicidad (Google AdSense):</strong> se cargan únicamente si aceptas el aviso de cookies, y permiten mostrar anuncios relevantes según tu navegación.</li>
    <li><strong>Cookies de analítica:</strong> nos ayudan a entender qué contenido resulta útil, de forma agregada y anónima.</li>
  </ul>

  <h2>Cómo gestionar las cookies</h2>
  <p>Puedes rechazar las cookies no esenciales desde el aviso que aparece al entrar al sitio, o eliminarlas en cualquier momento desde la configuración de tu navegador. También puedes gestionar la personalización de anuncios de Google directamente en <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>.</p>
</section>
`,
    })
  );

  write(
    'terminos.html',
    renderPage({
      title: 'Términos de uso',
      description: `Condiciones de uso del sitio ${SITE_NAME}.`,
      path: '/terminos.html',
      bodyHtml: `
<section class="container page-header">
  <h1>Términos de uso</h1>
</section>
<section class="container prose">
  <h2>Uso del contenido</h2>
  <p>El contenido publicado en ${SITE_NAME} tiene fines informativos y educativos. No constituye asesoramiento profesional, legal ni financiero. Antes de tomar decisiones importantes basadas en un artículo, consulta con un profesional cualificado.</p>

  <h2>Propiedad intelectual</h2>
  <p>Los textos publicados en este sitio son propiedad de sus autores. Se permite citar fragmentos con enlace a la fuente original; no se permite la reproducción completa de artículos sin autorización previa.</p>

  <h2>Enlaces externos</h2>
  <p>Este sitio puede incluir enlaces a sitios de terceros. No nos hacemos responsables del contenido o las políticas de privacidad de esos sitios externos.</p>

  <h2>Limitación de responsabilidad</h2>
  <p>Nos esforzamos por mantener la información actualizada y precisa, pero no garantizamos que esté libre de errores en todo momento, especialmente en un sector que cambia tan rápido como el de la inteligencia artificial.</p>
</section>
`,
    })
  );

  write(
    '404.html',
    renderPage({
      title: 'Página no encontrada',
      description: 'La página que buscas no existe o se ha movido.',
      path: '/404.html',
      bodyHtml: `
<section class="container page-header not-found">
  <h1>404</h1>
  <p>No hemos encontrado esta página. Puede que se haya movido o ya no exista.</p>
  <a class="btn btn-primary" href="/">Volver al inicio</a>
</section>
`,
    })
  );
}

// ---------- SEO files ----------
function buildSeoFiles() {
  const staticPaths = ['/', '/noticias.html', '/articulos.html', '/sobre-nosotros.html', '/contacto.html', '/privacidad.html', '/cookies.html', '/terminos.html'];
  const articlePaths = articles.map((a) => `/articulos/${a.slug}.html`);
  const all = [...staticPaths, ...articlePaths];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join('\n')}
</urlset>
`;
  write('sitemap.xml', sitemap);

  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  write('robots.txt', robots);

  // pub-XXXXXXXXXXXXXXXX (sin el prefijo "ca-") es lo que exige el formato ads.txt.
  const pubId = ADSENSE_CLIENT.replace(/^ca-/, '');
  write('ads.txt', `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`);
}

async function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  copyDir(PUBLIC, DIST);

  const newsItems = await fetchAiNews({ limit: 12 });

  buildHome(newsItems);
  buildNoticias(newsItems);
  buildArticlesList();
  buildArticles();
  buildStaticPages();
  buildSeoFiles();

  console.log(`Sitio generado en ${DIST} (${articles.length} artículos, ${newsItems.length} noticias en el build estático).`);
}

main().catch((err) => {
  console.error('Fallo generando el sitio:', err);
  process.exit(1);
});
