// Parser mínimo de RSS 2.0, sin dependencias externas.
// No es un parser XML genérico: asume la forma <item>...</item> típica de
// feeds de noticias (Google News, la mayoría de medios) y es tolerante a
// campos ausentes en lugar de lanzar excepciones.

function stripCdata(str) {
  const m = str.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return m ? m[1] : str;
}

function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, '&');
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(re);
  if (!match) return null;
  return decodeEntities(stripCdata(match[1]).trim());
}

function extractSource(block) {
  const match = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
  if (!match) return null;
  return decodeEntities(stripCdata(match[1]).trim());
}

/**
 * Google News suele formatear el título como "Titular real - Nombre del medio".
 * Si conocemos el nombre del medio por el tag <source>, lo recortamos del título.
 */
function cleanTitle(title, source) {
  if (source && title.endsWith(` - ${source}`)) {
    return title.slice(0, -(source.length + 3)).trim();
  }
  return title;
}

export function parseRssItems(xml) {
  if (!xml || typeof xml !== 'string') return [];
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const rawTitle = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const source = extractSource(block);
    if (!rawTitle || !link) continue;
    items.push({
      title: cleanTitle(rawTitle, source),
      link: link.trim(),
      source: source || null,
      pubDate: pubDate || null,
    });
  }
  return items;
}
