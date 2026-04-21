-- ═══════════════════════════════════════════════════════════════════
-- 007_user_preferences — Preferencias de usuario por plataforma
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id   uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  market    jsonb       NOT NULL DEFAULT '{"crypto":["BTC","ETH","SOL"],"forex":["EUR/USD"],"stocks":["NVDA"]}',
  bet       jsonb       NOT NULL DEFAULT '{"favoriteTeam":"","favoriteLeagues":[]}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Actualiza updated_at automáticamente en cada UPDATE
CREATE OR REPLACE FUNCTION public.touch_user_preferences()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_touch_user_preferences ON public.user_preferences;
CREATE TRIGGER trg_touch_user_preferences
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_preferences();

-- RLS: cada usuario solo puede leer y escribir su propia fila
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "owner_insert" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_update" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);
