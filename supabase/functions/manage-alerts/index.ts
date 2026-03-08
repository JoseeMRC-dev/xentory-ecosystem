/**
 * Supabase Edge Function: manage-alerts
 * ─────────────────────────────────────────────────────────────────
 * Handles all write operations for price alerts and Telegram codes.
 * Uses SERVICE ROLE to bypass RLS (safe because we validate user_id).
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST')    return new Response('Method not allowed', { status: 405 });

  try {
    const body   = await req.json();
    const action = body.action as string;

    // ── UPSERT VERIFICATION CODE ──────────────────────────────
    if (action === 'upsert_code') {
      const { user_id, user_email, platform, plan, code } = body;
      if (!user_id || !user_email || !platform || !code) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: CORS });
      }

      // Delete any existing unused codes
      await supabase
        .from('telegram_verify_codes')
        .delete()
        .eq('user_id', user_id)
        .eq('platform', platform)
        .eq('used', false);

      // Insert new code
      const { error } = await supabase.from('telegram_verify_codes').insert({
        user_id,
        user_email,
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
      const { user_id, user_email, symbol, asset_name, category, condition, target_price, notify_channel } = body;

      if (!user_id || !symbol || !condition || !target_price) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: CORS });
      }

      const { data, error } = await supabase
        .from('price_alerts')
        .insert({
          user_id,
          user_email: user_email ?? '',
          symbol,
          asset_name:     asset_name ?? symbol,
          category:       category ?? 'crypto',
          condition,
          target_price:   Number(target_price),
          notify_channel: notify_channel ?? 'telegram',
          active:         true,
          triggered:      false,
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: CORS });

  } catch (e: any) {
    console.error('manage-alerts error:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
