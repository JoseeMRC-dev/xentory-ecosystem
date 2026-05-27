/**
 * Supabase Edge Function: sports-proxy
 * Proxies requests to api-sports.io to avoid CORS from the browser.
 *
 * Usage: /functions/v1/sports-proxy?sport=football&path=/fixtures?date=2026-03-11
 * Deploy: supabase functions deploy sports-proxy
 */

const ALLOWED_HOSTS: Record<string, string> = {
  football:   'https://v3.football.api-sports.io',
  tennis:     'https://v1.tennis.api-sports.io',
  basketball: 'https://v1.basketball.api-sports.io',
  f1:         'https://v1.formula-1.api-sports.io',
};

// ── FIND-006: Restrict CORS to known origins ──────────────────────
const ALLOWED_ORIGINS = [
  'https://xentory.com',
  'https://hub.xentory.com',
  'https://market.xentory.com',
  'https://bet.xentory.com',
  'https://x-eight-beryl.vercel.app',
  'https://xentory-ecosystem-bet.vercel.app',
];

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// ── FIND-003: Allowlisted paths per sport ────────────────────────
const ALLOWED_PATHS: Record<string, RegExp> = {
  football:   /^\/(?:fixtures|leagues|teams|standings|players|statistics|odds)(?:[/?].*)?$/,
  tennis:     /^\/(?:fixtures|leagues|players|rankings|statistics)(?:[/?].*)?$/,
  basketball: /^\/(?:fixtures|leagues|teams|standings|players|statistics)(?:[/?].*)?$/,
  f1:         /^\/(?:races|drivers|teams|circuits|rankings|seasons)(?:[/?].*)?$/,
};

function sanitizePath(raw: string, sport: string): string | null {
  // Strip path traversal and enforce max length
  const cleaned = '/' + raw.replace(/^\/+/, '').replace(/\.\.\//g, '').replace(/\.\./g, '');
  if (cleaned.length > 300) return null;

  const pattern = ALLOWED_PATHS[sport];
  if (pattern && !pattern.test(cleaned)) return null;

  return cleaned;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const CORS   = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url   = new URL(req.url);
  const sport = url.searchParams.get('sport') ?? '';
  const rawPath = url.searchParams.get('path') ?? '';

  if (!sport || !rawPath) {
    return new Response(JSON.stringify({ error: 'Missing sport or path' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const base = ALLOWED_HOSTS[sport];
  if (!base) {
    return new Response(JSON.stringify({ error: 'Unknown sport' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // FIND-003: Sanitize and validate path
  const safePath = sanitizePath(rawPath, sport);
  if (!safePath) {
    return new Response(JSON.stringify({ error: 'Invalid path' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('API_FOOTBALL_KEY') ?? '';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const upstream = `${base}${safePath}`;
  console.log(`[sports-proxy] ${sport} → ${upstream}`);

  try {
    const res  = await fetch(upstream, {
      headers: {
        'x-rapidapi-key':  apiKey,
        'x-apisports-key': apiKey,
        'x-rapidapi-host': base.replace('https://', ''),
      },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[sports-proxy] upstream error:', err?.message);
    // FIND-007: don't expose upstream error details
    return new Response(JSON.stringify({ error: 'Upstream request failed' }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
