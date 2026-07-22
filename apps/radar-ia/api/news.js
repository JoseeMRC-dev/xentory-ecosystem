import { fetchAiNews } from '../lib/fetchNews.mjs';

// Función serverless de Vercel: se ejecuta en el servidor, así que no hay
// problema de CORS al llamar a Google News/Hacker News, y el resultado se
// cachea en el edge de Vercel para no golpear las fuentes en cada visita.
export default async function handler(req, res) {
  try {
    const items = await fetchAiNews({ limit: 20 });
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({ updatedAt: new Date().toISOString(), items });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      updatedAt: new Date().toISOString(),
      items: [],
      error: 'No se pudieron obtener noticias en este momento.',
    });
  }
}
