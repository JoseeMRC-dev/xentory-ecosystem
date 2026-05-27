/**
 * Supabase Edge Function: manage-alerts
 * ─────────────────────────────────────────────────────────────────
 * Handles all write operations for price alerts and Telegram codes.
 * Uses SERVICE ROLE to bypass RLS — user identity is taken from the
 * verified JWT, never from the request body.
 *
 * Actions:
 *  - upsert_code    → generate/refresh verification code
 *  - create_alert   → add new price alert
 *
 * Deploy: supabase functions deploy manage-alerts
 * ─────────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── CORS (restrict to known origins) ─────────────────────────────
const ALLOWED_ORIGINS = [
  'https://xentory.com',
  'https://hub.xentory.com',
  'https://market.xentory.com',
  'https://bet.xentory.com',
  'https://x-eight-beryl.vercel.app',
  'https://xentory-ecosystem-market.vercel.app',
  'https://xentory-ecosystem-bet.vercel.app',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

// ── JWT verification helper ───────────────────────────────────────
async function verifyJwt(req: Request): Promise<{ id: string; email?: string } | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return null;
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id, email: user.email };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const CORS   = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST')    return new Response('Method not allowed', { status: 405 });

  // ── FIND-001: Verify JWT — user_id always comes from token, never body ──
  const user = await verifyJwt(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  try {
    const body   = await req.json();
    const action = body.action as string;

    // ── UPSERT VERIFICATION CODE ──────────────────────────────
    if (action === 'upsert_code') {
      const { user_email, platform, plan, code } = body;
      if (!user_email || !platform || !code) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: CORS });
      }

      // Delete ALL previous codes for this user+platform (used or not) so the
      // UNIQUE constraint on `code` never blocks a fresh insert.
      await supabase
        .from('telegram_verify_codes')
        .delete()
        .eq('user_id', user.id)   // use verified user_id from JWT
        .eq('platform', platform);

      // Insert new code
      const { error } = await supabase.from('telegram_verify_codes').insert({
        user_id:    user.id,       // use verified user_id from JWT
        user_email: user.email ?? user_email,
        platform,
        plan: plan ?? 'free',
        code,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error) throw error;
      return new Response(JSON.stringify({ code }), { headers: CORS });
    }

    // ── CREATE ALERT ──────────────────────────────────────────
    if (action === 'create_alert') {
      const { symbol, asset_name, category, condition, target_price, notify_channel } = body;

      if (!symbol || !condition || target_price === undefined) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: CORS });
      }

      // Validate inputs
      const safeSymbol    = String(symbol).slice(0, 20).toUpperCase();
      const safeCondition = ['above', 'below'].includes(condition) ? condition : null;
      const safePrice     = Number(target_price);

      if (!safeCondition || isNaN(safePrice) || safePrice <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid condition or price' }), { status: 400, headers: CORS });
      }

      const { data, error } = await supabase
        .from('price_alerts')
        .insert({
          user_id:        user.id,       // use verified user_id from JWT
          user_email:     user.email ?? '',
          symbol:         safeSymbol,
          asset_name:     String(asset_name ?? symbol).slice(0, 50),
          category:       ['crypto', 'stocks', 'forex'].includes(category) ? category : 'crypto',
          condition:      safeCondition,
          target_price:   safePrice,
          notify_channel: ['telegram', 'email'].includes(notify_channel) ? notify_channel : 'telegram',
          active:         true,
          triggered:      false,
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: CORS });

  } catch (e: any) {
    console.error('manage-alerts error:', e);
    // FIND-007: never expose internal error details to client
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: CORS });
  }
});
