-- ═══════════════════════════════════════════════════════════════════
-- XENTORY — TELEGRAM + ALERTS SYSTEM
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. TELEGRAM CONNECTIONS ─────────────────────────────────────────
-- Stores each user's Telegram link (chat_id) + which channel they're in

CREATE TABLE IF NOT EXISTS public.telegram_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,               -- Supabase auth.users.id
  user_email      text NOT NULL,
  platform        text NOT NULL CHECK (platform IN ('market', 'bet', 'bundle')),
  telegram_chat_id bigint NOT NULL,            -- Telegram user chat_id (private)
  telegram_username text,                      -- @username (optional)
  plan            text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','elite')),
  channel_invited text,                        -- Which channel they've been invited to
  verified        boolean NOT NULL DEFAULT false,
  verified_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tg_connections_user    ON public.telegram_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_tg_connections_chat_id ON public.telegram_connections(telegram_chat_id);

-- ── 2. VERIFICATION CODES ──────────────────────────────────────────
-- Temporary codes users send to the bot to verify their account

CREATE TABLE IF NOT EXISTS public.telegram_verify_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  user_email  text NOT NULL,
  platform    text NOT NULL CHECK (platform IN ('market', 'bet', 'bundle')),
  code        text NOT NULL UNIQUE,            -- e.g. "XMKT-A1B2C3D4"
  plan        text NOT NULL DEFAULT 'free',
  used        boolean NOT NULL DEFAULT false,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tg_codes_code    ON public.telegram_verify_codes(code);
CREATE INDEX IF NOT EXISTS idx_tg_codes_user_id ON public.telegram_verify_codes(user_id, platform);

-- ── 3. PRICE ALERTS ─────────────────────────────────────────────────
-- User-configured price alerts for Market

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  user_email      text NOT NULL,
  symbol          text NOT NULL,               -- "BTC", "ETH", "NVDA"
  asset_name      text NOT NULL,
  category        text NOT NULL CHECK (category IN ('crypto','stocks','forex')),
  condition       text NOT NULL CHECK (condition IN ('above','below')),
  target_price    numeric(20,8) NOT NULL,
  notify_channel  text NOT NULL DEFAULT 'telegram' CHECK (notify_channel IN ('telegram','email','both')),
  active          boolean NOT NULL DEFAULT true,
  triggered       boolean NOT NULL DEFAULT false,
  triggered_at    timestamptz,
  trigger_price   numeric(20,8),               -- actual price when triggered
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol  ON public.price_alerts(symbol, active, triggered);
CREATE INDEX IF NOT EXISTS idx_alerts_active  ON public.price_alerts(active, triggered);

-- ── 4. ALERT LOG ─────────────────────────────────────────────────────
-- History of all sent notifications

CREATE TABLE IF NOT EXISTS public.alert_notifications_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id     uuid REFERENCES public.price_alerts(id),
  user_id      uuid NOT NULL,
  channel      text NOT NULL,                  -- 'telegram' | 'email'
  status       text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','pending')),
  message      text,
  sent_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 5. CHANNEL SIGNALS ────────────────────────────────────────────────
-- Signals broadcast to plan-based channels (not personal alerts)

CREATE TABLE IF NOT EXISTS public.channel_signals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     text NOT NULL CHECK (platform IN ('market','bet','bundle')),
  plan_tier    text NOT NULL CHECK (plan_tier IN ('pro','elite','both')),
  asset_symbol text,                           -- NULL for bet signals
  signal_type  text NOT NULL,                  -- 'buy'|'sell'|'pick'|'analysis'
  confidence   int,
  message      text NOT NULL,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  sent_to_tg   boolean NOT NULL DEFAULT false,
  tg_message_id bigint                         -- Telegram message_id for edits
);

-- ── 6. ROW LEVEL SECURITY ─────────────────────────────────────────────
ALTER TABLE public.telegram_connections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_verify_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_signals         ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
CREATE POLICY "users_own_connections" ON public.telegram_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_codes" ON public.telegram_verify_codes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_alerts" ON public.price_alerts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_log" ON public.alert_notifications_log
  FOR SELECT USING (auth.uid() = user_id);

-- Channel signals: anyone can read (public signals)
CREATE POLICY "channel_signals_read" ON public.channel_signals
  FOR SELECT USING (true);

-- ── 7. SERVICE ROLE bypasses RLS (used by bot + edge functions) ───────
-- The bot uses SUPABASE_SERVICE_ROLE_KEY so it bypasses RLS automatically.
-- No extra config needed.

-- ── 8. HELPER FUNCTION: upsert verification code ─────────────────────
CREATE OR REPLACE FUNCTION public.upsert_verify_code(
  p_user_id    uuid,
  p_user_email text,
  p_platform   text,
  p_plan       text,
  p_code       text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Delete existing unused codes for this user+platform
  DELETE FROM public.telegram_verify_codes
  WHERE user_id = p_user_id AND platform = p_platform AND used = false;

  -- Insert new code
  INSERT INTO public.telegram_verify_codes (user_id, user_email, platform, code, plan)
  VALUES (p_user_id, p_user_email, p_platform, p_code, p_plan);

  RETURN p_code;
END;
$$;

-- ── 9. FUNCTION: get active untriggered alerts by symbol ─────────────
CREATE OR REPLACE FUNCTION public.get_alerts_for_symbol(p_symbol text)
RETURNS TABLE (
  alert_id       uuid,
  user_id        uuid,
  condition      text,
  target_price   numeric,
  notify_channel text,
  telegram_chat_id bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    pa.id,
    pa.user_id,
    pa.condition,
    pa.target_price,
    pa.notify_channel,
    tc.telegram_chat_id
  FROM public.price_alerts pa
  LEFT JOIN public.telegram_connections tc
    ON tc.user_id = pa.user_id AND tc.platform = 'market' AND tc.verified = true
  WHERE
    pa.symbol = p_symbol
    AND pa.active = true
    AND pa.triggered = false;
$$;
