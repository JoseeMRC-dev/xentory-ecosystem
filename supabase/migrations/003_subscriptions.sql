-- ═══════════════════════════════════════════════════════════════
--  003_subscriptions — Suscripciones Stripe por usuario/plataforma
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                     uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     text,
  stripe_subscription_id text        UNIQUE,
  platform               text        NOT NULL CHECK (platform IN ('market','bets','bundle')),
  plan                   text        NOT NULL DEFAULT 'free'
                                     CHECK (plan IN ('free','pro','elite')),
  billing_interval       text        CHECK (billing_interval IN ('monthly','yearly')),
  status                 text        NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active','canceled','past_due','trialing')),
  current_period_end     timestamptz,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now(),

  -- Un registro por usuario/plataforma (upsert on conflict)
  UNIQUE (user_id, platform)
);

-- RLS: cada usuario solo ve sus propias filas
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_own_select" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_subs_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
