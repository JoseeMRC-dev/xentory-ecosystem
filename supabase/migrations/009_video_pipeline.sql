-- ── 009_video_pipeline.sql ─────────────────────────────────────────
-- Tables for the AI video generation + social publishing pipeline.

-- social_accounts: connected Instagram / TikTok credentials
CREATE TABLE IF NOT EXISTS social_accounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform         text NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  account_id       text NOT NULL,
  account_name     text,
  access_token     text NOT NULL,
  token_expires_at timestamptz,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (user_id, platform)
);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own social accounts"
  ON social_accounts FOR ALL
  USING (auth.uid() = user_id);

-- content_videos: AI-generated marketing video queue
CREATE TABLE IF NOT EXISTS content_videos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text NOT NULL,
  video_type     text NOT NULL CHECK (video_type IN ('promo', 'signal', 'educational')),
  language       text NOT NULL DEFAULT 'es',
  duration_sec   int  NOT NULL DEFAULT 30,
  script         text,
  visual_prompt  text,
  caption        text,
  hashtags       text[]  DEFAULT '{}',
  video_url      text,
  thumbnail_url  text,
  runway_task_id text,
  status         text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'generating', 'ready', 'approved',
      'rejected', 'publishing', 'published', 'failed'
    )),
  platforms      text[]  DEFAULT '{}',
  publish_results jsonb  DEFAULT '{}',
  error_message  text,
  created_at     timestamptz DEFAULT now(),
  published_at   timestamptz
);

ALTER TABLE content_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own content videos"
  ON content_videos FOR ALL
  USING (auth.uid() = user_id);
