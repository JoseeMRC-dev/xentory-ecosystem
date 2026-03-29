-- ═══════════════════════════════════════════════════════════════════
-- 005_signals_blog — Tabla de señales de IA + posts del blog
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. SIGNALS — señales de IA publicadas por ambas plataformas ──────
CREATE TABLE IF NOT EXISTS public.signals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plataforma a la que pertenece la señal
  platform        text        NOT NULL DEFAULT 'both'
                              CHECK (platform IN ('market','bet','both')),

  -- Tipo de activo
  type            text        NOT NULL
                              CHECK (type IN ('crypto','forex','stock','sport')),

  -- Identificación del activo o partido
  asset           text        NOT NULL,           -- e.g. "BTC/USD", "Real Madrid vs Barça"
  asset_icon      text        NOT NULL DEFAULT '📊',

  -- Señal generada por la IA
  signal          text        NOT NULL,           -- e.g. "Compra en soporte", "Over 2.5"
  confidence      int         NOT NULL DEFAULT 65 CHECK (confidence BETWEEN 0 AND 100),

  -- Resultado verificado una vez resuelto el evento
  result          text        CHECK (result IN ('win','loss','neutral')),

  -- Timestamps
  published_at    timestamptz NOT NULL DEFAULT now(),
  match_end_time  timestamptz,                    -- Para señales sport: cuándo termina el partido
  resolved_at     timestamptz,                    -- Cuándo se registró el resultado

  -- Control
  is_active       boolean     NOT NULL DEFAULT true,

  -- Metadatos adicionales (JSON libre para análisis, odds, etc.)
  metadata        jsonb
);

