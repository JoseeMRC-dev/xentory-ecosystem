# Radar IA (`apps/radar-ia`)

Sitio **independiente** de noticias e IA — sin branding, dominio ni enlaces a Xentory. Vive en esta carpeta del monorepo por comodidad de desarrollo, pero se despliega como su propio proyecto de Vercel, con su propio dominio y su propia cuenta de Google AdSense.

Combina dos tipos de contenido pensados para maximizar tráfico e impresiones de anuncios:

1. **Noticias de IA que se actualizan solas** (`/noticias.html` + resumen en portada): titulares recopilados automáticamente de fuentes externas (Google News, con Hacker News como respaldo), sin necesidad de tocar el código ni redesplegar para que aparezca contenido nuevo.
2. **Guías evergreen** (`/articulos.html`): 10 artículos originales de fondo, pensados para posicionar en buscadores a medio plazo.

## Por qué se actualiza solo (sin que tengas que hacer nada)

Hay dos capas de "auto-actualización", y las dos ya están activas:

- **En vivo, en el navegador de cada visitante:** `/noticias.html` llama a `/api/news` (una función serverless de Vercel, `api/news.js`) que en cada petición busca los titulares más recientes en Google News y los devuelve. Cada visita ve noticias frescas, sin esperar a un nuevo despliegue. La función cachea la respuesta 30 minutos (`Cache-Control: s-maxage=1800`) para no saturar la fuente ni ralentizar la carga.
- **En el HTML estático (para SEO):** cada vez que se ejecuta `npm run build`, el propio build llama a la misma fuente y "congela" los últimos titulares directamente en el HTML de `/noticias.html` y en la portada. Así, aunque un buscador no ejecute JavaScript, ve contenido fresco real en el HTML.

Si además quieres que el HTML estático se refresque solo cada pocas horas (para que Google vea la página "recién publicada" constantemente, no solo cuando tú hagas un cambio), la forma más simple es un **Vercel Cron Job** o una **GitHub Action programada** que dispare un rebuild periódico. No lo he activado por defecto porque implica commits o despliegues automáticos recurrentes sobre tu repositorio — dímelo si lo quieres y lo dejo configurado.

## Estructura

```
apps/radar-ia/
├── content/articles.mjs   → Las 10 guías evergreen (contenido original)
├── lib/rss.mjs            → Parser de RSS sin dependencias
├── lib/fetchNews.mjs      → Fetch de noticias: Google News → fallback Hacker News
├── api/news.js            → Función serverless de Vercel: sirve /api/news en vivo
├── templates/layout.mjs   → El "molde" HTML compartido (header, footer, ad slots, meta tags)
├── scripts/generate.mjs   → Genera /dist (incluye la "foto" estática de noticias del build)
├── scripts/serve.mjs      → Servidor estático simple para dev/preview
└── public/                → CSS, JS, favicon, imágenes
```

## Comandos

```bash
npm run build --workspace=apps/radar-ia   # genera dist/ (incluye noticias del momento del build)
npm run dev --workspace=apps/radar-ia     # genera y sirve en http://localhost:4002
```

> En este entorno de desarrollo aislado no hay salida a internet, así que verás en consola
> `Google News no disponible` / `Hacker News no disponible` al hacer build — es esperado aquí.
> En Vercel (con internet real) la sección de noticias se rellena sin ningún cambio de código.

## Checklist para monetizar con Google AdSense

1. **Dominio propio** distinto del de Xentory (ej. `tu-dominio.com`). AdSense no suele aprobar subdominios genéricos de Vercel.
2. **Despliega como proyecto nuevo e independiente en Vercel** (ver abajo) — no lo añadas al proyecto de Xentory Hub.
3. **Crea tu cuenta en** [google.com/adsense](https://www.google.com/adsense/) con ese dominio.
4. **Configura las variables de entorno** en Vercel (Project → Settings → Environment Variables):
   - `ADSENSE_CLIENT_ID` → tu `ca-pub-XXXXXXXXXXXXXXXX`.
   - `ADSENSE_SLOT_TOP`, `ADSENSE_SLOT_INARTICLE`, `ADSENSE_SLOT_BOTTOM` → IDs de los bloques de anuncio.
   - `SITE_URL` → la URL final del sitio, para el sitemap y las etiquetas Open Graph.
5. **Vuelve a desplegar.** El build lee esas variables y genera `ads.txt` y los `<ins class="adsbygoogle">` con tus IDs reales automáticamente.
6. **Verifica `ads.txt`** en `https://tudominio.com/ads.txt`.
7. Actualiza el email de contacto real en `scripts/generate.mjs` (busca `hola@radar-ia.example`).
8. Añade más guías en `content/articles.mjs` si quieres reforzar el posicionamiento a medio plazo — la sección de noticias ya aporta el flujo constante de contenido fresco.

## Cumplimiento ya incluido

- Aviso de cookies que **bloquea la carga del script de AdSense hasta que el usuario acepta**.
- Política de privacidad con la sección obligatoria sobre Google AdSense/DART y enlace a `adssettings.google.com`.
- Política de cookies y términos de uso.
- La sección de noticias **no reproduce artículos completos**: solo titular, fuente y enlace directo al medio original (evita problemas de derechos de autor y de "contenido no original" ante AdSense).
- `robots.txt` + `sitemap.xml` (incluye `/noticias.html`), Open Graph/Twitter Card y JSON-LD en cada página.
- 404 personalizada.

## Desplegar en Vercel

Crea un **proyecto nuevo** en Vercel (no reutilices el de Xentory Hub) apuntando a este repo con:
- **Root Directory:** `apps/radar-ia`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Vercel detecta automáticamente `api/news.js` como función serverless aunque el resto del sitio sea estático — no hace falta configurar nada adicional para que `/api/news` funcione.
