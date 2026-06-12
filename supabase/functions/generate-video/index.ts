/**
 * generate-video — Edge Function
 *
 * Actions:
 *   create  → Claude genera el guión, Kling (Replicate) genera el vídeo
 *   check   → poll Replicate prediction status, actualiza la fila cuando termina
 *
 * Required secrets: ANTHROPIC_API_KEY, REPLICATE_API_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const ALLOWED_ORIGINS = [
  'https://xentory.com',
  'https://hub.xentory.com',
  'https://market.xentory.com',
  'https://bet.xentory.com',
  'https://x-eight-beryl.vercel.app',
  'https://xentory-ecosystem-market.vercel.app',
  'https://xentory-ecosystem-bet.vercel.app',
];

// Kling 1.6 Pro model on Replicate
const KLING_MODEL = 'kwaivgi/kling-v1-6-pro';

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });

  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'Unauthorized' }, 401, origin);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401, origin);

    const body = await req.json();
    const { action } = body;

    if (action === 'create') return await handleCreate(body, user.id, supabase, origin);
    if (action === 'check')  return await handleCheck(body, user.id, supabase, origin);
    return json({ error: 'Invalid action' }, 400, origin);

  } catch (err) {
    console.error('generate-video:', err);
    return json({ error: 'Internal error' }, 500, origin);
  }
});

// ── CREATE ────────────────────────────────────────────────────────
async function handleCreate(
  body: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  origin: string | null,
) {
  const {
    video_type   = 'promo',
    language     = 'es',
    duration_sec = 30,
    title,
  } = body as Record<string, string | number>;

  const ANTHROPIC_KEY  = Deno.env.get('ANTHROPIC_API_KEY');
  const REPLICATE_KEY  = Deno.env.get('REPLICATE_API_KEY');
  if (!ANTHROPIC_KEY)  return json({ error: 'ANTHROPIC_API_KEY secret not configured' }, 500, origin);
  if (!REPLICATE_KEY)  return json({ error: 'REPLICATE_API_KEY secret not configured' }, 500, origin);

  // 1. Generar guión + prompt visual + caption con Claude
  const prompt = buildScriptPrompt(String(video_type), String(language), Number(duration_sec));
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });
  const claudeData = await claudeRes.json();

  if (claudeData.error) {
    console.error('Claude API error:', JSON.stringify(claudeData.error));
    return json({ error: 'Claude API error', detail: claudeData.error?.message ?? claudeData.error }, 502, origin);
  }

  const raw = claudeData.content?.[0]?.text ?? '';
  if (!raw) {
    console.error('Claude empty response:', JSON.stringify(claudeData));
    return json({ error: 'Claude returned empty response', detail: claudeData }, 502, origin);
  }

  let parsed: { script: string; visual_prompt: string; caption: string; hashtags: string[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
      parsed = JSON.parse(fenced ? fenced[1] : raw);
    } catch {
      const braces = raw.match(/\{[\s\S]+\}/);
      if (!braces) return json({ error: 'Failed to parse Claude response', raw }, 500, origin);
      parsed = JSON.parse(braces[0]);
    }
  }

  // 2. Generar vídeo con Kling 1.6 Pro vía Replicate
  const klingRes = await fetch(`https://api.replicate.com/v1/models/${KLING_MODEL}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'wait=5',
    },
    body: JSON.stringify({
      input: {
        prompt:       parsed.visual_prompt,
        aspect_ratio: '9:16',
        duration:     5,
        cfg_scale:    0.5,
      },
    }),
  });
  const klingData = await klingRes.json();

  if (!klingData.id) {
    console.error('Kling/Replicate error:', klingData);
    return json({ error: 'Kling task creation failed', detail: JSON.stringify(klingData) }, 502, origin);
  }

  // 3. Guardar en BD (reutilizamos runway_task_id para el prediction ID de Replicate)
  const { data: video, error: dbErr } = await supabase
    .from('content_videos')
    .insert({
      user_id:        userId,
      title:          title ?? `Video ${new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}`,
      video_type,
      language,
      duration_sec,
      script:         parsed.script,
      visual_prompt:  parsed.visual_prompt,
      caption:        parsed.caption,
      hashtags:       parsed.hashtags ?? [],
      runway_task_id: klingData.id,
      status:         klingData.status === 'succeeded' ? 'ready' : 'generating',
      video_url:      klingData.output?.[0] ?? null,
    })
    .select()
    .single();

  if (dbErr) throw dbErr;
  return json({ video }, 200, origin);
}

// ── CHECK ─────────────────────────────────────────────────────────
async function handleCheck(
  body: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  origin: string | null,
) {
  const { video_id } = body as { video_id: string };
  const REPLICATE_KEY = Deno.env.get('REPLICATE_API_KEY');
  if (!REPLICATE_KEY) return json({ error: 'REPLICATE_API_KEY secret not configured' }, 500, origin);

  const { data: video } = await supabase
    .from('content_videos')
    .select()
    .eq('id', video_id)
    .eq('user_id', userId)
    .single();

  if (!video) return json({ error: 'Not found' }, 404, origin);
  if (video.status !== 'generating') return json({ video }, 200, origin);

  const predRes = await fetch(
    `https://api.replicate.com/v1/predictions/${video.runway_task_id}`,
    { headers: { 'Authorization': `Token ${REPLICATE_KEY}` } },
  );
  const pred = await predRes.json();

  const update: Record<string, unknown> = {};
  if (pred.status === 'succeeded') {
    update.status    = 'ready';
    update.video_url = pred.output?.[0] ?? null;
  } else if (pred.status === 'failed' || pred.status === 'canceled') {
    update.status        = 'failed';
    update.error_message = pred.error ?? 'Video generation failed';
  }

  if (Object.keys(update).length > 0) {
    await supabase.from('content_videos').update(update).eq('id', video_id);
    Object.assign(video, update);
  }

  return json({ video }, 200, origin);
}

// ── PROMPT BUILDER ────────────────────────────────────────────────
function buildScriptPrompt(type: string, lang: string, duration: number): string {
  const desc: Record<string, string> = {
    promo:       'promotional video highlighting Xentory as an AI-powered financial and sports analysis platform',
    signal:      'highlight reel of a recent AI prediction success that builds trust and FOMO',
    educational: 'quick educational explainer on how Xentory\'s AI analysis works, in simple terms',
  };
  const words = Math.round(duration * 2.5);
  const isEs  = lang === 'es';

  return `You are a social media video content expert for Xentory, an AI-powered SaaS platform for financial markets and sports predictions.

Create content for a ${duration}-second ${desc[type] ?? desc.promo} in ${isEs ? 'Spanish' : 'English'}.

Return ONLY a valid JSON object with exactly these fields:
- "script": voiceover script (${words} words max, punchy hook in first 3 seconds)
- "visual_prompt": detailed cinematic description for AI video generation — describe visuals, camera movements, color palette, mood (NO text overlays, NO logos). Focus on: glowing data charts, holographic market graphs, dynamic candlestick animations, dark premium background, emerald-green (#1B4D3E) accent lighting, cinematic depth of field
- "caption": social media caption with 2-3 emojis (${isEs ? '150 chars max in Spanish' : '150 chars max in English'})
- "hashtags": array of 8 relevant hashtags WITHOUT the # symbol

Return ONLY the JSON object enclosed in \`\`\`json\`\`\` code fences. No other text.`;
}
