/**
 * create-checkout — Supabase Edge Function
 *
 * Crea una Stripe Checkout Session y devuelve la URL de pago.
 * Requiere autenticación con el Bearer token del usuario (Supabase JWT).
 *
 * Body JSON:
 *   platform:    'market' | 'bets' | 'bundle'
 *   plan:        'pro' | 'elite'
 *   interval:    'monthly' | 'yearly'
 *   success_url: string
 *   cancel_url:  string
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

// Mapa platform+plan+interval → variable de entorno con el Price ID
const PRICE_ENV: Record<string, string> = {
  'market-pro-monthly':    'STRIPE_PRICE_MARKET_PRO_MONTHLY',
  'market-pro-yearly':     'STRIPE_PRICE_MARKET_PRO_YEARLY',
  'market-elite-monthly':  'STRIPE_PRICE_MARKET_ELITE_MONTHLY',
  'market-elite-yearly':   'STRIPE_PRICE_MARKET_ELITE_YEARLY',
  'bets-pro-monthly':      'STRIPE_PRICE_BETS_PRO_MONTHLY',
  'bets-pro-yearly':       'STRIPE_PRICE_BETS_PRO_YEARLY',
  'bets-elite-monthly':    'STRIPE_PRICE_BETS_ELITE_MONTHLY',
  'bets-elite-yearly':     'STRIPE_PRICE_BETS_ELITE_YEARLY',
  'bundle-pro-monthly':    'STRIPE_PRICE_BUNDLE_MONTHLY',
  'bundle-pro-yearly':     'STRIPE_PRICE_BUNDLE_YEARLY',
};

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Autenticar usuario ──────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Leer body ───────────────────────────────────────────────────
    const { platform, plan, interval, success_url, cancel_url } = await req.json();
    const priceKey = `${platform}-${plan}-${interval}`;
    const priceId  = Deno.env.get(PRICE_ENV[priceKey] ?? '');

    if (!priceId) {
      return new Response(JSON.stringify({ error: `Price not configured: ${priceKey}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Buscar o crear cliente Stripe ───────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // ── Crear Checkout Session ──────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer:    customerId,
      mode:        'subscription',
      line_items:  [{ price: priceId, quantity: 1 }],
      success_url: `${success_url}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url,
      metadata: {
        supabase_user_id: user.id,
        platform,
        plan,
        interval,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          platform,
          plan,
          interval,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('create-checkout error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
