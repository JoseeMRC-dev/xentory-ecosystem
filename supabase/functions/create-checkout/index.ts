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
 *   device_fp:   string  (SHA-256 del fingerprint del dispositivo — opcional)
 *
 * Respuesta:
 *   { url: string, trial_eligible: boolean }
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

// Días de prueba gratuita para usuarios elegibles
const TRIAL_DAYS = 7;

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

/** Devuelve true si device_fp tiene formato válido de SHA-256 (64 hex chars) */
function isValidFp(fp: unknown): fp is string {
  return typeof fp === 'string' && /^[0-9a-f]{64}$/.test(fp);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Autenticar usuario ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) {
      console.error('Auth error:', authErr?.message, '| jwt length:', jwt.length);
      return new Response(JSON.stringify({ error: 'Unauthorized', detail: authErr?.message }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Leer body ───────────────────────────────────────────────────
    const { platform, plan, interval, success_url, cancel_url, device_fp, embedded, return_url } = await req.json();
    const priceKey = `${platform}-${plan}-${interval}`;
    const priceId  = Deno.env.get(PRICE_ENV[priceKey] ?? '');

    if (!priceId) {
      return new Response(JSON.stringify({ error: `Price not configured: ${priceKey}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Cliente admin (service_role — bypassa RLS) ──────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ── Verificar elegibilidad del trial ────────────────────────────
    // Capa 1: ¿Ya usó trial este usuario en esta plataforma?
    const { data: userTrial } = await supabaseAdmin
      .from('trial_usage')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .maybeSingle();

    // Capa 2: ¿Ya usó trial este dispositivo en esta plataforma?
    let deviceTrial = false;
    const validFp = isValidFp(device_fp);
    if (validFp) {
      const { data } = await supabaseAdmin
        .from('trial_usage')
        .select('id')
        .eq('device_fp', device_fp)
        .eq('platform', platform)
        .maybeSingle();
      deviceTrial = !!data;
    }

    const trialEligible = !userTrial && !deviceTrial;

    // ── Buscar o crear cliente Stripe ───────────────────────────────
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
      ...(embedded
        ? { ui_mode: 'embedded', return_url: `${return_url}?session_id={CHECKOUT_SESSION_ID}` }
        : { success_url: `${success_url}&session_id={CHECKOUT_SESSION_ID}`, cancel_url }),
      metadata: {
        supabase_user_id: user.id,
        platform,
        plan,
        interval,
        device_fp: validFp ? device_fp : '',
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          platform,
          plan,
          interval,
        },
        // Solo se añaden días de trial si el usuario/dispositivo es elegible.
        // Los precios de Stripe NO deben tener trial configurado en el dashboard;
        // toda la lógica de trial se controla aquí.
        ...(trialEligible ? { trial_period_days: TRIAL_DAYS } : {}),
      },
    });

    console.log(
      `checkout creado: ${user.id} → ${platform}/${plan} | trial_eligible=${trialEligible}${!trialEligible ? ` (bloqueado: user=${!!userTrial}, device=${deviceTrial})` : ''}`,
    );

    return new Response(JSON.stringify({
      url:            session.url,
      clientSecret:   session.client_secret ?? null,
      trial_eligible: trialEligible,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('create-checkout error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
