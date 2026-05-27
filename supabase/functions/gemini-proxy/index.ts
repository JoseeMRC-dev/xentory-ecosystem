/**
 * gemini-proxy — Supabase Edge Function
 *
 * Proxies Gemini API calls so GEMINI_API_KEY never leaves the server.
 * The key is stored as a Supabase secret (no VITE_ prefix).
 *
 * Usage: set GEMINI_API_KEY via `supabase secrets set GEMINI_API_KEY=...`
 *
 * Request body:
 *   { model: string, payload: object }
 *
 * The `payload` is forwarded as-is to the Gemini generateContent endpoint.
 * Requires a valid Supabase JWT (Authorization: Bearer <access_token>).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── FIND-006: Restrict CORS to known origins ──────────────────────
const ALLOWED_ORIGINS = [
  'https://xentory.com',
  'https://hub.xentory.com',
  'https://market.xentory.com',
  'https://bet.xentory.com',
  'https://x-eight-beryl.vercel.app',
  'https://xentory-ecosystem-market.vercel.app',
  'https://xentory-ecosystem-bet.vercel.app',
];

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

Deno.serve(async (req) => {
  const origin      = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Verify caller is authenticated (valid Supabase JWT) ──────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Parse the request body ────────────────────────────────────────
    const { model, payload } = await req.json() as { model: string; payload: unknown };

    if (!model || !payload) {
      return new Response(JSON.stringify({ error: 'Missing model or payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Validate model name (allowlist) ───────────────────────────────
    const ALLOWED_MODELS = [
      'gemini-2.0-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash-lite',
    ];
    if (!ALLOWED_MODELS.includes(model)) {
      return new Response(JSON.stringify({ error: 'Model not allowed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Forward to Gemini using server-side key ───────────────────────
    const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'Gemini not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiRes = await fetch(
      `${GEMINI_BASE}/${model}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    const data = await geminiRes.json();

    return new Response(JSON.stringify(data), {
      status: geminiRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('gemini-proxy error:', err);
    // FIND-007: never expose internal error details
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
