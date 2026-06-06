/**
 * generate-video — Edge Function
 *
 * Actions:
 *   create  → call Gemini for script + Runway for video, insert content_videos row
 *   check   → poll Runway task status, update row when done
 *
 * Required secrets: GEMINI_API_KEY, RUNWAY_API_KEY
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
    // ── Auth ──────────────────────────────────────────────────────
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

  const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')!;
  const RUNWAY_KEY = Deno.env.get('RUNWAY_API_KEY')!;

  // 1. Generate script + visual prompt + caption via Gemini
  const prompt = buildScriptPrompt(String(video_type), String(language), Number(duration_sec));
  const gemRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
      }),
    },
  );
  const gemData = await gemRes.json();
  const raw = gemData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let parsed: { script: string; visual_prompt: string; caption: string; hashtags: string[] };
  try {
    const m = raw.match(/```json\s*([\s\S]+?)\s*```/);
    parsed = JSON.parse(m ? m[1] : raw);
  } catch {
    return json({ error: 'Failed to parse Gemini response', raw }, 500, origin);
  }

  // 2. Start Runway video generation (async task)
  const runwayRes = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${RUNWAY_KEY}`,
      'Content-Type':   'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      promptText: parsed.visual_prompt,
      model:      'gen3a_turbo',
      duration:   10,          // 10 s max per task; Runway supports 5 or 10
      ratio:      '720:1280',  // vertical 9:16 for TikTok / Reels
    }),
  });
  const runwayData = await runwayRes.json();
  if (!runwayData.id) {
    console.error('Runway error:', runwayData);
    return json({ error: 'Runway task creation failed', detail: runwayData }, 502, origin);
  }

  // 3. Persist
  const { data: video, error: dbErr } = await supabase
    .from('content_videos')
    .insert({
      user_id:       userId,
      title:         title ?? `Video ${new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}`,
      video_type,
      language,
      duration_sec,
      script:        parsed.script,
      visual_prompt: parsed.visual_prompt,
      caption:       parsed.caption,
      hashtags:      parsed.hashtags ?? [],
      runway_task_id: runwayData.id,
      status:        'generating',
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
  const RUNWAY_KEY = Deno.env.get('RUNWAY_API_KEY')!;

  const { data: video } = await supabase
    .from('content_videos')
    .select()
    .eq('id', video_id)
    .eq('user_id', userId)
    .single();

  if (!video) return json({ error: 'Not found' }, 404, origin);
  if (video.status !== 'generating') return json({ video }, 200, origin);

  const taskRes = await fetch(
    `https://api.dev.runwayml.com/v1/tasks/${video.runway_task_id}`,
    {
      headers: {
        'Authorization':  `Bearer ${RUNWAY_KEY}`,
        'X-Runway-Version': '2024-11-06',
      },
    },
  );
  const task = await taskRes.json();

  const update: Record<string, unknown> = {};
  if (task.status === 'SUCCEEDED') {
    update.status    = 'ready';
    update.video_url = task.output?.[0] ?? null;
  } else if (task.status === 'FAILED') {
    update.status        = 'failed';
    update.error_message = task.failure ?? 'Video generation failed';
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
