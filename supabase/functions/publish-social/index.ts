/**
 * publish-social — Edge Function
 *
 * Publishes an approved content_video to Instagram (Reels) and/or TikTok.
 *
 * Instagram flow:
 *   1. POST /{ig_user_id}/media  (create container)
 *   2. Poll container status until FINISHED (up to 90 s)
 *   3. POST /{ig_user_id}/media_publish
 *
 * TikTok flow:
 *   1. POST /v2/post/publish/video/init/  with source PULL_FROM_URL
 *      (TikTok fetches the video directly from Runway CDN)
 *
 * The video must have status = 'approved' and a non-null video_url.
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
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'Unauthorized' }, 401, origin);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401, origin);

    const { video_id, platforms } = await req.json() as {
      video_id:  string;
      platforms: string[];
    };

    // Load video
    const { data: video } = await supabase
      .from('content_videos')
      .select()
      .eq('id', video_id)
      .eq('user_id', user.id)
      .single();

    if (!video)           return json({ error: 'Video not found' }, 404, origin);
    if (!video.video_url) return json({ error: 'Video URL not ready' }, 400, origin);
    if (video.status !== 'approved') {
      return json({ error: 'Video must be approved before publishing' }, 400, origin);
    }

    const platformList: string[] = platforms?.length ? platforms : (video.platforms ?? []);
    if (!platformList.length) return json({ error: 'No platforms specified' }, 400, origin);

    await supabase.from('content_videos').update({ status: 'publishing' }).eq('id', video_id);

    const results: Record<string, { success: boolean; error?: string; [k: string]: unknown }> = {};

    for (const platform of platformList) {
      const { data: account } = await supabase
        .from('social_accounts')
        .select()
        .eq('user_id', user.id)
        .eq('platform', platform)
        .single();

      if (!account) {
        results[platform] = { success: false, error: 'No account connected' };
        continue;
      }

      try {
        if (platform === 'instagram') results[platform] = await publishInstagram(video, account);
        else if (platform === 'tiktok') results[platform] = await publishTikTok(video, account);
        else results[platform] = { success: false, error: 'Unknown platform' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results[platform] = { success: false, error: msg };
        console.error(`publish-social [${platform}]:`, msg);
      }
    }

    const allOk = Object.values(results).every(r => r.success);
    await supabase.from('content_videos').update({
      status:          allOk ? 'published' : 'failed',
      publish_results: results,
      platforms:       platformList,
      published_at:    allOk ? new Date().toISOString() : null,
    }).eq('id', video_id);

    return json({ results }, 200, origin);

  } catch (err) {
    console.error('publish-social:', err);
    return json({ error: 'Internal error' }, 500, origin);
  }
});

// ── INSTAGRAM ─────────────────────────────────────────────────────
async function publishInstagram(
  video:   Record<string, unknown>,
  account: Record<string, string>,
) {
  const caption = buildCaption(video);

  // 1. Create Reels container
  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${account.account_id}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type:    'REELS',
        video_url:     video.video_url,
        caption,
        share_to_feed: true,
        access_token:  account.access_token,
      }),
    },
  );
  const container = await containerRes.json() as { id?: string; error?: { message?: string } };
  if (!container.id) throw new Error(container.error?.message ?? 'Container creation failed');

  // 2. Poll until FINISHED (up to 90 s)
  let mediaStatus = '';
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 5_000));
    const statusRes = await fetch(
      `https://graph.facebook.com/v21.0/${container.id}?fields=status_code&access_token=${account.access_token}`,
    );
    const s = await statusRes.json() as { status_code?: string };
    mediaStatus = s.status_code ?? '';
    if (mediaStatus === 'FINISHED') break;
    if (mediaStatus === 'ERROR')    throw new Error('Media container processing failed');
  }
  if (mediaStatus !== 'FINISHED') throw new Error('Media container timed out — retry publish later');

  // 3. Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${account.account_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: account.access_token }),
    },
  );
  const published = await publishRes.json() as { id?: string; error?: { message?: string } };
  if (!published.id) throw new Error(published.error?.message ?? 'Publish failed');

  return { success: true, post_id: published.id, platform: 'instagram' };
}

// ── TIKTOK ────────────────────────────────────────────────────────
async function publishTikTok(
  video:   Record<string, unknown>,
  account: Record<string, string>,
) {
  const caption = buildCaption(video);

  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${account.access_token}`,
      'Content-Type':  'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title:                    caption.slice(0, 150),
        privacy_level:            'SELF_ONLY', // user can change in TikTok app
        disable_duet:             false,
        disable_comment:          false,
        disable_stitch:           false,
        video_cover_timestamp_ms: 1_000,
      },
      source_info: {
        source:    'PULL_FROM_URL',
        video_url: video.video_url,
      },
    }),
  });
  const initData = await initRes.json() as {
    error?:  { code?: string; message?: string };
    data?:   { publish_id?: string };
  };

  if (initData.error?.code && initData.error.code !== 'ok') {
    throw new Error(initData.error.message ?? 'TikTok init failed');
  }
  const publishId = initData.data?.publish_id;
  if (!publishId) throw new Error('No publish_id returned from TikTok');

  return { success: true, publish_id: publishId, platform: 'tiktok' };
}

// ── HELPERS ───────────────────────────────────────────────────────
function buildCaption(video: Record<string, unknown>): string {
  const tags = (video.hashtags as string[] ?? []).map(h => `#${h}`).join(' ');
  return `${video.caption ?? ''}\n\n${tags}`.trim();
}
