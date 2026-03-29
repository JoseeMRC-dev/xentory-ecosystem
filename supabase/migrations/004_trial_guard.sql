-- ═══════════════════════════════════════════════════════════════
--  004_trial_guard — Prueba gratuita: 1 por cuenta y 1 por dispositivo
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trial_usage (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nullable: si la cuenta se elimina el registro permanece
  -- (así el device_fp sigue bloqueando nuevas cuentas del mismo dispositivo)
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  platform        text        NOT NULL CHECK (platform IN ('market','bets','bundle')),

  -- Hash SHA-256 del fingerprint del navegador/dispositivo
  device_fp       text,

  -- IP en el momento del checkout (señal de fraude, no bloqueante por sí sola)
  ip_address      inet,

  -- Referencia al Stripe Subscription para auditoría
  stripe_sub_id   text,

  started_at      timestamptz DEFAULT now()
);

-- Un trial por usuario por plataforma (ignora filas con user_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_user_platform
  ON trial_usage (user_id, platform)
  WHERE user_id IS NOT NULL;

-- Búsqueda rápida por fingerprint de dispositivo
CREATE INDEX IF NOT EXISTS idx_trial_device_fp
  ON trial_usage (device_fp, platform)
  WHERE device_fp IS NOT NULL;

-- Búsqueda por IP (señal suave, consulta manual)
CREATE INDEX IF NOT EXISTS idx_trial_ip
  ON trial_usage (ip_address, platform)
  WHERE ip_address IS NOT NULL;

-- RLS activo: los usuarios solo leen su propio historial de trial
ALTER TABLE trial_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trial_own_select" ON trial_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Solo service_role puede insertar/actualizar (desde las edge functions)
-- (sin políticas INSERT/UPDATE = bloqueado para roles no-service)
