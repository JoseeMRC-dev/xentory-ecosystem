/**
 * generate-video — Edge Function
 *
 * Actions:
 *   create  → Claude genera guión, Kling v3 genera vídeo
 *             (with_narration: true) → ElevenLabs genera audio, Creatomate combina
 *   check   → poll pipeline status, actualiza la fila cuando termina
 *
 * Required secrets:
 *   ANTHROPIC_API_KEY, REPLICATE_API_KEY
 *   (narración) ELEVENLABS_API_KEY, CREATOMATE_API_KEY
 *   Optional: ELEVENLABS_VOICE_ID (default: voz española multilingual)
 *   Optional: REPLICATE_MODEL     (default: kwaivgi/kling-v3-video)
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

const DEFAULT_MODEL       = 'kwaivgi/kling-v3-video';
const STORAGE_BUCKET      = 'studio-audio';
// Voz multilingual de ElevenLabs con buen español (Matilda)
const DEFAULT_VOICE_ID    = 'XrExE9yKIg1WjnnlVkGX';

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

// Normaliza la salida de Replicate: puede ser string o array
function resolveOutput(output: unknown): string | null {
  if (!output) return null;
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) return (output[0] as string) ?? null;
  return null;
}

// ── CREATE ────────────────────────────────────────────────────────
async function handleCreate(
  body: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>,
  origin: string | null,
) {
  const {
    video_type      = 'promo',
    language        = 'es',
    duration_sec    = 30,
    title,
    with_narration  = false,
    voice_id,
    user_brief,
  } = body as Record<string, unknown>;

  const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  const REPLICATE_KEY = Deno.env.get('REPLICATE_API_KEY');
  if (!ANTHROPIC_KEY) return json({ error: 'ANTHROPIC_API_KEY secret not configured' }, 500, origin);
  if (!REPLICATE_KEY) return json({ error: 'REPLICATE_API_KEY secret not configured' }, 500, origin);

  if (with_narration) {
    const EL_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const CM_KEY = Deno.env.get('CREATOMATE_API_KEY');
    if (!EL_KEY) return json({ error: 'ELEVENLABS_API_KEY secret not configured' }, 500, origin);
    if (!CM_KEY) return json({ error: 'CREATOMATE_API_KEY secret not configured' }, 500, origin);
  }

  // 1. Claude → guión + prompt visual + caption
  const prompt = buildScriptPrompt(String(video_type), String(language), Number(duration_sec), typeof user_brief === 'string' ? user_brief.trim() : '');
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

  // 2. (Narración) ElevenLabs → audio → Supabase Storage
  let audioUrl: string | null = null;
  if (with_narration) {
    const EL_KEY  = Deno.env.get('ELEVENLABS_API_KEY')!;
    const voiceId = (typeof voice_id === 'string' && voice_id) ? voice_id : (Deno.env.get('ELEVENLABS_VOICE_ID') ?? DEFAULT_VOICE_ID);

    const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text:      parsed.script,
        model_id:  'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!elRes.ok) {
      const err = await elRes.text();
      return json({ error: 'ElevenLabs error', detail: err }, 502, origin);
    }

    const audioBuffer = await elRes.arrayBuffer();

    // Crear bucket si no existe
    await supabase.storage.createBucket(STORAGE_BUCKET, { public: true }).catch(() => {});

    const audioPath = `${userId}/${Date.now()}.mp3`;
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg' });

    if (uploadErr) return json({ error: 'Audio upload failed', detail: uploadErr.message }, 500, origin);

    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(audioPath);
    audioUrl = publicUrl;
  }

  // 3. Kling v3 vía Replicate — 1080p, 9:16, duración clamped 3-15s
  const videoModel  = Deno.env.get('REPLICATE_MODEL') ?? DEFAULT_MODEL;
  const klingSecs   = Math.min(Math.max(Math.round(Number(duration_sec)), 3), 15);
  const videoRes = await fetch(`https://api.replicate.com/v1/models/${videoModel}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'wait=5',
    },
    body: JSON.stringify({
      input: {
        prompt:          parsed.visual_prompt,
        negative_prompt: 'text overlay, logo, watermark, blurry, low quality, distorted faces, deformed',
        mode:            'pro',
        aspect_ratio:    '9:16',
        duration:        klingSecs,
        generate_audio:  false,
      },
    }),
  });
  const videoData = await videoRes.json();

  if (!videoData.id) {
    console.error('Replicate error:', videoData);
    return json({ error: 'Video task creation failed', detail: JSON.stringify(videoData) }, 502, origin);
  }

  // Estado del pipeline interno
  const pipeline = with_narration
    ? { with_narration: true, stage: 'kling', audio_url: audioUrl }
    : null;

  // 4. Guardar en BD
  const { data: video, error: dbErr } = await supabase
    .from('content_videos')
    .insert({
      user_id:         userId,
      title:           title ?? `Video ${new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}`,
      video_type,
      language,
      duration_sec,
      script:          parsed.script,
      visual_prompt:   parsed.visual_prompt,
      caption:         parsed.caption,
      hashtags:        parsed.hashtags ?? [],
      runway_task_id:  videoData.id,
      status:          videoData.status === 'succeeded' ? (with_narration ? 'generating' : 'ready') : 'generating',
      video_url:       (!with_narration && videoData.status === 'succeeded') ? (resolveOutput(videoData.output)) : null,
      publish_results: pipeline ? { _pipeline: pipeline } : {},
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
  // Allow re-check if stuck as 'ready' without a video_url (edge case: Replicate returned null output)
  const isStuckReady = video.status === 'ready' && !video.video_url;
  if (video.status !== 'generating' && !isStuckReady) return json({ video }, 200, origin);
  // Treat stuck-ready as generating so the check runs
  if (isStuckReady) video.status = 'generating';

  const pipeline = video.publish_results?._pipeline as {
    with_narration: boolean; stage: string; audio_url: string; creatomate_id?: string;
  } | undefined;

  const update: Record<string, unknown> = {};

  // ── Etapa Creatomate (combinando vídeo + audio) ───────────────────
  if (pipeline?.stage === 'combining' && pipeline.creatomate_id) {
    const CM_KEY = Deno.env.get('CREATOMATE_API_KEY');
    if (!CM_KEY) return json({ error: 'CREATOMATE_API_KEY secret not configured' }, 500, origin);

    const cmRes = await fetch(`https://api.creatomate.com/v1/renders/${pipeline.creatomate_id}`, {
      headers: { 'Authorization': `Bearer ${CM_KEY}` },
    });
    const render = await cmRes.json();

    if (render.status === 'succeeded') {
      update.status    = 'ready';
      update.video_url = render.url;
      // Limpiar pipeline del publish_results
      update.publish_results = { ...video.publish_results, _pipeline: undefined };
    } else if (render.status === 'failed') {
      update.status        = 'failed';
      update.error_message = render.error ?? 'Creatomate combining failed';
    }

  // ── Etapa Kling (generando vídeo) ─────────────────────────────────
  } else {
    const predRes = await fetch(
      `https://api.replicate.com/v1/predictions/${video.runway_task_id}`,
      { headers: { 'Authorization': `Token ${REPLICATE_KEY}` } },
    );
    const pred = await predRes.json();
    console.log('Replicate poll:', pred.status, 'output:', JSON.stringify(pred.output)?.slice(0, 120));

    if (pred.status === 'succeeded') {
      const videoUrl = resolveOutput(pred.output);

      if (!videoUrl) {
        // Succeeded but no URL — likely a Replicate billing/quota issue.
        // Log and leave as 'generating' so the user can retry later.
        console.error('Replicate succeeded but output is null. Full pred:', JSON.stringify(pred).slice(0, 600));
        // No update — status stays 'generating', user can press Retry
      } else if (pipeline?.with_narration && pipeline.audio_url) {
        // Combinar vídeo + audio con Creatomate
        const CM_KEY = Deno.env.get('CREATOMATE_API_KEY');
        if (!CM_KEY) {
          update.status        = 'failed';
          update.error_message = 'CREATOMATE_API_KEY secret not configured';
        } else {
          const cmRes = await fetch('https://api.creatomate.com/v1/renders', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CM_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify([{
              output_format: 'mp4',
              width:  768,
              height: 1280,
              elements: [
                { type: 'video', source: videoUrl },
                { type: 'audio', source: pipeline.audio_url, volume: '80%' },
              ],
            }]),
          });
          const [render] = await cmRes.json();

          if (!render?.id) {
            update.status        = 'failed';
            update.error_message = 'Creatomate render creation failed';
          } else {
            update.publish_results = {
              ...video.publish_results,
              _pipeline: { ...pipeline, stage: 'combining', creatomate_id: render.id },
            };
          }
        }
      } else {
        // Sin narración — vídeo listo directamente
        update.status    = 'ready';
        update.video_url = videoUrl;
      }

    } else if (pred.status === 'failed' || pred.status === 'canceled') {
      update.status        = 'failed';
      update.error_message = pred.error ?? 'Video generation failed';
    }
  }

  if (Object.keys(update).length > 0) {
    await supabase.from('content_videos').update(update).eq('id', video_id);
    Object.assign(video, update);
  }

  return json({ video }, 200, origin);
}

// ── PROMPT BUILDER ────────────────────────────────────────────────
function buildScriptPrompt(type: string, lang: string, duration: number, brief: string): string {
  const desc: Record<string, string> = {
    promo:       'promotional video highlighting Xentory as an AI-powered financial and sports analysis platform',
    signal:      'highlight reel of a recent AI prediction success that builds trust and FOMO',
    educational: 'quick educational explainer on how Xentory\'s AI analysis works, in simple terms',
  };
  const words = Math.round(duration * 2.5);
  const isEs  = lang === 'es';

  const briefSection = brief
    ? `\n\nCREATOR DIRECTION (follow this closely — it overrides generic defaults):\n"${brief}"\n`
    : '';

  return `You are a social media video content expert for Xentory, an AI-powered SaaS platform for financial markets and sports predictions.

Create content for a ${duration}-second ${desc[type] ?? desc.promo} in ${isEs ? 'Spanish' : 'English'}.${briefSection}

Return ONLY a valid JSON object with exactly these fields:
- "script": voiceover script (${words} words max, punchy hook in first 3 seconds)
- "visual_prompt": detailed cinematic description for AI video generation — describe visuals, camera movements, color palette, mood (NO text overlays, NO logos). Focus on: glowing data charts, holographic market graphs, dynamic candlestick animations, dark premium background, emerald-green (#1B4D3E) accent lighting, cinematic depth of field. Incorporate the creator direction if provided.
- "caption": social media caption with 2-3 emojis (${isEs ? '150 chars max in Spanish' : '150 chars max in English'})
- "hashtags": array of 8 relevant hashtags WITHOUT the # symbol

Return ONLY the JSON object enclosed in \`\`\`json\`\`\` code fences. No other text.`;
}
