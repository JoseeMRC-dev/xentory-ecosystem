/**
 * chat — Supabase Edge Function (Gemini-powered)
 *
 * - Verifies auth + plan server-side (only pro/elite users reach Gemini)
 * - Returns { short: string, detail?: string }
 * - Requires: GEMINI_API_KEY secret (shared with gemini-proxy)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });

    // ── 2. Verify plan server-side ───────────────────────────────────
    const { data: subs } = await supabase
      .from('user_subscriptions')
      .select('platform, plan, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trial']);

    const find = (ps: string[]) => (subs as any[])?.find(r => ps.includes(r.platform))?.plan ?? 'free';
    const marketPlan = find(['market', 'bundle']);
    const betsPlan   = find(['bets',   'bundle']);
    const isPaid     = marketPlan !== 'free' || betsPlan !== 'free';

    if (!isPaid) return new Response(JSON.stringify({ error: 'upgrade_required' }), { status: 403, headers: cors });

    // ── 3. Parse body ────────────────────────────────────────────────
    const { messages, lang } = await req.json() as {
      messages: { role: string; content: string }[];
      lang: string;
    };

    const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
    if (!geminiKey) return new Response(JSON.stringify({ error: 'not configured' }), { status: 503, headers: cors });

    // ── 4. System prompt ─────────────────────────────────────────────
    const caps = [
      marketPlan !== 'free' ? (lang === 'en' ? 'crypto, stocks and forex trading' : 'trading de cripto, acciones y forex') : null,
      betsPlan   !== 'free' ? (lang === 'en' ? 'sports betting strategy'           : 'estrategia de apuestas deportivas')    : null,
    ].filter(Boolean).join(lang === 'en' ? ' and ' : ' y ');

    const system = lang === 'en'
      ? `You are the Xentory assistant. You help with: ${caps}.
ALWAYS respond with valid JSON only: {"short":"1–2 sentence answer, max 55 words","detail":"2–3 extra sentences if the topic genuinely needs more context — omit this key if not needed"}
Be factual and direct. Never invent live prices, odds, or real-time signals.`
      : `Eres el asistente de Xentory. Ayudas con: ${caps}.
SIEMPRE responde solo con JSON válido: {"short":"respuesta de 1–2 frases, máx 55 palabras","detail":"2–3 frases adicionales si el tema lo requiere — omite esta clave si no hace falta"}
Sé directo y factual. Nunca inventes precios, cuotas o señales en tiempo real.`;

    // ── 5. Call Gemini ───────────────────────────────────────────────
    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 280, temperature: 0.6, responseMimeType: 'application/json' },
    };

    const gemRes = await fetch(
      `${GEMINI_BASE}/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    const gemData = await gemRes.json();
    const rawText = gemData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    let parsed: { short?: string; detail?: string } = {};
    try { parsed = JSON.parse(rawText); } catch { parsed = { short: rawText }; }

    return new Response(JSON.stringify({
      short:  parsed.short  ?? (lang === 'en' ? 'Sorry, could not process that.' : 'Lo siento, no pude procesar eso.'),
      detail: parsed.detail || undefined,
    }), { headers: { ...cors, 'content-type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
