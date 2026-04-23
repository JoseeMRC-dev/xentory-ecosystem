-- ═══════════════════════════════════════════════════════════════════
-- 008_signals_telegram_sent — Columna para rastrear señales enviadas a Telegram
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS telegram_sent     boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telegram_sent_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_signals_telegram_pending
  ON public.signals(telegram_sent, is_active, published_at DESC)
  WHERE telegram_sent = false;
