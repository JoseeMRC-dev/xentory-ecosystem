-- ═══════════════════════════════════════════════════════════════════
-- 006_account_ip_log — Control de cuentas gratuitas por IP
-- Máx. MAX_ACCOUNTS_PER_IP cuentas por dirección IP (configurado en Edge Fn)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.account_ip_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- IP del cliente (IPv4 o IPv6)
  ip_address  text        NOT NULL,

  -- Email registrado (en minúsculas, trimmed)
  email       text        NOT NULL,

  -- Device fingerprint SHA-256 (canvas+WebGL+UA) — más granular que la IP
  device_fp   text,

  -- user_id de Supabase auth — se rellena al confirmar el email (nullable hasta entonces)
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- pending: registro iniciado pero email no confirmado aún
  -- confirmed: cuenta activa verificada
  -- flagged: marcado manualmente para revisión
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','confirmed','flagged')),

  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índice principal para la consulta de conteo por IP
CREATE INDEX IF NOT EXISTS idx_ip_log_ip        ON public.account_ip_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_log_email     ON public.account_ip_log(email);
CREATE INDEX IF NOT EXISTS idx_ip_log_device_fp ON public.account_ip_log(device_fp)
  WHERE device_fp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ip_log_user_id   ON public.account_ip_log(user_id)
  WHERE user_id IS NOT NULL;

-- RLS: solo service_role puede leer/escribir (datos internos, nunca expuestos al cliente)
ALTER TABLE public.account_ip_log ENABLE ROW LEVEL SECURITY;
-- Sin políticas = solo service_role puede acceder (por diseño)


-- ── FUNCIÓN: confirmar cuenta al verificar email ─────────────────────
-- Llamar desde stripe-webhook o desde un trigger de auth.users si se prefiere.
CREATE OR REPLACE FUNCTION public.confirm_ip_log_entry(
  p_email   text,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.account_ip_log
  SET    status  = 'confirmed',
         user_id = p_user_id
  WHERE  email   = lower(trim(p_email))
    AND  status  = 'pending'
    AND  user_id IS NULL;
END;
$$;


-- ── FUNCIÓN: contar cuentas activas por IP ───────────────────────────
-- Útil para consultas de admin/monitorización.
CREATE OR REPLACE FUNCTION public.count_accounts_by_ip(p_ip text)
RETURNS int
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COUNT(*)::int
  FROM   public.account_ip_log
  WHERE  ip_address = p_ip
    AND  status IN ('pending', 'confirmed');
$$;
