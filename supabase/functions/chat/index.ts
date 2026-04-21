/**
 * chat — Supabase Edge Function
 *
 * Proxies Claude API calls for the Xentory chatbot.
 * Requires: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * Request body:
 *   { messages: [{role, content}][], plan: {market, bets}, userName: string, lang: string }
 *
 * Requires a valid Supabase JWT (logged-in users only).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: corsHeaders });

    const { messages, plan, userName, lang } = await req.json() as {
      messages: { role: string; content: string }[];
      plan: { market: string; bets: string };
      userName: string;
      lang: string;
    };

    const marketPlan = plan?.market ?? 'free';
    const betsPlan   = plan?.bets   ?? 'free';

    const hasMarketPaid = marketPlan !== 'free';
    const hasBetsPaid   = betsPlan   !== 'free';

    const planLine = lang === 'en'
      ? `Plan: Market ${marketPlan.toUpperCase()}${hasBetsPaid ? ` · Bet ${betsPlan.toUpperCase()}` : ''}.`
      : `Plan: Market ${marketPlan.toUpperCase()}${hasBetsPaid ? ` · Bet ${betsPlan.toUpperCase()}` : ''}.`;

    const system = lang === 'en'
      ? `You are the Xentory assistant — a concise, friendly AI for a signal platform (crypto/stocks trading + sports betting).
User: ${userName || 'User'}. ${planLine}
Rules:
- Reply in English. Max 120 words. Be direct.
- Crypto / stocks / forex questions: answer if Market plan is pro or elite; otherwise suggest upgrading.
- Sports betting questions: answer if Bets plan is pro or elite; otherwise suggest upgrading.
- General platform questions (features, pricing, how it works, account): always answer.
- Never invent real prices, odds, or live signals.
- For unresolved technical issues, suggest support@xentory.io.`
      : `Eres el asistente de Xentory — una IA concisa y amable de una plataforma de señales (trading cripto/acciones + apuestas deportivas).
Usuario: ${userName || 'Usuario'}. ${planLine}
Reglas:
- Responde en español. Máx 120 palabras. Sé directo.
- Preguntas de cripto / acciones / forex: responde si el plan Market es pro o elite; si no, sugiere mejorarlo.
- Preguntas de apuestas deportivas: responde si el plan Bet es pro o elite; si no, sugiere mejorarlo.
- Preguntas generales sobre la plataforma (funciones, precios, cómo funciona, cuenta): responde siempre.
- Nunca inventes precios, cuotas ni señales en tiempo real.
- Para problemas técnicos sin resolver, sugiere soporte@xentory.io.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system,
        messages,
      }),
    });

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? (lang === 'en' ? 'Sorry, I could not process your question.' : 'Lo siento, no pude procesar tu pregunta.');

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
