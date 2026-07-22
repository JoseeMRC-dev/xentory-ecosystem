import { parseRssItems } from './rss.mjs';

const USER_AGENT = 'Mozilla/5.0 (compatible; RadarIA/1.0; +https://radar-ia.example)';

async function withTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fuente principal: Google News RSS (gratis, sin API key). Devuelve
 * titulares en español sobre IA con enlace directo a la fuente original.
 */
async function fetchFromGoogleNews(limit, timeoutMs) {
  const query = encodeURIComponent(
    'inteligencia artificial OR "IA generativa" OR ChatGPT OR "machine learning"'
  );
  const url = `https://news.google.com/rss/search?q=${query}&hl=es-419&gl=ES&ceid=ES:es`;
  const res = await withTimeout(url, { headers: { 'User-Agent': USER_AGENT } }, timeoutMs);
  if (!res.ok) throw new Error(`Google News respondió ${res.status}`);
  const xml = await res.text();
  return parseRssItems(xml).slice(0, limit);
}

/**
 * Fuente de respaldo: Hacker News (API pública de Algolia, sin key).
 * Se usa solo si Google News falla o no devuelve resultados, para que la
 * sección de noticias no quede nunca vacía por depender de una sola fuente.
 */
async function fetchFromHackerNews(limit, timeoutMs) {
  const query = encodeURIComponent('AI OR GPT OR LLM OR "machine learning"');
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=story&hitsPerPage=${limit}`;
  const res = await withTimeout(url, {}, timeoutMs);
  if (!res.ok) throw new Error(`Hacker News respondió ${res.status}`);
  const data = await res.json();
  return (data.hits || [])
    .filter((hit) => hit.title && (hit.url || hit.objectID))
    .map((hit) => ({
      title: hit.title,
      link: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      source: 'Hacker News',
      pubDate: hit.created_at || null,
    }));
}

/**
 * Devuelve titulares recientes sobre IA. Nunca lanza: ante cualquier fallo
 * de red (o si esta ejecución no tiene salida a internet) devuelve un
 * array vacío para que la página siga construyéndose con normalidad.
 */
export async function fetchAiNews({ limit = 12, timeoutMs = 8000 } = {}) {
  try {
    const items = await fetchFromGoogleNews(limit, timeoutMs);
    if (items.length) return items;
  } catch (err) {
    console.warn('[radar-ia] Google News no disponible:', err.message);
  }

  try {
    const items = await fetchFromHackerNews(limit, timeoutMs);
    if (items.length) return items;
  } catch (err) {
    console.warn('[radar-ia] Hacker News no disponible:', err.message);
  }

  return [];
}