-- Índices de consulta frecuente
CREATE INDEX IF NOT EXISTS idx_signals_platform    ON public.signals(platform, is_active);
CREATE INDEX IF NOT EXISTS idx_signals_published   ON public.signals(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_result      ON public.signals(result, is_active);
CREATE INDEX IF NOT EXISTS idx_signals_type        ON public.signals(type, is_active);

-- RLS: lectura pública (anon) para mostrar historial en metodología
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signals_public_read" ON public.signals
  FOR SELECT USING (is_active = true);

-- Solo service_role puede insertar/actualizar/eliminar (desde edge functions o admin)


-- ── 2. BLOG POSTS — contenido editorial dinámico ─────────────────────
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        NOT NULL UNIQUE,
  title           text        NOT NULL,
  excerpt         text        NOT NULL,
  content         text        NOT NULL DEFAULT '',
  category        text        NOT NULL
                              CHECK (category IN ('crypto','stocks','forex','sports','platform')),
  tags            text[]      NOT NULL DEFAULT '{}',
  author          text        NOT NULL DEFAULT 'Xentory IA',
  image_emoji     text        NOT NULL DEFAULT '📰',
  featured        boolean     NOT NULL DEFAULT false,
  platform        text        NOT NULL DEFAULT 'both'
                              CHECK (platform IN ('market','bet','both')),
  published_at    timestamptz NOT NULL DEFAULT now(),
  read_time       int         NOT NULL DEFAULT 3,
  is_published    boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_published  ON public.blog_posts(published_at DESC)
  WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_blog_category   ON public.blog_posts(category)
  WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_blog_featured   ON public.blog_posts(featured)
  WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_blog_slug       ON public.blog_posts(slug);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_public_read" ON public.blog_posts
  FOR SELECT USING (is_published = true);

-- Trigger updated_at automático
DROP TRIGGER IF EXISTS on_blog_updated ON public.blog_posts;
CREATE TRIGGER on_blog_updated
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();


-- ── 3. FUNCIÓN: accuracy_by_week ─────────────────────────────────────
-- Devuelve la precisión (% aciertos) semana a semana para los últimos 42 días
-- agrupado por plataforma. Útil para la página de Metodología.
CREATE OR REPLACE FUNCTION public.get_accuracy_by_week(
  p_platform text DEFAULT 'both',   -- 'market' | 'bet' | 'both' (all platforms)
  p_weeks    int  DEFAULT 6
)
RETURNS TABLE (
  week_label  text,
  week_start  date,
  correct     int,
  total       int,
  accuracy    numeric
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cutoff timestamptz := now() - (p_weeks || ' weeks')::interval;
BEGIN
  RETURN QUERY
  SELECT
    to_char(date_trunc('week', s.published_at), 'DD Mon') AS week_label,
    date_trunc('week', s.published_at)::date              AS week_start,
    COUNT(*) FILTER (WHERE s.result = 'win')::int         AS correct,
    COUNT(*) FILTER (WHERE s.result IS NOT NULL)::int     AS total,
    CASE
      WHEN COUNT(*) FILTER (WHERE s.result IS NOT NULL) = 0 THEN 0
      ELSE ROUND(
        100.0 * COUNT(*) FILTER (WHERE s.result = 'win')
              / COUNT(*) FILTER (WHERE s.result IS NOT NULL),
        1
      )
    END AS accuracy
  FROM public.signals s
  WHERE
    s.is_active   = true
    AND s.published_at >= v_cutoff
    AND (
      p_platform = 'both'
      OR s.platform = p_platform
      OR s.platform = 'both'
    )
  GROUP BY date_trunc('week', s.published_at)
  ORDER BY date_trunc('week', s.published_at) ASC;
END;
$$;


-- ── 4. FUNCIÓN: global_accuracy_stats ────────────────────────────────
-- Retorna estadísticas globales de precisión para tarjetas de stats
CREATE OR REPLACE FUNCTION public.get_global_accuracy_stats(
  p_platform text DEFAULT 'both',
  p_weeks    int  DEFAULT 6
)
RETURNS TABLE (
  total_signals   int,
  resolved        int,
  correct         int,
  accuracy_pct    numeric,
  avg_confidence  numeric
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cutoff timestamptz := now() - (p_weeks || ' weeks')::interval;
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::int                                               AS total_signals,
    COUNT(*) FILTER (WHERE s.result IS NOT NULL)::int          AS resolved,
    COUNT(*) FILTER (WHERE s.result = 'win')::int              AS correct,
    CASE
      WHEN COUNT(*) FILTER (WHERE s.result IS NOT NULL) = 0 THEN 0
      ELSE ROUND(
        100.0 * COUNT(*) FILTER (WHERE s.result = 'win')
              / COUNT(*) FILTER (WHERE s.result IS NOT NULL), 1
      )
    END                                                         AS accuracy_pct,
    ROUND(AVG(s.confidence), 1)                                AS avg_confidence
  FROM public.signals s
  WHERE
    s.is_active   = true
    AND s.published_at >= v_cutoff
    AND (
      p_platform = 'both'
      OR s.platform = p_platform
      OR s.platform = 'both'
    );
END;
$$;


-- ── 5. SEED DE BLOG POSTS (datos reales de ejemplo) ───────────────────
-- Inserta posts de ejemplo solo si la tabla está vacía
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.blog_posts) = 0 THEN
    INSERT INTO public.blog_posts (slug, title, excerpt, category, tags, author, image_emoji, featured, platform, read_time, published_at) VALUES
    (
      'bitcoin-resistencia-100k',
      'Bitcoin ante la resistencia clave de los $100.000',
      'El análisis técnico muestra una estructura alcista intacta, pero los indicadores de momentum sugieren prudencia en los niveles actuales. RSI sobrecomprado y divergencia bajista en MACD.',
      'crypto',
      ARRAY['Bitcoin', 'BTC', 'Análisis técnico', 'RSI'],
      'Xentory Market IA',
      '₿', true, 'market', 4,
      now() - interval '2 days'
    ),
    (
      'nvidia-resultados-q4-2025',
      'NVIDIA Q4 2025: resultados récord e implicaciones para el sector IA',
      'Los resultados trimestrales de NVIDIA volvieron a superar expectativas con ingresos de centros de datos al alza. Analizamos el impacto técnico y los niveles clave a vigilar.',
      'stocks',
      ARRAY['NVDA', 'Resultados', 'IA', 'Semiconductores'],
      'Xentory Market IA',
      '🟩', false, 'market', 5,
      now() - interval '4 days'
    ),
    (
      'eurusd-fed-escenarios-2025',
      'EUR/USD y la Fed: escenarios técnicos para Q2 2025',
      'La reunión de la Reserva Federal marca el próximo movimiento del par. Analizamos los niveles de soporte y resistencia clave y la probabilidad de cada escenario.',
      'forex',
      ARRAY['EUR/USD', 'Fed', 'Forex', 'Macro'],
      'Xentory Market IA',
      '💱', false, 'market', 3,
      now() - interval '6 days'
    ),
    (
      'champions-octavos-predicciones-ia',
      'Champions League: predicciones IA para los octavos de final',
      'Nuestro motor analiza los últimos 5 partidos de cada equipo participante. Estadísticas de forma, head-to-head y niveles de confianza para cada enfrentamiento.',
      'sports',
      ARRAY['Champions', 'Fútbol', 'Predicción', 'UEFA'],
      'Xentory Bet IA',
      '🏆', true, 'bet', 6,
      now() - interval '1 day'
    ),
    (
      'solana-ecosistema-q1-2025',
      'Solana en Q1 2025: análisis del ecosistema y perspectivas',
      'SOL consolida tras su rally histórico. Analizamos el estado del ecosistema, indicadores on-chain y el contexto técnico en los timeframes clave para traders.',
      'crypto',
      ARRAY['Solana', 'SOL', 'On-chain', 'DeFi'],
      'Xentory Market IA',
      '◎', false, 'market', 5,
      now() - interval '8 days'
    ),
    (
      'premier-league-predicciones-jornada',
      'Premier League: análisis estadístico de la próxima jornada',
      'Analizamos los 10 partidos de la jornada con datos de xG, forma reciente, lesiones y cuotas de mercado. Identificamos las apuestas con mejor value según la IA.',
      'sports',
      ARRAY['Premier League', 'Fútbol', 'Value Betting'],
      'Xentory Bet IA',
      '⚽', false, 'bet', 4,
      now() - interval '3 days'
    );
  END IF;
END;
$$;
