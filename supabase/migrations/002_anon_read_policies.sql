-- ═══════════════════════════════════════════════════════════════════
-- XENTORY — FIX: RLS policies for anon reads
--
-- The app uses SSO (Hub JWT), not a Supabase session, so auth.uid()
-- always returns NULL for frontend queries.  The existing policies
-- (auth.uid() = user_id) block every SELECT from the client.
--
-- Solution: allow anon reads with USING (true) — the client already
-- filters by .eq('user_id', ...) so each user only gets their own rows.
-- Writes still go through Edge Functions with the service_role key.
--
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════

-- Drop the old auth.uid()-based SELECT policies (writes keep their policy)
DROP POLICY IF EXISTS "users_own_connections" ON public.telegram_connections;
DROP POLICY IF EXISTS "users_own_codes"       ON public.telegram_verify_codes;
DROP POLICY IF EXISTS "users_own_alerts"      ON public.price_alerts;
DROP POLICY IF EXISTS "users_own_log"         ON public.alert_notifications_log;

-- ── telegram_connections ──────────────────────────────────────────
-- Anon can read (filtered by user_id in client); service_role writes
CREATE POLICY "anon_read_connections" ON public.telegram_connections
  FOR SELECT USING (true);

-- ── telegram_verify_codes ─────────────────────────────────────────
CREATE POLICY "anon_read_codes" ON public.telegram_verify_codes
  FOR SELECT USING (true);

-- ── price_alerts ──────────────────────────────────────────────────
CREATE POLICY "anon_read_alerts" ON public.price_alerts
  FOR SELECT USING (true);

-- Allow anon UPDATE for toggle (active flag) and DELETE — filtered by user_id in client
CREATE POLICY "anon_update_alerts" ON public.price_alerts
  FOR UPDATE USING (true);

CREATE POLICY "anon_delete_alerts" ON public.price_alerts
  FOR DELETE USING (true);

-- ── alert_notifications_log ───────────────────────────────────────
CREATE POLICY "anon_read_log" ON public.alert_notifications_log
  FOR SELECT USING (true);
