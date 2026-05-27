/**
 * create-checkout — Supabase Edge Function
 *
 * Crea una Stripe Checkout Session y devuelve la URL de pago.
 * Requiere autenticación con el Bearer token del usuario (Supabase JWT).
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

if (!STRIPE_KEY) {
  console.error('STRIPE_SECRET_KEY is not configured');
}

const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() })
  : null;

const TRIAL_DAYS = 7;

const PRICE_ENV: Record<string, string> = {
  'market-pro-monthly':   'STRIPE_PRICE_MARKET_PRO_MONTHLY',
  'market-pro-yearly':    'STRIPE_PRICE_MARKET_PRO_YEARLY',
  'market-elite-monthly': 'STRIPE_PRICE_MARKET_ELITE_MONTHLY',
  'market-elite-yearly':  'STRIPE_PRICE_MARKET_ELITE_YEARLY',
  'bets-pro-monthly':     'STRIPE_PRICE_BETS_PRO_MONTHLY',
  'bets-pro-yearly':      'STRIPE_PRICE_BETS_PRO_YEARLY',
  'bets-elite-monthly':   'STRIPE_PRICE_BETS_ELITE_MONTHLY',
  'bets-elite-yearly':    'STRIPE_PRICE_BETS_ELITE_YEARLY',
  'bundle-elite-monthly': 'STRIPE_PRICE_BUNDLE_MONTHLY',
  'bundle-elite-yearly':  'STRIPE_PRICE_BUNDLE_YEARLY',
};

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

// ── FIND-002: Validate redirect URLs against allowlist ────────────
function validateUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const u = new URL(raw);
    return ALLOWED_ORIGINS.some(o => u.origin === o) ? raw : null;
  } catch {
    return null;
  }
}

function isValidFp(fp: unknown): fp is string {
  return typeof fp === 'string' && /^[0-9a-f]{64}$/.test(fp);
}

Deno.serve(async (req) => {
  const origin      = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!stripe) {
    return new Response(JSON.stringify({ error: 'Stripe no está configurado. Contacta con soporte.' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) {
      // FIND-007: don't expose auth error details
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { platform, plan, interval, device_fp } = body;

    // FIND-002: Validate all redirect URLs
    const success_url = validateUrl(body.success_url);
    const cancel_url  = validateUrl(body.cancel_url);
    const embedded:    boolean = !!body.embedded;
    const return_url  = validateUrl(body.return_url);

    // Reject if provided but invalid
    if (body.success_url && !success_url) {
      return new Response(JSON.stringify({ error: 'Invalid success_url origin' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (body.cancel_url && !cancel_url) {
      return new Response(JSON.stringify({ error: 'Invalid cancel_url origin' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (body.return_url && !return_url) {
      return new Response(JSON.stringify({ error: 'Invalid return_url origin' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceKey = `${platform}-${plan}-${interval}`;
    const priceId  = Deno.env.get(PRICE_ENV[priceKey] ?? '');

    if (!priceId) {
      return new Response(JSON.stringify({ error: `Price not configured: ${priceKey}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Upgrade/downgrade: modify existing active subscription
    const { data: existingActiveSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_subscription_id, plan')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (existingActiveSub?.stripe_subscription_id && existingActiveSub.plan !== plan) {
      const activeSub = await stripe.subscriptions.retrieve(existingActiveSub.stripe_subscription_id);
      const itemId = activeSub.items.data[0]?.id;
      if (!itemId) {
        return new Response(JSON.stringify({ error: 'subscription_item_not_found' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      await stripe.subscriptions.update(existingActiveSub.stripe_subscription_id, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: 'always_invoice',
        metadata: { supabase_user_id: user.id, platform, plan, interval },
      });
      return new Response(JSON.stringify({ upgraded: true, plan, platform, trial_eligible: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Trial eligibility
    const { data: userTrial } = await supabaseAdmin
      .from('trial_usage').select('id')
      .eq('user_id', user.id).eq('platform', platform).maybeSingle();

    let deviceTrial = false;
    const validFp = isValidFp(device_fp);
    if (validFp) {
      const { data } = await supabaseAdmin
        .from('trial_usage').select('id')
        .eq('device_fp', device_fp).eq('platform', platform).maybeSingle();
      deviceTrial = !!data;
    }
    const trialEligible = !userTrial && !deviceTrial;

    // Find or create Stripe customer
    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions').select('stripe_customer_id')
      .eq('user_id', user.id).not('stripe_customer_id', 'is', null)
      .limit(1).maybeSingle();

    let customerId = existingSub?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Fallback URLs (safe defaults)
    const defaultUrl = 'https://x-eight-beryl.vercel.app/pricing';

    // Build checkout URL config depending on mode
    const urlConfig = embedded && return_url
      ? { ui_mode: 'embedded' as const, return_url }
      : {
          success_url: success_url
            ? `${success_url}&session_id={CHECKOUT_SESSION_ID}`
            : defaultUrl,
          cancel_url: cancel_url ?? defaultUrl,
        };

    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...urlConfig,
      metadata: {
        supabase_user_id: user.id, platform, plan, interval,
        device_fp: validFp ? device_fp : '',
      },
      subscription_data: {
        metadata: { supabase_user_id: user.id, platform, plan, interval },
        ...(trialEligible ? { trial_period_days: TRIAL_DAYS } : {}),
      },
    });

    console.log(`checkout: ${user.id} → ${platform}/${plan} | trial=${trialEligible} | embedded=${embedded}`);

    return new Response(JSON.stringify({
      url:            session.url,
      clientSecret:   session.client_secret ?? null,
      trial_eligible: trialEligible,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('create-checkout error:', err);
    // FIND-007: never expose internal error details
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
    });
  }
});
