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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url   = new URL(req.url);
  const sport = url.searchParams.get('sport') ?? '';
  const path  = url.searchParams.get('path')  ?? '';

  if (!sport || !path) {
    return new Response(JSON.stringify({ error: 'Missing sport or path' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const base = ALLOWED_HOSTS[sport];
  if (!base) {
    return new Response(JSON.stringify({ error: `Unknown sport: ${sport}` }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('API_FOOTBALL_KEY') ?? '';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const upstream = `${base}${path}`;
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
    console.error('[sports-proxy] error:', err?.message);
    return new Response(JSON.stringify({ error: 'Upstream failed', detail: err?.message }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
