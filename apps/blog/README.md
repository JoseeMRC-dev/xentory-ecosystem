# Xentory Insights (`apps/blog`)

Blog estático (sin framework, sin JS necesario para leer el contenido) sobre **IA, productividad y negocio**, optimizado para SEO y para monetizar con **Google AdSense**.

Por qué está montado así y no como una SPA de React (como el resto del monorepo): AdSense y los buscadores premian contenido HTML real, indexable sin ejecutar JavaScript. Cada artículo se genera como un `.html` independiente en build time — cero coste de renderizado, cero riesgo de que un rastreador vea una página en blanco.

## Cómo funciona

```
apps/blog/
├── content/articles.mjs   → El contenido editorial (10 artículos ya escritos)
├── templates/layout.mjs   → El "molde" HTML compartido (header, footer, ad slots, meta tags)
├── scripts/generate.mjs   → Genera /dist a partir de content + templates
├── scripts/serve.mjs      → Servidor estático simple para dev/preview
└── public/                → CSS, JS, favicon, imágenes (se copian tal cual a /dist)
```

## Comandos

```bash
npm run build --workspace=apps/blog   # genera dist/
npm run dev --workspace=apps/blog     # genera y sirve en http://localhost:4002
```

## Checklist para monetizar con Google AdSense

1. **Dominio propio.** AdSense no aprueba subdominios genéricos de Vercel de forma fiable; conecta un dominio propio al proyecto de Vercel.
2. **Despliega el sitio** (ver más abajo) y verifica que `/`, `/articulos.html` y un artículo cargan bien en producción.
3. **Crea tu cuenta en** [google.com/adsense](https://www.google.com/adsense/) con el dominio del paso 1.
4. **Configura las variables de entorno** en Vercel (Project → Settings → Environment Variables):
   - `ADSENSE_CLIENT_ID` → tu `ca-pub-XXXXXXXXXXXXXXXX` (te lo da AdSense al aprobar el sitio).
   - `ADSENSE_SLOT_TOP`, `ADSENSE_SLOT_INARTICLE`, `ADSENSE_SLOT_BOTTOM` → IDs de los bloques de anuncio que crees dentro de AdSense (Anuncios → Por bloques de anuncios).
   - `SITE_URL` → la URL final del sitio (ej. `https://insights.tudominio.com`), se usa para el sitemap y las etiquetas Open Graph.
5. **Vuelve a desplegar.** El build (`npm run build`) lee esas variables y genera `ads.txt` y los `<ins class="adsbygoogle">` con tus IDs reales automáticamente — no hay que tocar código.
6. **Verifica `ads.txt`** en `https://tudominio.com/ads.txt` — debe mostrar tu `pub-...` real, no ceros.
7. Añade más artículos en `content/articles.mjs` (contenido original y de calidad) antes de solicitar la revisión: cuanta más profundidad editorial, más rápida suele ser la aprobación.
8. Actualiza el email de contacto real en `scripts/generate.mjs` (busca `hola@xentory-insights.example`) por uno que gestiones de verdad.

## Cumplimiento ya incluido

- Aviso de cookies (banner) que **bloquea la carga del script de AdSense hasta que el usuario acepta**.
- Página de política de privacidad con la sección obligatoria sobre Google AdSense/DART y enlace a `adssettings.google.com`.
- Página de política de cookies y términos de uso.
- `robots.txt` + `sitemap.xml` generados automáticamente con todas las URLs.
- Metadatos Open Graph / Twitter Card y JSON-LD (`Article`, `WebSite`) en cada página.
- 404 personalizada.

## Desplegar en Vercel

Crea un nuevo proyecto en Vercel apuntando a este repo con:
- **Root Directory:** `apps/blog`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

(El `vercel.json` de esta carpeta ya define cabeceras de seguridad y caché; no hace falta tocar nada más.)
