/**
 * stripe-webhook — Supabase Edge Function
 *
 * Recibe eventos de Stripe y actualiza user_subscriptions en la DB.
 * NO requiere autenticación de usuario (la verifica la firma de Stripe).
 *
 * Eventos manejados:
 *  - checkout.session.completed       → activa el plan
 *  - customer.subscription.updated   → sincroniza cambios de plan
 *  - customer.subscription.deleted   → cancela (vuelve a free)
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

// Devuelve el plan ('pro'|'elite') a partir del precio de Stripe buscando en las env vars
function planFromPriceId(priceId: string): { plan: string; platform: string; interval: string } | null {
  const map: Record<string, { plan: string; platform: string; interval: string }> = {
    [Deno.env.get('STRIPE_PRICE_MARKET_PRO_MONTHLY')  ?? '__']:  { plan: 'pro',   platform: 'market',  interval: 'monthly' },
    [Deno.env.get('STRIPE_PRICE_MARKET_PRO_YEARLY')   ?? '__']:  { plan: 'pro',   platform: 'market',  interval: 'yearly'  },
    [Deno.env.get('STRIPE_PRICE_MARKET_ELITE_MONTHLY') ?? '__']: { plan: 'elite', platform: 'market',  interval: 'monthly' },
    [Deno.env.get('STRIPE_PRICE_MARKET_ELITE_YEARLY') ?? '__']:  { plan: 'elite', platform: 'market',  interval: 'yearly'  },
    [Deno.env.get('STRIPE_PRICE_BETS_PRO_MONTHLY')    ?? '__']:  { plan: 'pro',   platform: 'bets',    interval: 'monthly' },
    [Deno.env.get('STRIPE_PRICE_BETS_PRO_YEARLY')     ?? '__']:  { plan: 'pro',   platform: 'bets',    interval: 'yearly'  },
    [Deno.env.get('STRIPE_PRICE_BETS_ELITE_MONTHLY')  ?? '__']:  { plan: 'elite', platform: 'bets',    interval: 'monthly' },
    [Deno.env.get('STRIPE_PRICE_BETS_ELITE_YEARLY')   ?? '__']:  { plan: 'elite', platform: 'bets',    interval: 'yearly'  },
    [Deno.env.get('STRIPE_PRICE_BUNDLE_MONTHLY')      ?? '__']:  { plan: 'pro',   platform: 'bundle',  interval: 'monthly' },
    [Deno.env.get('STRIPE_PRICE_BUNDLE_YEARLY')       ?? '__']:  { plan: 'pro',   platform: 'bundle',  interval: 'yearly'  },
  };
  return map[priceId] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  try {
    switch (event.type) {

      // ── Pago completado: activar suscripción ────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const userId   = session.metadata?.supabase_user_id;
        const platform = session.metadata?.platform;
        const plan     = session.metadata?.plan;
        const interval = session.metadata?.interval;
        const subId    = session.subscription as string;
        const cusId    = session.customer    as string;

        if (!userId || !platform || !plan) break;

        const sub = await stripe.subscriptions.retrieve(subId);

        await supabaseAdmin.from('user_subscriptions').upsert({
          user_id:               userId,
          stripe_customer_id:    cusId,
          stripe_subscription_id: subId,
          platform,
          plan,
          billing_interval:      interval ?? 'monthly',
          status:                sub.status,
          current_period_end:    new Date(sub.current_period_end * 1000).toISOString(),
        }, { onConflict: 'user_id,platform' });

        console.log(`✓ Plan activado: ${userId} → ${platform}/${plan}`);
        break;
      }

      // ── Suscripción actualizada (cambio de plan, renovación) ────
      case 'customer.subscription.updated': {
        const sub    = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        const priceId = sub.items.data[0]?.price?.id;
        const info    = priceId ? planFromPriceId(priceId) : null;

        await supabaseAdmin.from('user_subscriptions')
          .update({
            status:             sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            ...(info ? { plan: info.plan, platform: info.platform, billing_interval: info.interval } : {}),
          })
          .eq('stripe_subscription_id', sub.id);

        console.log(`↻ Suscripción actualizada: ${sub.id}`);
        break;
      }

      // ── Suscripción cancelada: volver a free ────────────────────
      case 'customer.subscription.deleted': {
        const sub    = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        await supabaseAdmin.from('user_subscriptions')
          .update({ plan: 'free', status: 'canceled' })
          .eq('stripe_subscription_id', sub.id);

        console.log(`✗ Suscripción cancelada: ${sub.id}`);
        break;
      }

      default:
        console.log(`Evento ignorado: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('stripe-webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
